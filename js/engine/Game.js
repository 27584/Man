/**
 * Game 游戏引擎核心类
 * 管理场景切换、渲染循环、时间管理等
 */
class GameEngine {
    constructor() {
        this.scenes = {};
        this.currentScene = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.running = false;
        this.deltaTime = 0;
        
        // 游戏状态
        this.state = {
            paused: false,
            score: 0,
            level: 1
        };
        
        // 事件回调
        this.onSceneChangeCallbacks = [];
    }

    /**
     * 初始化引擎
     */
    init() {
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // 添加到页面
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.appendChild(this.renderer.domElement);
        } else {
            document.body.appendChild(this.renderer.domElement);
        }
        
        // 窗口大小变化监听
        window.addEventListener('resize', () => this.onResize());
        
        console.log('GameEngine initialized');
    }

    /**
     * 注册场景
     * @param {string} name - 场景名称
     * @param {Scene} scene - 场景实例
     */
    registerScene(name, scene) {
        this.scenes[name] = scene;
    }

    /**
     * 切换场景
     * @param {string} name - 场景名称
     */
    changeScene(name) {
        if (!this.scenes[name]) {
            console.warn(`Scene ${name} not found`);
            return;
        }

        // 销毁当前场景
        if (this.currentScene) {
            this.currentScene.destroy();
        }

        // 切换到新场景
        this.currentScene = this.scenes[name];
        this.currentScene.init();
        this.currentScene.activate();

        // 触发回调
        this.onSceneChangeCallbacks.forEach(cb => cb(name, this.currentScene));

        console.log(`Changed to scene: ${name}`);
    }

    /**
     * 获取当前场景
     * @returns {Scene|null}
     */
    getCurrentScene() {
        return this.currentScene;
    }

    /**
     * 注册场景切换回调
     * @param {Function} callback
     */
    onSceneChange(callback) {
        this.onSceneChangeCallbacks.push(callback);
    }

    /**
     * 启动游戏循环
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.clock.start();
        this.gameLoop();
    }

    /**
     * 停止游戏循环
     */
    stop() {
        this.running = false;
        this.clock.stop();
    }

    /**
     * 暂停游戏
     */
    pause() {
        this.state.paused = true;
    }

    /**
     * 继续游戏
     */
    resume() {
        this.state.paused = false;
    }

    /**
     * 游戏主循环
     */
    gameLoop() {
        if (!this.running) return;

        requestAnimationFrame(() => this.gameLoop());

        this.deltaTime = Math.min(this.clock.getDelta(), 0.1);

        if (!this.state.paused && this.currentScene) {
            this.currentScene.update(this.deltaTime);
            this.currentScene.render();
        }
    }

    /**
     * 窗口大小变化处理
     */
    onResize() {
        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
        if (this.currentScene) {
            this.currentScene.onResize();
        }
    }

    /**
     * 销毁引擎
     */
    destroy() {
        this.stop();
        
        // 销毁所有场景
        Object.values(this.scenes).forEach(scene => scene.destroy());
        this.scenes = {};
        this.currentScene = null;
        
        // 销毁渲染器
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        
        this.onSceneChangeCallbacks = [];
    }
}

/**
 * EntityFactory - 实体工厂
 * 用于快速创建预定义的实体
 */
class EntityFactory {
    constructor(scene) {
        this.scene = scene;
        this.templates = {};
    }

    /**
     * 注册实体模板
     * @param {string} name - 模板名称
     * @param {Function} createFn - 创建函数
     */
    registerTemplate(name, createFn) {
        this.templates[name] = createFn;
    }

    /**
     * 创建实体
     * @param {string} templateName - 模板名称
     * @param {Object} options - 配置选项
     * @returns {Entity|null}
     */
    create(templateName, options = {}) {
        if (!this.templates[templateName]) {
            console.warn(`Template ${templateName} not found`);
            return null;
        }

        const entity = this.scene.createEntity(options.name || templateName);
        this.templates[templateName](entity, options);
        return entity;
    }

    /**
     * 创建玩家实体
     * @param {Object} options
     * @returns {Entity}
     */
    createPlayer(options = {}) {
        const entity = this.scene.createEntity(options.name || 'Player');
        
        entity.addTag('player');
        
        // 变换组件
        const transform = entity.createComponent(TransformComponent);
        transform.setPosition(
            options.x || 0,
            options.y || 0.8,
            options.z || 0
        );
        
        // 物理组件
        const physics = entity.createComponent(PhysicsComponent);
        physics.gravity = options.gravity || 15;
        physics.groundY = options.groundY || 0.8;
        
        // 输入组件
        entity.createComponent(InputComponent);
        
        // 碰撞组件
        entity.createComponent(ColliderComponent, 'box', {
            width: 1,
            height: 1.5,
            depth: 1
        });
        
        return entity;
    }

    /**
     * 创建障碍物实体
     * @param {Object} options
     * @returns {Entity}
     */
    createObstacle(options = {}) {
        const entity = this.scene.createEntity(options.name || 'Obstacle');
        
        entity.addTag('obstacle');
        entity.addTag(options.type || 'low');
        
        const transform = entity.createComponent(TransformComponent);
        transform.setPosition(
            options.x || 0,
            options.y || 1,
            options.z || 0
        );
        
        entity.createComponent(ColliderComponent, 'box', {
            width: options.width || 1.8,
            height: options.height || 0.6,
            depth: options.depth || 1.8
        });
        
        return entity;
    }

    /**
     * 创建金币实体
     * @param {Object} options
     * @returns {Entity}
     */
    createCoin(options = {}) {
        const entity = this.scene.createEntity(options.name || 'Coin');
        
        entity.addTag('coin');
        entity.addTag(options.isHigh ? 'high' : 'low');
        
        const transform = entity.createComponent(TransformComponent);
        transform.setPosition(
            options.x || 0,
            options.y || 2,
            options.z || 0
        );
        
        entity.createComponent(ColliderComponent, 'box', {
            width: 1,
            height: 1,
            depth: 2
        });
        
        return entity;
    }
}

// 导出
window.GameEngine = GameEngine;
window.EntityFactory = EntityFactory;