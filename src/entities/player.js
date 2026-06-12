import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

class Player {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.animationMixer = null;
        this.animations = {};
        
        this.isCrossing = false;
        this.isSliding = false;
        this.isSprinting = false;
        
        this.crossJumpElapsed = 0;
        this.crossJumpDuration = 0.8;
        this.crossJumpHeight = 3.0;
        this.landingGraceTimer = 0;
        this.LANDING_GRACE = 0.05;
        
        this.sprintCooldown = 0;
        this.sprintDuration = 0;
        this.sprintSpeedBoost = 0;
        this.SPRINT_COOLDOWN_TIME = 0.75;
        this.SPRINT_DURATION_TIME = 0.2;
        this.SPRINT_SPEED_MULTIPLIER = 2.5;
        
        this.TRACK_WIDTH = 2.5;
        this.targetTrack = 1;
        
        this.onLoadCallback = null;
    }
    
    setOnLoadCallback(callback) {
        this.onLoadCallback = callback;
    }
    
    setTargetTrack(track) {
        this.targetTrack = track;
    }
    
    load() {
        const loader = new GLTFLoader();
        loader.load('assets/models/kobe.glb', (gltf) => {
            this.model = gltf.scene;
            
            if (this.scene.cgManager) {
                this.scene.cgManager.player = this.model;
            }
            
            this.model.position.set(0, 0.8, 0);
            this.model.scale.set(1.5, 1.5, 1.5);
            
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.scene.scene.add(this.model);
            
            this.animationMixer = new THREE.AnimationMixer(this.model);
            
            gltf.animations.forEach((clip) => {
                const action = this.animationMixer.clipAction(clip);
                action.clampWhenFinished = true;
                
                if (clip.name === 'sprint') {
                    action.setLoop(THREE.LoopRepeat);
                } else {
                    action.setLoop(THREE.LoopOnce);
                }
                
                this.animations[clip.name] = action;
            });
            
            if (this.animations['sprint']) {
                this.animations['sprint'].play();
            }
            
            if (this.scene.cgManager) {
                this.scene.cgManager.checkCGStart();
            }
            
            if (this.onLoadCallback) {
                this.onLoadCallback();
            }
        });
    }
    
    tryCross() {
        if (this.isCrossing || !this.animations || !this.model) return;
        
        if (this.animations['cross']) {
            if (this.isSliding) {
                this.isSliding = false;
                if (this.animations['sliding_tackle']) {
                    this.animations['sliding_tackle'].stop();
                }
            } else {
                if (this.animations['sprint']) this.animations['sprint'].stop();
            }
            
            this.isCrossing = true;
            this.crossJumpElapsed = 0;
            this.model.position.y = 0.8;
            
            this.animations['cross'].stop();
            this.animations['cross'].reset();
            this.animations['cross'].play();
        }
    }
    
    startSliding() {
        if (this.isSliding || !this.animations) return;
        
        if (this.isCrossing) {
            this.isCrossing = false;
            this.crossJumpElapsed = 0;
            if (this.model) {
                this.model.position.y = 0.3;
            }
            if (this.animations['cross']) {
                this.animations['cross'].stop();
            }
        }
        
        this.isSliding = true;
        if (this.animations['sprint']) this.animations['sprint'].stop();
        this.animations['sliding_tackle'].stop();
        this.animations['sliding_tackle'].reset();
        this.animations['sliding_tackle'].play();
    }
    
    stopSliding() {
        if (!this.isSliding) return;
        
        this.isSliding = false;
        if (this.model && !this.isCrossing) {
            this.model.position.y = 0.8;
        }
        if (this.animations && this.animations['sprint']) {
            this.animations['sprint'].reset();
            this.animations['sprint'].play();
        }
    }
    
    startSprint(gameSpeed) {
        if (this.isSprinting || this.isSliding) return;
        
        this.isSprinting = true;
        this.sprintDuration = this.SPRINT_DURATION_TIME;
        this.sprintCooldown = this.SPRINT_COOLDOWN_TIME;
        this.sprintSpeedBoost = gameSpeed * this.SPRINT_SPEED_MULTIPLIER;
        
        if (this.animations && this.animations['sprint']) {
            this.animations['sprint'].playbackRate = 3.0;
        }
    }
    
    updateSprintAnimationSpeed(gameSpeed) {
        if (!this.animations || !this.animations['sprint']) return;
        
        const baseSpeed = 1.0;
        const maxSpeed = 2.0;
        const minSpeed = 12;
        const maxSpeedValue = 25;
        
        const speedFactor = Math.min(1, Math.max(0, (gameSpeed - minSpeed) / (maxSpeedValue - minSpeed)));
        const animationSpeed = baseSpeed + (maxSpeed - baseSpeed) * speedFactor;
        
        this.animations['sprint'].playbackRate = animationSpeed;
    }
    
    updateSprint(deltaTime, gameSpeed) {
        if (!this.isSprinting) {
            if (this.sprintCooldown > 0) {
                this.sprintCooldown -= deltaTime;
            }
            return 0;
        }
        
        this.sprintDuration -= deltaTime;
        
        const boostDistance = this.sprintSpeedBoost * deltaTime;
        
        if (this.sprintDuration <= 0) {
            this.isSprinting = false;
            if (this.animations && this.animations['sprint']) {
                this.updateSprintAnimationSpeed(gameSpeed);
            }
        }
        
        return boostDistance;
    }
    
    update(deltaTime, gameSpeed, playerZ, isGameOver) {
        if (!this.model) return { position: null, boostDistance: 0 };
        
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
        
        const boostDistance = this.updateSprint(deltaTime, gameSpeed);
        
        if (isGameOver) return { position: this.model.position, boostDistance };
        
        // 更新位置
        const targetX = (this.targetTrack - 1) * this.TRACK_WIDTH;
        this.model.position.x += (targetX - this.model.position.x) * 12 * deltaTime;
        this.model.position.z = playerZ + boostDistance;
        
        // 跳跃逻辑
        if (this.landingGraceTimer > 0) {
            this.landingGraceTimer -= deltaTime;
        }
        
        if (this.isCrossing) {
            this.crossJumpElapsed += deltaTime;
            const progress = Math.min(this.crossJumpElapsed / this.crossJumpDuration, 1.0);
            const jumpY = Math.sin(progress * Math.PI) * this.crossJumpHeight;
            this.model.position.y = 0.8 + jumpY;
            
            if (progress >= 1.0) {
                this.isCrossing = false;
                this.crossJumpElapsed = 0;
                this.landingGraceTimer = this.LANDING_GRACE;
                this.model.position.y = 0.8;
                if (this.animations['cross']) this.animations['cross'].stop();
                if (this.animations && this.animations['sprint']) {
                    this.animations['sprint'].reset();
                    this.animations['sprint'].play();
                }
            }
        } else if (this.isSliding) {
            this.model.position.y = 0.3;
            const action = this.animations['sliding_tackle'];
            if (action && action.time >= action.getClip().duration - 0.001) {
                this.stopSliding();
            }
        } else {
            this.model.position.y = 0.8;
        }
        
        this.updateSprintAnimationSpeed(gameSpeed);
        
        return { position: this.model.position, boostDistance };
    }
    
    updateCG(deltaTime) {
        if (!this.model) return;
        
        const cgSpeed = 15;
        this.model.position.z += cgSpeed * deltaTime;
        
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
    }
    
    reset() {
        if (this.model) {
            this.model.position.set(0, 0.8, 0);
        }
        this.isCrossing = false;
        this.isSliding = false;
        this.isSprinting = false;
        this.crossJumpElapsed = 0;
        this.sprintCooldown = 0;
        this.sprintDuration = 0;
        this.landingGraceTimer = 0;
    }
    
    playGameOverAnimation() {
        if (this.animations) {
            if (this.animations['sprint']) this.animations['sprint'].stop();
            if (this.animations['cross']) this.animations['cross'].stop();
            if (this.animations['sliding_tackle']) this.animations['sliding_tackle'].stop();
            
            if (this.animations['over']) {
                const overAction = this.animations['over'];
                overAction.reset();
                overAction.setLoop(THREE.LoopOnce);
                overAction.clampWhenFinished = true;
                overAction.play();
                
            }
        }
    }
}

export default Player;