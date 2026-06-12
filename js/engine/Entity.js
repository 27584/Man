/**
 * Entity 实体类
 * 实体是游戏对象的抽象，包含多个组件
 */
class Entity {
    constructor(scene, name = 'Entity') {
        this.scene = scene;
        this.name = name;
        this.id = Entity.generateId();
        this.components = [];
        this.active = true;
        this.tags = [];
    }

    /**
     * 生成唯一ID
     */
    static generateId() {
        return 'entity_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 添加组件
     * @param {Component} component - 组件实例
     * @returns {Component} 返回添加的组件
     */
    addComponent(component) {
        if (this.hasComponent(component.constructor)) {
            console.warn(`Entity ${this.name} already has component ${component.constructor.name}`);
            return this.getComponent(component.constructor);
        }

        this.components.push(component);
        component.init();
        return component;
    }

    /**
     * 创建并添加组件
     * @param {Function} componentClass - 组件类
     * @param {...any} args - 组件构造参数
     * @returns {Component} 返回创建的组件
     */
    createComponent(componentClass, ...args) {
        const component = new componentClass(this, ...args);
        return this.addComponent(component);
    }

    /**
     * 获取组件
     * @param {Function} componentClass - 组件类
     * @returns {Component|null}
     */
    getComponent(componentClass) {
        return this.components.find(c => c instanceof componentClass);
    }

    /**
     * 检查是否有组件
     * @param {Function} componentClass - 组件类
     * @returns {boolean}
     */
    hasComponent(componentClass) {
        return this.components.some(c => c instanceof componentClass);
    }

    /**
     * 移除组件
     * @param {Function} componentClass - 组件类
     */
    removeComponent(componentClass) {
        const component = this.getComponent(componentClass);
        if (component) {
            component.destroy();
            this.components = this.components.filter(c => c !== component);
        }
    }

    /**
     * 获取所有组件
     * @returns {Component[]}
     */
    getAllComponents() {
        return this.components;
    }

    /**
     * 添加标签
     * @param {string} tag
     */
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }

    /**
     * 移除标签
     * @param {string} tag
     */
    removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
    }

    /**
     * 检查是否有标签
     * @param {string} tag
     * @returns {boolean}
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /**
     * 激活实体
     */
    activate() {
        this.active = true;
        this.components.forEach(c => c.enable());
    }

    /**
     * 禁用实体
     */
    deactivate() {
        this.active = false;
        this.components.forEach(c => c.disable());
    }

    /**
     * 更新实体（更新所有启用的组件）
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (!this.active) return;

        this.components.forEach(component => {
            if (component.enabled) {
                component.update(deltaTime);
            }
        });
    }

    /**
     * 销毁实体
     */
    destroy() {
        this.components.forEach(c => c.destroy());
        this.components = [];
        this.active = false;
        this.scene = null;
    }

    /**
     * 获取变换组件（便捷方法）
     * @returns {TransformComponent|null}
     */
    get transform() {
        return this.getComponent(TransformComponent);
    }

    /**
     * 获取渲染组件（便捷方法）
     * @returns {RenderComponent|null}
     */
    get render() {
        return this.getComponent(RenderComponent);
    }

    /**
     * 获取物理组件（便捷方法）
     * @returns {PhysicsComponent|null}
     */
    get physics() {
        return this.getComponent(PhysicsComponent);
    }

    /**
     * 获取动画组件（便捷方法）
     * @returns {AnimationComponent|null}
     */
    get animation() {
        return this.getComponent(AnimationComponent);
    }

    /**
     * 获取碰撞组件（便捷方法）
     * @returns {ColliderComponent|null}
     */
    get collider() {
        return this.getComponent(ColliderComponent);
    }
}

// 导出
window.Entity = Entity;