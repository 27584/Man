import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class Chaser {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.animationMixer = null;
        this.animations = {};
        
        this.distance = 10;
        this.speed = 12;
        this.mode = 'medium';
        this.modeTimer = 0;
        this.modeInterval = 5000;
        
        this.TRACK_WIDTH = 2.5;
    }
    
    load() {
        const loader = new GLTFLoader();
        loader.load('assets/models/doubao.glb', (gltf) => {
            this.model = gltf.scene;
            
            if (this.scene.cgManager) {
                this.scene.cgManager.chaser = this.model;
            }
            
            this.model.position.set(0, 0.8, -15);
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
                action.setLoop(THREE.LoopRepeat);
                this.animations[clip.name] = action;
            });
            
            if (this.animations['o_sprint']) {
                this.animations['o_sprint'].play();
            } else if (this.animations['o_run']) {
                this.animations['o_run'].play();
            } else if (this.animations[Object.keys(this.animations)[0]]) {
                this.animations[Object.keys(this.animations)[0]].play();
            }
            
            if (this.scene.cgManager) {
                this.scene.cgManager.checkCGStart();
            }
            
            if (this.onLoadCallback) {
                this.onLoadCallback();
            }
        });
    }
    
    update(deltaTime, gameSpeed, playerZ, targetTrack, isGameOver) {
        playerZ = this.scene.player.model.position.z;
        if (!this.model ) return;
        
        const modeMultipliers = {
            'high': 1.1,
            'medium': 1.0,
            'low': 0.9
        };
        
        this.speed = gameSpeed * modeMultipliers[this.mode];
         if (this.distance < 4) {this.speed = 0}
        const moveDistance = this.speed * deltaTime;
        this.model.position.z += moveDistance;
        
        this.distance = -this.model.position.z + playerZ;
        
        if (this.distance < 6) {
            this.mode = 'medium';
        } else if (this.distance > 16) {
            this.distance = 16;
            this.model.position.z = playerZ - 16;
            this.mode = 'high';
        }
        
        this.modeTimer += deltaTime * 1000;
        if (this.modeTimer >= this.modeInterval) {
            this.modeTimer = 0;
            
            if (this.distance > 8.5) {
                this.mode = Math.random() < 0.5 ? 'high' : 'medium';
            } else if (this.distance < 8.5) {
                this.mode = Math.random() < 0.5 ? 'low' : 'medium';
            }
        }
        
        const playerTrackX = (targetTrack - 1) * this.TRACK_WIDTH;
        this.model.position.x += (playerTrackX - this.model.position.x) * deltaTime * 2;
        
        this.model.position.y = 0.8;
        
        if (this.animationMixer && this.animations['o_sprint']) {
            const minSpeed = 12;
            const maxSpeed = 25;
            const minAnimSpeed = 1.0;
            const maxAnimSpeed = 2.0;
            
            const speedFactor = Math.min(1, Math.max(0, (gameSpeed - minSpeed) / (maxSpeed - minSpeed)));
            const animSpeed = minAnimSpeed + (maxAnimSpeed - minAnimSpeed) * speedFactor;
            
            this.animations['o_sprint'].playbackRate = animSpeed;
        }
        
        this.animationMixer.update(deltaTime);
    }
    
    updateCG(deltaTime, playerPos) {
        if (!this.model || !this.animationMixer || !playerPos) return;
        
        const cgSpeed = 15;
        this.model.position.z += cgSpeed * deltaTime * 1.1;
        
        const distance = playerPos.z - this.model.position.z;
        if (distance < 6) {
            this.model.position.z = playerPos.z - 8;
        } else if (distance > 12) {
            this.model.position.z = playerPos.z - 10;
        }
        
        this.animationMixer.update(deltaTime);
    }
    
    reset() {
        if (this.model) {
            this.model.position.set(0, 0.8, -10);
        }
        this.distance = 10;
        this.speed = 12;
        this.mode = 'medium';
        this.modeTimer = 0;
    }
    
    playAttackAnimation() {
        if (this.animations['o_attack_1']) {
            this.animations['o_attack_1'].reset();
            this.animations['o_attack_1'].play();
        }
    }
}

export default Chaser;