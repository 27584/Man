import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
/**
 * MainScene中的Portal
 */
class Portal {
    constructor(scene, position, onEnter) {
        this.scene = scene;
        this.position = position;
        this.onEnter = onEnter;
        this.mesh = null;
        this.textSprite = null;
        this.isActive = true;
        
        this.createPortal();
    }
    
    createPortal() {
        const geometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.position.y + 1.5, this.position.z);
        this.scene.add(this.mesh);
        
        const ringGeometry = new THREE.RingGeometry(1.6, 2, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(this.position.x, this.position.y + 3, this.position.z);
        this.scene.add(ring);
        
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#ffff00');
        gradient.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = gradient;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RUN!', canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.textSprite = new THREE.Sprite(spriteMaterial);
        this.textSprite.position.set(this.position.x, this.position.y + 4.5, this.position.z);
        this.textSprite.scale.set(4, 1, 1);
        this.scene.add(this.textSprite);
        
        this.animationTime = 0;
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.animationTime += deltaTime;
        this.mesh.rotation.y += deltaTime * 2;
        
        const scale = 1 + Math.sin(this.animationTime * 3) * 0.1;
        this.mesh.scale.set(scale, scale, scale);
        
        const opacity = 0.6 + Math.sin(this.animationTime * 5) * 0.2;
        this.mesh.material.opacity = opacity;
    }
    
    checkCollision(playerPosition) {
        if (!this.isActive) return false;
        
        const distance = playerPosition.distanceTo(new THREE.Vector3(this.position.x, playerPosition.y, this.position.z));
        return distance < 2;
    }
    
    activate() {
        this.isActive = true;
        this.mesh.visible = true;
        this.textSprite.visible = true;
    }
    
    deactivate() {
        this.isActive = false;
        this.mesh.visible = false;
        this.textSprite.visible = false;
    }
    
    destroy() {
        this.scene.remove(this.mesh);
        this.scene.remove(this.textSprite);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

export default Portal;