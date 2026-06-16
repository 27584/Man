import * as THREE from 'three';

class EnvironmentGenerator {
    constructor(scene) {
        this.scene = scene;
        
        this.trackSegments = [];
        this.buildings = [];
        
        this.segmentLength = 50;
        this.segmentCount = 5;
        this.lastSegmentZ = 0;
        
        this.NUM_TRACKS = 3;
        this.TRACK_WIDTH = 2.5;
        
        this.textureCache = [];
        this.textureLoader = new THREE.TextureLoader();
        // 为了提升加载速度，我删除了一些贴图，因此许多贴图实际不存在
        this.textureFiles = [
            'man尾兽.png', '白发牢露.png', '蹦床牢鼠.png', '布克牢岩.png', '炽热牢狮.png',
            '风滚牢虫.png', '花影牢羊.png', '幻影牢菇.png', '巨噬牢鳗.png', '卷胡牢獭.png',
            '牢蹦花.png', '牢波螺.png', '牢波鼠.png', '牢草巫灵.png', '牢刺盗.png',
            '牢蝶.png', '牢呀恶魔.png', '牢顶夫人.png', '牢嘟锅.png', '牢公英娃娃.png',
            '牢光狮.png', '牢海船长.png', '牢号鱼.png', '牢虹马.png', '牢呼猪.png',
            '牢狐.png', '牢花梨.png', '牢火.png', '牢吉吉.png', '牢家狮鹭.png',
            '牢巨人.png', '牢哇鸟.png', '牢哭菇.png', '牢拉.png', '牢拉多.png',
            '牢蓝蓝.png', '牢蕾兽.png', '牢狸.png', '牢力猫.png', '牢丽花.png',
            '牢灵.png', '牢灵石.png', '牢猫巫师.png', '牢畔群.png', '牢冥眼.png',
            '牢魔狼.png', '牢莫.png', '牢泡壳.png', '牢平格.png', '牢棋督.png',
            '牢棋盒.png', '牢棋垒.png', '牢企鹅.png', '牢石蜗.png', '牢睡王.png',
            '牢逮大.png', '牢田螺.png', '牢头鹮.png', '牢头鸭.png', '牢瓦重.png',
            '牢王蜂.png', '牢枭.png', '牢叶巡林.png', '牢夜.png', '牢夜蝶.png',
            '牢忆石.png', '牢翼鸟.png', '牢隐.png', '牢影树.png', '牢影娃娃.png',
            '牢幽菇.png', '牢悠悠.png', '牢羽雀.png', '牢杖-V.png', '梦想牢三.png',
            '怒目牢猫.png', '圣羽牢王.png', '石肤牢螺.png', '伊兰牢龙.png', '仪典牢像.png',
            '芋脚牢蛛.png'
        ];
    }

    preloadTextures() {
        this.textureFiles.forEach((file) => {
            const path = `assets/textures/man/${file}`;
            this.textureLoader.load(path, 
                (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    this.textureCache.push(texture);
                    console.log(`贴图加载成功: ${file}，已加载 ${this.textureCache.length}/${this.textureFiles.length}`);
                },
                undefined,
                (error) => {
                    console.warn(`贴图加载失败: ${path}`, error);
                }
            );
        });
    }
    
    getRandomTexture() {
        if (this.textureCache.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * this.textureCache.length);
        const texture = this.textureCache[randomIndex];
        
        if (texture) {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.flipY = true;
            texture.repeat.set(1, 1);
            texture.needsUpdate = true;
        }
        
        return texture;
    }

    loadSkybox() {
        this.scene.scene.background = new THREE.Color(0x87ceeb);
        
        const loader = new THREE.TextureLoader();
        loader.load('assets/textures/skybox.png', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.encoding = THREE.sRGBEncoding;
            this.scene.scene.background = texture;
        });
    }

    initInfiniteWorld() {
        for (let i = -this.segmentCount; i <= this.segmentCount; i++) {
            const zPos = i * this.segmentLength;
            this.createTrackSegment(zPos);
            this.createSurroundings(zPos);
            if (zPos > this.lastSegmentZ) {
                this.lastSegmentZ = zPos;
            }
        }
    }

    createTrackSegment(zPos) {
        for (let i = 0; i < this.NUM_TRACKS; i++) {
            const xPos = (i - 1) * this.TRACK_WIDTH;
            
            const trackGeometry = new THREE.PlaneGeometry(this.TRACK_WIDTH - 0.2, this.segmentLength);
            const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.1 });
            const track = new THREE.Mesh(trackGeometry, trackMaterial);
            track.rotation.x = -Math.PI / 2;
            track.position.set(xPos, 0.01, zPos);
            track.receiveShadow = true;
            this.scene.scene.add(track);
            
            if (!this.trackSegments[i]) this.trackSegments[i] = [];
            this.trackSegments[i].push(track);
        }
        
        for (let i = 0; i < this.NUM_TRACKS - 1; i++) {
            const lineGeometry = new THREE.BufferGeometry();
            const lineX = (i - 0.5) * this.TRACK_WIDTH;
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
                lineX, 0.02, zPos - this.segmentLength/2,
                lineX, 0.02, zPos + this.segmentLength/2
            ], 3));
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffdd00 });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            this.scene.scene.add(line);
        }
    }

    createSurroundings(zPos) {
        const buildingColors = [0x8888aa, 0x6699cc, 0x88aadd, 0x557799, 0x99aacc, 0x6688aa, 0x77aacc];
        const buildingHeights = [12, 15, 18, 20, 14, 16, 22, 10, 25, 13];
        
        const createBuildingWithRandomTexture = (x, z, height) => {
            const texture = this.getRandomTexture();
            
            const material = texture ? new THREE.MeshStandardMaterial({
                map: texture,
                color: 0xffffff,
                roughness: 0.4,
                metalness: 0.1,
                emissive: 0x000000,
                emissiveIntensity: 0,
                side: THREE.DoubleSide
            }) : new THREE.MeshStandardMaterial({
                color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
                roughness: 0.4,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            
            if (texture) {
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.flipY = true;
                texture.repeat.set(1, 1);
            }
            
            const building = new THREE.Mesh(
                new THREE.BoxGeometry(7, height, 5),
                material
            );
            building.position.set(x, height/2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            building.userData = { height: height };
            this.scene.scene.add(building);
            this.buildings.push(building);
        };
        
        const leftHeight = buildingHeights[Math.floor(Math.random() * buildingHeights.length)];
        createBuildingWithRandomTexture(-this.TRACK_WIDTH * 1.5 - 5, zPos, leftHeight);
        
        const rightHeight = buildingHeights[Math.floor(Math.random() * buildingHeights.length)];
        createBuildingWithRandomTexture(this.TRACK_WIDTH * 1.5 + 5, zPos, rightHeight);
        
        if (Math.random() > 0.4) {
            const extraLeftHeight = buildingHeights[Math.floor(Math.random() * buildingHeights.length)];
            createBuildingWithRandomTexture(-this.TRACK_WIDTH * 1.5 - 14, zPos + (Math.random() - 0.5) * 15, extraLeftHeight);
        }
        
        if (Math.random() > 0.4) {
            const extraRightHeight = buildingHeights[Math.floor(Math.random() * buildingHeights.length)];
            createBuildingWithRandomTexture(this.TRACK_WIDTH * 1.5 + 14, zPos + (Math.random() - 0.5) * 15, extraRightHeight);
        }
        
        if (Math.random() > 0.4) {
            this.createLampPost(-this.TRACK_WIDTH * 1.5 - 2.8, zPos);
            this.createLampPost(this.TRACK_WIDTH * 1.5 + 2.8, zPos);
        }
        
        if (Math.random() > 0.6) {
            this.createTree(-this.TRACK_WIDTH * 1.5 - 8, zPos);
            this.createTree(this.TRACK_WIDTH * 1.5 + 8, zPos);
        }
        
        if (Math.random() > 0.7) {
            this.createBillboard(-this.TRACK_WIDTH * 1.5 - 3.5, zPos + 5);
            this.createBillboard(this.TRACK_WIDTH * 1.5 + 3.5, zPos + 5);
        }
    }

    createLampPost(x, z) {
        const lampGroup = new THREE.Group();
        
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, metalness: 0.7, roughness: 0.3 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 4.5), poleMat);
        pole.position.y = 2.25;
        lampGroup.add(pole);
        
        const lampMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa44, emissiveIntensity: 0.4 });
        const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.4), lampMat);
        lampHead.position.y = 4.7;
        lampGroup.add(lampHead);
        
        lampGroup.position.set(x, 0, z);
        this.scene.scene.add(lampGroup);
        this.buildings.push(lampGroup);
    }

    createTree(x, z) {
        const treeGroup = new THREE.Group();
        
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.8), trunkMat);
        trunk.position.y = 0.9;
        treeGroup.add(trunk);
        
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x3cb371, roughness: 0.4 });
        const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.0, 8), leafMat);
        leaf1.position.y = 1.9;
        treeGroup.add(leaf1);
        
        const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 8), leafMat);
        leaf2.position.y = 2.6;
        treeGroup.add(leaf2);
        
        const leaf3 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 8), leafMat);
        leaf3.position.y = 3.2;
        treeGroup.add(leaf3);
        
        treeGroup.position.set(x, 0, z);
        this.scene.scene.add(treeGroup);
        this.buildings.push(treeGroup);
    }

    createBillboard(x, z) {
        const billboardGroup = new THREE.Group();
        
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), poleMat);
        pole.position.y = 1.5;
        billboardGroup.add(pole);
        
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x44aaff });
        const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 0.1), boardMat);
        board.position.y = 3.2;
        billboardGroup.add(board);
        
        billboardGroup.position.set(x, 0, z);
        this.scene.scene.add(billboardGroup);
        this.buildings.push(billboardGroup);
    }

    updateInfiniteWorld(playerZ) {
        const generateThreshold = playerZ + this.segmentLength * 2;
        while (this.lastSegmentZ < generateThreshold) {
            this.lastSegmentZ += this.segmentLength;
            this.createTrackSegment(this.lastSegmentZ);
            this.createSurroundings(this.lastSegmentZ);
        }
        
        const removeThreshold = playerZ - this.segmentLength * 2;
        
        for (let trackIdx = 0; trackIdx < this.trackSegments.length; trackIdx++) {
            if (this.trackSegments[trackIdx]) {
                this.trackSegments[trackIdx] = this.trackSegments[trackIdx].filter(segment => {
                    if (segment.position.z < removeThreshold) {
                        this.scene.scene.remove(segment);
                        segment.geometry.dispose();
                        segment.material.dispose();
                        return false;
                    }
                    return true;
                });
            }
        }
        
        this.buildings = this.buildings.filter(building => {
            if (building.position.z < removeThreshold) {
                this.scene.scene.remove(building);
                if (building.geometry) building.geometry.dispose();
                if (building.material) {
                    if (Array.isArray(building.material)) {
                        building.material.forEach(mat => {
                            if (mat.map) mat.map.dispose();
                            mat.dispose();
                        });
                    } else {
                        if (building.material.map) building.material.map.dispose();
                        building.material.dispose();
                    }
                }
                return false;
            }
            return true;
        });
    }

    clearTrackSegments() {
        this.trackSegments.forEach(tracks => {
            tracks.forEach(track => {
                this.scene.scene.remove(track);
                if (track.geometry) track.geometry.dispose();
                if (track.material) track.material.dispose();
            });
        });
        this.trackSegments = [];
    }

    clearBuildings() {
        this.buildings.forEach(building => {
            this.scene.scene.remove(building);
            if (building.geometry) building.geometry.dispose();
            if (building.material) {
                if (Array.isArray(building.material)) {
                    building.material.forEach(mat => {
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    });
                } else {
                    if (building.material.map) building.material.map.dispose();
                    building.material.dispose();
                }
            }
        });
        this.buildings = [];
    }

    clearTextures() {
        this.textureCache.forEach(texture => {
            if (texture) texture.dispose();
        });
        this.textureCache = [];
    }

    reset() {
        this.clearTrackSegments();
        this.clearBuildings();
        this.clearTextures();
        this.lastSegmentZ = 0;
    }
}

export default EnvironmentGenerator;