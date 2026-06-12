import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import Utils from './utils.js';
/**
 * MainScene中的玩家
 */
class Player {
    static GROUND_Y = 0;
    static COMBO_TIMEOUT = 1000;
    static MAX_COMBO = 3;
    static ATTACK_COOLDOWN = 500;
    static ATTACK_CANCEL_START = 300;
    static ATTACK_CANCEL_END = 300;

    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.animationMixer = null;
        this.animations = {};
        this.currentAnimationName = 'idle';
        this.clock = new THREE.Clock();
        this.camera = null;

        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isGrounded = false;
        this.isSprinting = false;
        this.isLoaded = false;
        this.isAttacking = false;

        this.comboCount = 0;
        this.lastAttackTime = 0;
        
        this.attackStartTime = 0;
        this.attackDuration = 0;

        this.keys = {};
        this.setupInputListeners();
    }

    setCamera(camera) {
        this.camera = camera;
    }

    setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && this.isGrounded) {
                e.preventDefault();
                if (this.isAttacking && this.canCancelAttack()) {
                    this.cancelAttack();
                }
                this.velocity.y = 12;
                this.isGrounded = false;
                this.setAnimation('jump');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.isGrounded) {
                this.performAttack();
            }
        });
    }

    load() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            
            loader.load(
                'assets/models/kobe.glb',
                (gltf) => {
                    this.mesh = gltf.scene;
                    this.mesh.position.set(0, Player.GROUND_Y, 0);
                    this.mesh.scale.set(2, 2, 2);
                    this.mesh.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.scene.add(this.mesh);

                    this.animationMixer = new THREE.AnimationMixer(this.mesh);
                    gltf.animations.forEach((clip) => {
                        const action = this.animationMixer.clipAction(clip);
                        if (clip.name.startsWith('attack')) {
                            action.setLoop(THREE.LoopOnce, 1);
                            action.timeScale = 2;
                        } else {
                            action.setLoop(THREE.LoopRepeat, Infinity);
                            action.timeScale = 1;
                        }
                        action.clampWhenFinished = true;
                        this.animations[clip.name] = action;
                    });

                    const self = this;
                    this.animationMixer.addEventListener('finished', function(e) {
                        const actionName = e.action.getClip().name;
                        if (actionName.startsWith('attack') && self.currentAnimationName === actionName) {
                            self.isAttacking = false;
                            if (self.isGrounded) {
                                self.setAnimation('idle');
                            }
                        }
                    });

                    if (this.animations['idle']) {
                        this.animations['idle'].play();
                    }

                    this.isLoaded = true;
                    resolve();
                },
                undefined,
                (error) => {
                    console.error('Error loading model:', error);
                    reject(error);
                }
            );
        });
    }

    setAnimation(name) {
        if (!this.animationMixer || !this.animations[name]) return;
        if (this.currentAnimationName === name) return;

        const currentAction = this.animations[this.currentAnimationName];
        const nextAction = this.animations[name];

        if (currentAction) {
            nextAction.reset();
            nextAction.play();
            currentAction.crossFadeTo(nextAction, 0.2);
        } else {
            nextAction.reset();
            nextAction.play();
        }

        this.currentAnimationName = name;
    }

    performAttack() {
        const now = Date.now();
        
        if (now - this.lastAttackTime < Player.ATTACK_COOLDOWN) {
            return;
        }
        
        if (now - this.lastAttackTime > Player.COMBO_TIMEOUT) {
            this.comboCount = 1;
        } else {
            this.comboCount = Math.min(this.comboCount + 1, Player.MAX_COMBO);
        }
        
        const currentCombo = this.comboCount;
        this.lastAttackTime = now;
        this.isAttacking = true;
        
        const attackAnim = `attack_${currentCombo}`;
        if (this.animations[attackAnim]) {
            if (this.animations[this.currentAnimationName]) {
                this.animations[this.currentAnimationName].stop();
            }
            
            this.animations[attackAnim].reset();
            this.animations[attackAnim].play();
            this.currentAnimationName = attackAnim;
            
            this.attackStartTime = now;
            this.attackDuration = this.animations[attackAnim].getClip().duration * 1000 / 2;
            
            if (currentCombo >= Player.MAX_COMBO) {
                this.comboCount = 0;
            }
        } else {
            this.isAttacking = false;
        }
    }

    canCancelAttack() {
        if (!this.isAttacking) return true;
        
        const elapsed = Date.now() - this.attackStartTime;
        const cancelableStart = elapsed < Player.ATTACK_CANCEL_START;
        const cancelableEnd = elapsed > this.attackDuration - Player.ATTACK_CANCEL_END;
        
        return cancelableStart || cancelableEnd;
    }
    
    cancelAttack() {
        if (!this.isAttacking) return;
        
        this.isAttacking = false;
        if (this.isGrounded) {
            this.setAnimation('idle');
        }
    }

    update(deltaTime) {
        if (!this.isLoaded || !this.mesh) return;

        this.animationMixer.update(this.clock.getDelta());
        
        if (this.camera) {
            this.handleMovement(deltaTime);
        }
    }

    handleMovement(deltaTime) {
        if (!this.camera || !this.camera.isLocked()) return;
        
        const hasMoveInput = this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'];
        
        if (this.isAttacking) {
            if (!this.canCancelAttack()) return;
            if (!hasMoveInput) return;
            this.cancelAttack();
        }

        const cameraAngleX = this.camera.getAngleX();
        const moveSpeed = this.isSprinting ? 12 : 6;
        const gravity = 25;

        const move = { x: 0, z: 0 };
        if (this.keys['KeyW']) move.z -= 1;
        if (this.keys['KeyS']) move.z += 1;
        if (this.keys['KeyA']) move.x -= 1;
        if (this.keys['KeyD']) move.x += 1;

        this.isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];

        if (move.x !== 0 || move.z !== 0) {
            const direction = new THREE.Vector3(move.x, 0, move.z);
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleX);
            direction.normalize();

            this.velocity.x = direction.x * moveSpeed;
            this.velocity.z = direction.z * moveSpeed;

            const targetRotation = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = Utils.lerpAngle(this.mesh.rotation.y, targetRotation, 0.1);

            if (this.isGrounded && !this.isAttacking) {
                this.setAnimation(this.isSprinting ? 'sprint' : 'run');
            }
        } else {
            this.velocity.x = Utils.lerp(this.velocity.x, 0, 0.1);
            this.velocity.z = Utils.lerp(this.velocity.z, 0, 0.1);

            if (this.isGrounded && !this.isAttacking) {
                this.setAnimation('idle');
            }
        }

        if (!this.isGrounded && !this.isAttacking) {
            this.setAnimation('jump');
        }

        this.velocity.y -= gravity * deltaTime;

        const newPosition = this.mesh.position.clone();
        newPosition.x += this.velocity.x * deltaTime;
        newPosition.y += this.velocity.y * deltaTime;
        newPosition.z += this.velocity.z * deltaTime;

        if (newPosition.y <= Player.GROUND_Y) {
            newPosition.y = Player.GROUND_Y;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        if (Math.abs(newPosition.x) > 49) {
            newPosition.x = Utils.clamp(newPosition.x, -49, 49);
            this.velocity.x = 0;
        }
        if (Math.abs(newPosition.z) > 49) {
            newPosition.z = Utils.clamp(newPosition.z, -49, 49);
            this.velocity.z = 0;
        }

        this.mesh.position.copy(newPosition);
    }

    getPosition() {
        return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        this.animationMixer = null;
        this.isLoaded = false;
    }
}

export default Player;