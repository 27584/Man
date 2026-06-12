/**
 * Scene 场景类
 * 场景管理器，管理所有实体和系统
 */
class Scene {
    constructor(game) {
        this.game = game;
        this.entities = [];
        this.systems = [];
        this.threeScene = new THREE.Scene();
        this.camera = null;
        this.active = true;
        this.name = 'Scene';
        
        // 实体分组（按标签）
        this.entityGroups = {};
        
        // 待添加/移除的实体队列
        this.pendingAdd = [];
        this.pendingRemove = [];
    }

    /**
     * 初始化场景
     */
    init() {
        this.setupCamera();
        this.setupLighting();
    }

    /**
     * 设置相机（子类重写）
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, -10);
    }

    /**
     * 设置光照（子类重写）
     */
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.threeScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.threeScene.add(directionalLight);
    }

    /**
     * 创建实体
     * @param {string} name - 实体名称
     * @returns {Entity}
     */
    createEntity(name = 'Entity') {
        const entity = new Entity(this, name);
        this.pendingAdd.push(entity);
        return entity;
    }

    /**
     * 添加实体
     * @param {Entity} entity
     */
    addEntity(entity) {
        if (!this.entities.includes(entity)) {
            this.pendingAdd.push(entity);
        }
    }

    /**
     * 移除实体
     * @param {Entity} entity
     */
    removeEntity(entity) {
        if (this.entities.includes(entity)) {
            this.pendingRemove.push(entity);
        }
    }

    /**
     * 通过ID获取实体
     * @param {string} id
     * @returns {Entity|null}
     */
    getEntityById(id) {
        return this.entities.find(e => e.id === id);
    }

    /**
     * 通过名称获取实体
     * @param {string} name
     * @returns {Entity|null}
     */
    getEntityByName(name) {
        return this.entities.find(e => e.name === name);
    }

    /**
     * 通过标签获取实体列表
     * @param {string} tag
     * @returns {Entity[]}
     */
    getEntitiesByTag(tag) {
        return this.entities.filter(e => e.hasTag(tag));
    }

    /**
     * 获取所有实体
     * @returns {Entity[]}
     */
    getAllEntities() {
        return this.entities;
    }

    /**
     * 获取所有启用的实体
     * @returns {Entity[]}
     */
    getActiveEntities() {
        return this.entities.filter(e => e.active);
    }

    /**
     * 获取具有特定组件的实体
     * @param {Function} componentClass
     * @returns {Entity[]}
     */
    getEntitiesWithComponent(componentClass) {
        return this.entities.filter(e => e.hasComponent(componentClass));
    }

    /**
     * 添加系统
     * @param {System} system
     */
    addSystem(system) {
        this.systems.push(system);
        system.init(this);
    }

    /**
     * 移除系统
     * @param {System} system
     */
    removeSystem(system) {
        const index = this.systems.indexOf(system);
        if (index !== -1) {
            system.destroy();
            this.systems.splice(index, 1);
        }
    }

    /**
     * 处理待添加/移除的实体
     */
    processPendingEntities() {
        // 添加新实体
        while (this.pendingAdd.length > 0) {
            const entity = this.pendingAdd.shift();
            this.entities.push(entity);
            
            // 更新实体分组
            entity.tags.forEach(tag => {
                if (!this.entityGroups[tag]) {
                    this.entityGroups[tag] = [];
                }
                this.entityGroups[tag].push(entity);
            });
        }

        // 移除实体
        while (this.pendingRemove.length > 0) {
            const entity = this.pendingRemove.shift();
            const index = this.entities.indexOf(entity);
            if (index !== -1) {
                this.entities.splice(index, 1);
                
                // 更新实体分组
                entity.tags.forEach(tag => {
                    if (this.entityGroups[tag]) {
                        const groupIndex = this.entityGroups[tag].indexOf(entity);
                        if (groupIndex !== -1) {
                            this.entityGroups[tag].splice(groupIndex, 1);
                        }
                    }
                });
                
                entity.destroy();
            }
        }
    }

    /**
     * 更新场景
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (!this.active) return;

        // 处理待添加/移除的实体
        this.processPendingEntities();

        // 更新系统
        this.systems.forEach(system => {
            if (system.enabled) {
                system.update(deltaTime);
            }
        });

        // 更新实体
        this.entities.forEach(entity => {
            if (entity.active) {
                entity.update(deltaTime);
            }
        });
    }

    /**
     * 渲染场景
     */
    render() {
        if (!this.camera || !this.game.renderer) return;
        this.game.renderer.render(this.threeScene, this.camera);
    }

    /**
     * 窗口大小改变
     */
    onResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }

    /**
     * 激活场景
     */
    activate() {
        this.active = true;
    }

    /**
     * 禁用场景
     */
    deactivate() {
        this.active = false;
    }

    /**
     * 销毁场景
     */
    destroy() {
        // 销毁所有实体
        this.entities.forEach(e => e.destroy());
        this.entities = [];
        this.entityGroups = {};
        
        // 销毁所有系统
        this.systems.forEach(s => s.destroy());
        this.systems = [];
        
        // 清理 Three.js 场景
        while (this.threeScene.children.length > 0) {
            const obj = this.threeScene.children[0];
            this.threeScene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        }
        
        this.active = false;
    }

    /**
     * 向 Three.js 场景添加对象
     * @param {THREE.Object3D} object
     */
    add(object) {
        this.threeScene.add(object);
    }

    /**
     * 从 Three.js 场景移除对象
     * @param {THREE.Object3D} object
     */
    remove(object) {
        this.threeScene.remove(object);
    }

    /**
     * 设置背景
     * @param {THREE.Color|THREE.Texture} background
     */
    setBackground(background) {
        this.threeScene.background = background;
    }
}

/**
 * System 系统基类
 * 系统负责处理特定类型的逻辑
 */
class System {
    constructor() {
        this.scene = null;
        this.enabled = true;
        this.priority = 0;
    }

    /**
     * 系统初始化
     * @param {Scene} scene
     */
    init(scene) {
        this.scene = scene;
    }

    /**
     * 系统更新
     * @param {number} deltaTime
     */
    update(deltaTime) {}

    /**
     * 系统销毁
     */
    destroy() {
        this.scene = null;
        this.enabled = false;
    }

    /**
     * 获取场景中具有特定组件的实体
     * @param {Function} componentClass
     * @returns {Entity[]}
     */
    getEntitiesWithComponent(componentClass) {
        return this.scene ? this.scene.getEntitiesWithComponent(componentClass) : [];
    }
}

/**
 * RenderSystem - 渲染系统
 */
class RenderSystem extends System {
    constructor() {
        super();
        this.priority = 100;
    }

    update(deltaTime) {
        const entities = this.getEntitiesWithComponent(RenderComponent);
        entities.forEach(entity => {
            const renderComp = entity.getComponent(RenderComponent);
            if (renderComp && renderComp.enabled) {
                renderComp.update(deltaTime);
            }
        });
    }
}

/**
 * PhysicsSystem - 物理系统
 */
class PhysicsSystem extends System {
    constructor() {
        super();
        this.priority = 50;
    }

    update(deltaTime) {
        const entities = this.getEntitiesWithComponent(PhysicsComponent);
        entities.forEach(entity => {
            const physicsComp = entity.getComponent(PhysicsComponent);
            if (physicsComp && physicsComp.enabled) {
                physicsComp.update(deltaTime);
            }
        });
    }
}

/**
 * AnimationSystem - 动画系统
 */
class AnimationSystem extends System {
    constructor() {
        super();
        this.priority = 60;
    }

    update(deltaTime) {
        const entities = this.getEntitiesWithComponent(AnimationComponent);
        entities.forEach(entity => {
            const animComp = entity.getComponent(AnimationComponent);
            if (animComp && animComp.enabled) {
                animComp.update(deltaTime);
            }
        });
    }
}

/**
 * CollisionSystem - 碰撞系统
 */
class CollisionSystem extends System {
    constructor() {
        super();
        this.priority = 40;
        this.collisionCallbacks = [];
    }

    /**
     * 注册碰撞回调
     * @param {Function} callback - 回调函数 (entityA, entityB) => void
     */
    onCollision(callback) {
        this.collisionCallbacks.push(callback);
    }

    update(deltaTime) {
        const entities = this.getEntitiesWithComponent(ColliderComponent);
        
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entityA = entities[i];
                const entityB = entities[j];
                
                const colliderA = entityA.getComponent(ColliderComponent);
                const colliderB = entityB.getComponent(ColliderComponent);
                
                if (colliderA.checkCollision(colliderB)) {
                    this.collisionCallbacks.forEach(cb => cb(entityA, entityB));
                }
            }
        }
    }
}

// 导出
window.Scene = Scene;
window.System = System;
window.RenderSystem = RenderSystem;
window.PhysicsSystem = PhysicsSystem;
window.AnimationSystem = AnimationSystem;
window.CollisionSystem = CollisionSystem;