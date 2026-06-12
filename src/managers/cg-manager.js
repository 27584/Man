import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

class CGManager {
    constructor(scene) {
        this.scene = scene;
        
        this.isPlayingCG = true;
        this.isTransitioning = false;
        this.CG_DURATION = 4000;
        this.CG_START_TIME = 0;
        
        this.transitionStartTime = 0;
        this.transitionDuration = 1000;
        this.transitionStartCamPos = null;
        this.transitionStartPlayerPos = null;
        this.transitionEndCamPos = new THREE.Vector3(0, 5, -8);
        this.transitionEndPlayerPos = new THREE.Vector3(0, 0.8, 0);
        
        this.cameraOffset = new THREE.Vector3(0, 8, -15);
        this.targetCameraOffset = new THREE.Vector3(0, 8, -15);
        
        this.audioContext = null;
        this.currentAudio = null;
        this.cgAudioTimer = 0;
        this.cgAudioPlayed = [];
    }

    checkCGStart() {
        if (this.scene.player && this.scene.chaser && !this.CG_START_TIME) {
            this.CG_START_TIME = performance.now();
            this.initAudio();
        }
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    playAudio(url, loop = false) {
        if (!this.audioContext) return;
        
        if (this.currentAudio) {
            this.currentAudio.stop();
            this.currentAudio = null;
        }
        
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => this.audioContext.decodeAudioData(buffer))
            .then(audioBuffer => {
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.loop = loop;
                
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0.5;
                
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                source.start(0);
                this.currentAudio = source;
                
                source.onended = () => {
                    if (this.currentAudio === source) {
                        this.currentAudio = null;
                    }
                };
            })
            .catch(error => {
                console.warn('Failed to play audio:', error);
            });
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    updateCGCamera(deltaTime) {
        if (!this.scene.player || !this.scene.player.model || !this.scene.chaser || !this.scene.chaser.model) return;
        
        const elapsed = performance.now() - this.CG_START_TIME;
        const progress = elapsed / this.CG_DURATION;
        
        const playerPos = this.scene.player.model.position;
        const chaserPos = this.scene.chaser.model.position;
        
        const midPoint = new THREE.Vector3(
            (playerPos.x + chaserPos.x) / 2,
            (playerPos.y + chaserPos.y) / 2,
            (playerPos.z + chaserPos.z) / 2
        );
        
        let phase1End = 0.6;
        let phase2End = 0.2;
        let phase3End = 0.2;
        
        let lookAtFront = false;
        
        if (progress < phase1End) {
            const t = progress / phase1End;
            const easeT = this.easeInOutCubic(t);
            
            const angle = t * Math.PI;
            const radius = 5;
            
            this.targetCameraOffset.x = Math.sin(angle) * radius;
            this.targetCameraOffset.y = 3 + easeT * 2;
            this.targetCameraOffset.z = Math.cos(angle) * radius;
            
            lookAtFront = true;
        } else if (progress < phase2End) {
            const t = (progress - phase1End) / (phase2End - phase1End);
            const easeT = this.easeInOutCubic(t);
            
            const startX = 0;
            const startY = 10;
            const startZ = -10;
            const endX = 2;
            const endY = 6;
            const endZ = -8;
            
            this.targetCameraOffset.x = startX + (endX - startX) * easeT;
            this.targetCameraOffset.y = startY + (endY - startY) * easeT;
            this.targetCameraOffset.z = startZ + (endZ - startZ) * easeT;
        } else if (progress < phase3End) {
            this.targetCameraOffset.x = 2;
            this.targetCameraOffset.y = 5;
            this.targetCameraOffset.z = -8;
        } else {
            const t = (progress - phase3End) / (1 - phase3End);
            const easeT = this.easeInOutCubic(t);
            
            const endX = 0;
            const endY = 5;
            const endZ = -8;
            
            this.targetCameraOffset.x = this.targetCameraOffset.x + (endX - this.targetCameraOffset.x) * easeT;
            this.targetCameraOffset.y = this.targetCameraOffset.y + (endY - this.targetCameraOffset.y) * easeT;
            this.targetCameraOffset.z = this.targetCameraOffset.z + (endZ - this.targetCameraOffset.z) * easeT;
        }
        
        this.cameraOffset.lerp(this.targetCameraOffset, deltaTime * 5);
        
        const finalCamPos = new THREE.Vector3(
            midPoint.x + this.cameraOffset.x,
            midPoint.y + this.cameraOffset.y,
            midPoint.z + this.cameraOffset.z
        );
        
        this.scene.camera.position.lerp(finalCamPos, deltaTime * 8);
 
        
        const lookAtPoint = new THREE.Vector3();
        if (lookAtFront) {
            lookAtPoint.x = playerPos.x;
            lookAtPoint.y = playerPos.y + 1.5;
            lookAtPoint.z = playerPos.z - 12;
        } else {
            lookAtPoint.x = midPoint.x + (playerPos.x - midPoint.x) * 0.3;
            lookAtPoint.y = midPoint.y + 1;
            lookAtPoint.z = midPoint.z + 8;
        }
        this.scene.camera.lookAt(lookAtPoint);
    }

    updateCG(deltaTime) {
        if (!this.CG_START_TIME) return;
        
        const elapsed = performance.now() - this.CG_START_TIME;
        
        if (elapsed >= this.CG_DURATION) {
            this.isPlayingCG = false;
            if (this.scene.endCG) {
                this.scene.endCG();
            }
            return;
        }
        
        this.updateCGCamera(deltaTime);
        
        this.cgAudioTimer += deltaTime;
        if (this.cgAudioTimer >= 1.0 && this.cgAudioPlayed.length === 0) {
            this.playAudio('assets/audio/man.mp3');
            this.cgAudioPlayed.push('man');
            this.cgAudioTimer = 0;
        } else if (this.cgAudioTimer >= 1.0 && this.cgAudioPlayed.length === 1) {
            this.playAudio('assets/audio/what-can-i-say.mp3');
            this.cgAudioPlayed.push('what');
            this.cgAudioTimer = 0;
        }
    }

    endCG(playAudioCallback) {
        this.isPlayingCG = false;
        this.isTransitioning = true;
        this.transitionStartTime = performance.now();
        
        this.transitionStartCamPos = this.scene.camera.position.clone();
        if (this.scene.player && this.scene.player.model) {
            this.transitionStartPlayerPos = this.scene.player.model.position.clone();
        } else {
            this.transitionStartPlayerPos = new THREE.Vector3(0, 0.8, 0);
        }
        
        if (this.scene.chaser && this.scene.chaser.model) {
            this.scene.chaser.model.position.set(0, 0.8, -10);
        }
        
        if (playAudioCallback) {
            playAudioCallback('assets/audio/seeyouagain.mp3', true);
        }
    }

    updateTransition(deltaTime) {
        if (!this.isTransitioning) return false;
        
        const elapsed = performance.now() - this.transitionStartTime;
        const progress = Math.min(elapsed / this.transitionDuration, 1);
        const easeT = this.easeInOutCubic(progress);
        
        this.scene.camera.position.lerpVectors(this.transitionStartCamPos, this.transitionEndCamPos, easeT);
        
        if (this.scene.player && this.scene.player.model) {
            this.scene.player.model.position.x = this.transitionStartPlayerPos.x + (this.transitionEndPlayerPos.x - this.transitionStartPlayerPos.x) * easeT;
            this.scene.player.model.position.z = this.transitionEndPlayerPos.z;
            
            const lookAtY = 2;
            this.scene.camera.lookAt(this.scene.player.model.position.x, lookAtY, this.scene.player.model.position.z + 10);
        }
        
        if (progress >= 1) {
            this.isTransitioning = false;
            if (this.scene.onTransitionComplete) {
                this.scene.onTransitionComplete();
            }
            return true;
        }
        
        return false;
    }

    isPlaying() {
        return this.isPlayingCG || this.isTransitioning;
    }

    reset() {
        this.isPlayingCG = true;
        this.CG_START_TIME = 0;
        this.cgAudioTimer = 0;
        this.cgAudioPlayed = [];
        this.cameraOffset = new THREE.Vector3(0, 8, -15);
        this.targetCameraOffset = new THREE.Vector3(0, 8, -15);
        
        if (this.currentAudio) {
            this.currentAudio.stop();
            this.currentAudio = null;
        }
    }

    stop() {
        this.isPlayingCG = false;
        if (this.currentAudio) {
            this.currentAudio.stop();
            this.currentAudio = null;
        }
    }
}

export default CGManager;