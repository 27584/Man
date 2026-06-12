/**
 * Component 基类

 */
class Component {
    constructor(entity) {
        this.entity = entity;
        this.enabled = true;
        this.type = this.constructor.name;
    }

    /**
     * 组件初始化，在添加到实体时调用
     */
    init() {}

    /**
     * 每帧更新
     * @param {number} deltaTime - 时间增量
     */
    update(deltaTime) {}

    /**
     * 组件销毁
     */
    destroy() {
        this.entity = null;
        this.enabled = false;
    }

    /**
     * 启用组件
     */
    enable() {
        this.enabled = true;
    }

    /**
     * 禁用组件
     */
    disable() {
        this.enabled = false;
    }
}

/**
 * TransformComponent - 变换组件
 * 处理位置、旋转、缩放
 */
class TransformComponent extends Component {
    constructor(entity) {
        super(entity);
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = { x: 1, y: 1, z: 1 };
    }

    setPosition(x, y, z) {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
    }

    setRotation(x, y, z) {
        this.rotation.x = x;
        this.rotation.y = y;
        this.rotation.z = z;
    }

    setScale(x, y, z) {
        this.scale.x = x;
        this.scale.y = y;
        this.scale.z = z;
    }

    /**
     * 应用变换到 Three.js 对象
     * @param {THREE.Object3D} object
     */
    applyToObject3D(object) {
        object.position.set(this.position.x, this.position.y, this.position.z);
        object.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        object.scale.set(this.scale.x, this.scale.y, this.scale.z);
    }
}

/**
 * RenderComponent - 渲染组件
 * 处理 Three.js 模型渲染
 */
class RenderComponent extends Component {
    constructor(entity, model) {
        super(entity);
        this.model = model;
        this.visible = true;
    }

    init() {
        if (this.model && this.entity.scene) {
            this.entity.scene.add(this.model);
        }
    }

    update(deltaTime) {
        if (!this.enabled || !this.model) return;
        
        const transform = this.entity.getComponent(TransformComponent);
        if (transform) {
            transform.applyToObject3D(this.model);
        }
    }

    setVisible(visible) {
        this.visible = visible;
        if (this.model) {
            this.model.visible = visible;
        }
    }

    destroy() {
        if (this.model && this.entity.scene) {
            this.entity.scene.remove(this.model);
        }
        super.destroy();
    }
}

/**
 * AnimationComponent - 动画组件
 * 处理模型动画
 */
class AnimationComponent extends Component {
    constructor(entity) {
        super(entity);
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
    }

    init() {
        const renderComp = this.entity.getComponent(RenderComponent);
        if (renderComp && renderComp.model) {
            this.mixer = new THREE.AnimationMixer(renderComp.model);
        }
    }

    /**
     * 添加动画
     * @param {string} name - 动画名称
     * @param {THREE.AnimationClip} clip - 动画剪辑
     */
    addAnimation(name, clip) {
        if (!this.mixer) return;
        const action = this.mixer.clipAction(clip);
        action.clampWhenFinished = true;
        this.animations[name] = action;
    }

    /**
     * 播放动画
     * @param {string} name - 动画名称
     * @param {boolean} loop - 是否循环
     */
    play(name, loop = false) {
        if (!this.animations[name]) return;
        
        if (this.currentAction) {
            this.currentAction.stop();
        }
        
        this.currentAction = this.animations[name];
        this.currentAction.reset();
        this.currentAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
        this.currentAction.play();
    }

    /**
     * 停止当前动画
     */
    stop() {
        if (this.currentAction) {
            this.currentAction.stop();
            this.currentAction = null;
        }
    }

    update(deltaTime) {
        if (!this.enabled || !this.mixer) return;
        this.mixer.update(deltaTime);
    }

    destroy() {
        this.stop();
        this.mixer = null;
        this.animations = {};
        super.destroy();
    }
}

/**
 * PhysicsComponent - 物理组件
 * 处理速度、重力等物理属性
 */
class PhysicsComponent extends Component {
    constructor(entity) {
        super(entity);
        this.velocity = { x: 0, y: 0, z: 0 };
        this.gravity = 0;
        this.isGrounded = true;
        this.groundY = 0;
    }

    setVelocity(x, y, z) {
        this.velocity.x = x;
        this.velocity.y = y;
        this.velocity.z = z;
    }

    applyGravity(deltaTime) {
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * deltaTime;
        }
    }

    update(deltaTime) {
        if (!this.enabled) return;
        
        const transform = this.entity.getComponent(TransformComponent);
        if (!transform) return;

        this.applyGravity(deltaTime);

        transform.position.x += this.velocity.x * deltaTime;
        transform.position.y += this.velocity.y * deltaTime;
        transform.position.z += this.velocity.z * deltaTime;

        // 地面检测
        if (transform.position.y <= this.groundY) {
            transform.position.y = this.groundY;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
    }
}

/**
 * InputComponent - 输入组件
 * 处理键盘输入状态
 */
class InputComponent extends Component {
    constructor(entity) {
        super(entity);
        this.keys = {};
        this._onKeyDown = null;
        this._onKeyUp = null;
    }

    init() {
        this._onKeyDown = (e) => {
            this.keys[e.code] = true;
        };
        this._onKeyUp = (e) => {
            this.keys[e.code] = false;
        };
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    isKeyPressed(code) {
        return this.keys[code] === true;
    }

    destroy() {
        if (this._onKeyDown) {
            window.removeEventListener('keydown', this._onKeyDown);
        }
        if (this._onKeyUp) {
            window.removeEventListener('keyup', this._onKeyUp);
        }
        this.keys = {};
        super.destroy();
    }
}

/**
 * ColliderComponent - 碰撞组件
 * 处理碰撞检测
 */
class ColliderComponent extends Component {
    constructor(entity, type = 'box', size = { width: 1, height: 1, depth: 1 }) {
        super(entity);
        this.type = type;
        this.size = size;
        this.isTrigger = false;
    }

    /**
     * 检测与另一个碰撞体的碰撞
     * @param {ColliderComponent} other
     * @returns {boolean}
     */
    checkCollision(other) {
        if (!this.enabled || !other.enabled) return false;

        const transformA = this.entity.getComponent(TransformComponent);
        const transformB = other.entity.getComponent(TransformComponent);

        if (!transformA || !transformB) return false;

        if (this.type === 'box' && other.type === 'box') {
            return this.boxCollision(transformA, this.size, transformB, other.size);
        }

        return false;
    }

    boxCollision(posA, sizeA, posB, sizeB) {
        const dx = Math.abs(posA.position.x - posB.position.x);
        const dy = Math.abs(posA.position.y - posB.position.y);
        const dz = Math.abs(posA.position.z - posB.position.z);

        return dx < (sizeA.width + sizeB.width) / 2 &&
               dy < (sizeA.height + sizeB.height) / 2 &&
               dz < (sizeA.depth + sizeB.depth) / 2;
    }
}

/**
 * AudioComponent - 音频组件
 * 处理音频播放
 */
class AudioComponent extends Component {
    constructor(entity) {
        super(entity);
        this.audioContext = null;
        this.currentSource = null;
        this.gainNode = null;
        this.volume = 0.5;
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.volume;
            this.gainNode.connect(this.audioContext.destination);
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    /**
     * 播放音频
     * @param {string} url - 音频文件路径
     * @param {boolean} loop - 是否循环
     */
    play(url, loop = false) {
        if (!this.audioContext) return;

        this.stop();

        fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => this.audioContext.decodeAudioData(buffer))
            .then(audioBuffer => {
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.loop = loop;
                source.connect(this.gainNode);
                source.start(0);
                this.currentSource = source;
            })
            .catch(error => console.warn('Failed to play audio:', error));
    }

    stop() {
        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
        }
    }

    setVolume(volume) {
        this.volume = volume;
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    destroy() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
        }
        super.destroy();
    }
}

// 导出所有组件
window.Component = Component;
window.TransformComponent = TransformComponent;
window.RenderComponent = RenderComponent;
window.AnimationComponent = AnimationComponent;
window.PhysicsComponent = PhysicsComponent;
window.InputComponent = InputComponent;
window.ColliderComponent = ColliderComponent;
window.AudioComponent = AudioComponent;