import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

class CoinGenerator {
    constructor(scene) {
        this.scene = scene;
        this.coins = [];
        
        this.NUM_TRACKS = 3;
        this.TRACK_WIDTH = 2.5;
    }

    createCoin(xPos, zPos, isHigh = false) {
        const group = new THREE.Group();
        const scale = 0.6;
        
        const coinGeo = new THREE.CylinderGeometry(0.5 * scale, 0.5 * scale, 0.2 * scale, 16);
        
        const coinMat = new THREE.MeshStandardMaterial({ 
            color: 0xffdd00, 
            emissive: 0xaaaa00, 
            roughness: 0.1,
            metalness: 0.9
        });
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.rotation.x = Math.PI / 2;
        
        const height = isHigh ? 4.2 : 2.0;
        coin.position.y = height;
        group.add(coin);
        
        const edgeGeo = new THREE.TorusGeometry(0.5 * scale, 0.03 * scale, 8, 16);
        const edgeMat = new THREE.MeshStandardMaterial({ 
            color: 0xffff00, 
            emissive: 0x888800 
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.y = height;
        group.add(edge);
        
        const innerRingGeo = new THREE.TorusGeometry(0.25 * scale, 0.04 * scale, 8, 16);
        const innerRingMat = new THREE.MeshStandardMaterial({ 
            color: 0xff8800, 
            emissive: 0x664400 
        });
        const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
        innerRing.position.y = height + 0.02;
        group.add(innerRing);
        
        group.position.set(xPos, 0, zPos);
        group.userData.type = 'coin';
        group.userData.collected = false;
        group.userData.rotationAngle = 0;
        group.userData.isHigh = isHigh;
        
        group.castShadow = true;
        group.receiveShadow = true;
        this.scene.scene.add(group);
        this.coins.push(group);
    }

    updateCoins(deltaTime) {
        if (this.scene.isGameOver) return;
        
        this.coins = this.coins.filter((coin) => {
            if (coin.position.z < this.scene.playerZ - 25) {
                this.scene.scene.remove(coin);
                coin.children.forEach((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                return false;
            }
            
            coin.userData.rotationAngle += deltaTime * 3;
            coin.rotation.y = coin.userData.rotationAngle;
            
            const player = this.scene.player;
            if (!player || !player.model) return true;
            
            const playerPos = player.model.position;
            const coinPos = coin.position;
            
            if (!coin.userData.collected) {
                const dx = Math.abs(playerPos.x - coinPos.x);
                const dz = Math.abs(coinPos.z - playerPos.z);
                
                if (dx < 1.2 && dz < 2.0) {
                    const isHighCoin = coin.userData.isHigh;
                    const isPlayerJumping = player.isCrossing;
                    
                    if ((!isHighCoin && !isPlayerJumping) || (isHighCoin && isPlayerJumping)) {
                        coin.userData.collected = true;
                        this.scene.score += 1;
                        this.scene.updateScore();
                        this.scene.scene.remove(coin);
                        coin.children.forEach((child) => {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) child.material.dispose();
                        });
                        return false;
                    }
                }
            }
            
            return true;
        });
    }

    update(deltaTime) {
        this.updateCoins(deltaTime);
    }

    reset() {
        this.coins.forEach(coin => {
            this.scene.scene.remove(coin);
            coin.children.forEach((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.coins = [];
    }
}

export default CoinGenerator;