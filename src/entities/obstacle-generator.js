import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

class ObstacleGenerator {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        
        this.GRID_SIZE = 2.5;
        this.MIN_SPEED = 12;
        this.MAX_SPEED = 25;
        
        this.params = {
            obstacleGapMin: 5,
            obstacleGapMax: 14,
            obstacleRatio: {
                low: 0.2,
                high: 0.2,
                full: 0.2,
                none: 0.4
            },
            coinCounts: {
                1: 0.12,
                2: 0.06,
                3: 0.04
            }
        };
        
        this.lastProcessedGrid = -1;
        this.lastObstacleGrid = -10;
        this.nextObstacleGap = 3;
    }
    
    spawnColumn(gridZ) {
        const columns = this.scene.NUM_TRACKS;
        const zPos = gridZ * this.GRID_SIZE;
        
        const obstacleTypes = ['low', 'high', 'full', 'none'];
        const weights = [
            this.params.obstacleRatio.low,
            this.params.obstacleRatio.high,
            this.params.obstacleRatio.full,
            this.params.obstacleRatio.none
        ];
        
        let fullCount = 0;
        const obstacles = [];
        
        for (let track = 0; track < columns; track++) {
            let type = this.weightedRandom(obstacleTypes, weights);
            
            if (type === 'full') {
                if (fullCount >= 2) {
                    type = 'none';
                } else {
                    fullCount++;
                }
            }
            
            if (type !== 'none') {
                obstacles.push({ track, type });
            }
        }
        
        obstacles.forEach(obs => {
            this.createObstacle(obs.type, zPos, obs.track);
        });
        
        return obstacles;
    }
    
    generateObstacleColumn(gridZ) {
        return this.spawnColumn(gridZ);
    }
    
    generateCoinsForGrid(gridZ, obstacles = []) {
        if (!this.scene.coinGenerator) return;
        
        const columns = this.scene.NUM_TRACKS;
        const zPos = gridZ * this.GRID_SIZE;
        
        // 先决定金币数量
        const rand = Math.random();
        let coinCount = 0;
        if (rand < this.params.coinCounts[3]) {
            coinCount = 3;
        } else if (rand < this.params.coinCounts[3] + this.params.coinCounts[2]) {
            coinCount = 2;
        } else if (rand < this.params.coinCounts[3] + this.params.coinCounts[2] + this.params.coinCounts[1]) {
            coinCount = 1;
        }
        
        if (coinCount === 0) return;
        
        // 获取可用轨道
        const availableTracks = [];
        for (let track = 0; track < columns; track++) {
            const trackObstacle = obstacles.find(o => o.track === track);
            if (!trackObstacle || trackObstacle.type !== 'full') {
                availableTracks.push(track);
            }
        }
        
        // 随机选择轨道放置金币
        const selectedTracks = [];
        while (selectedTracks.length < coinCount && availableTracks.length > 0) {
            const idx = Math.floor(Math.random() * availableTracks.length);
            const track = availableTracks[idx];
            selectedTracks.push(track);
            availableTracks.splice(idx, 1);
        }
        
        // 在选定的轨道生成金币
        selectedTracks.forEach(track => {
            const trackObstacle = obstacles.find(o => o.track === track);
            const xPos = (track - 1) * this.scene.TRACK_WIDTH;
            
            if (trackObstacle) {
                if (trackObstacle.type === 'low') {
                    this.scene.coinGenerator.createCoin(xPos, zPos, true);
                } else if (trackObstacle.type === 'high') {
                    this.scene.coinGenerator.createCoin(xPos, zPos, false);
                }
            } else {
                const isHigh = Math.random() < 0.35;
                this.scene.coinGenerator.createCoin(xPos, zPos, isHigh);
            }
        });
    }
    
    weightedRandom(items, weights) {
        const total = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        
        return items[items.length - 1];
    }
    
    processGrid(grid) {
        if (grid <= this.lastProcessedGrid) return;
        
        const gapSinceLastObstacle = grid - this.lastObstacleGrid;
        
        if (gapSinceLastObstacle >= this.nextObstacleGap) {
            const obstacles = this.generateObstacleColumn(grid);
            this.generateCoinsForGrid(grid, obstacles);
            this.lastObstacleGrid = grid;
            this.nextObstacleGap = this.params.obstacleGapMin + 
                Math.floor(Math.random() * (this.params.obstacleGapMax - this.params.obstacleGapMin + 1));
        } else {
            this.generateCoinsForGrid(grid, []);
        }
        
        this.lastProcessedGrid = grid;
    }
    
    update(currentZ) {
        const currentGrid = Math.floor(currentZ / this.GRID_SIZE);
        const lookAhead = 20;
        
        for (let grid = this.lastProcessedGrid + 1; grid <= currentGrid + lookAhead; grid++) {
            this.processGrid(grid);
        }
    }
    
    spawnInitialObstacles() {
        this.lastProcessedGrid = 0;
        this.lastObstacleGrid = 0;
        this.nextObstacleGap = 4;
        
        // 只生成前几格的金币，障碍物从后面开始
        for (let grid = 1; grid <= 6; grid++) {
            this.generateCoinsForGrid(grid, []);
            this.lastProcessedGrid = grid;
        }
        
        // 生成第一组障碍物
        this.processGrid(10);
    }

    createObstacle(type, zPos, xPos = null) {
        const TRACK_WIDTH = this.scene.TRACK_WIDTH;
        const track = xPos !== null ? xPos : Math.floor(Math.random() * this.scene.NUM_TRACKS);
        const x = (track - 1) * TRACK_WIDTH;
        
        let obstacle;
        
        switch(type) {
            case 'low':
                obstacle = this.createLowObstacle();
                break;
            case 'high':
                obstacle = this.createHighObstacle();
                break;
            case 'full':
                obstacle = this.createFullObstacle();
                break;
            default:
                return null;
        }
        
        obstacle.position.set(x, 0, zPos);
        obstacle.userData = { type, track, counted: false };
        this.scene.scene.add(obstacle);
        this.obstacles.push(obstacle);
        
        return obstacle;
    }

    createLowObstacle() {
        const group = new THREE.Group();
        
        const bottomGeo = new THREE.BoxGeometry(1.5, 1.2, 1.2);
        const bottomMat = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            shininess: 30
        });
        const bottom = new THREE.Mesh(bottomGeo, bottomMat);
        bottom.position.y = 0.6;
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        group.add(bottom);
        
        const topGeo = new THREE.BoxGeometry(1.3, 0.5, 1.0);
        const topMat = new THREE.MeshPhongMaterial({ 
            color: 0x666666,
            shininess: 30
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 1.45;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);
        
        const indicatorGeo = new THREE.BoxGeometry(0.2, 0.1, 0.1);
        const indicatorMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
        const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        indicator.position.set(0, 0.1, 0.5);
        group.add(indicator);
        
        return group;
    }

    createHighObstacle() {
        const group = new THREE.Group();
        
        const postThickness = 1; 
        const postHeight = 5; 
        const postWidth = 1.2; 
        const postGeo = new THREE.BoxGeometry(postThickness, postHeight, postThickness);
        const postMat = new THREE.MeshPhongMaterial({ 
            color: 0x888888,
            shininess: 50
        });
        
        const leftPost = new THREE.Mesh(postGeo, postMat);
        leftPost.position.set(-postWidth, postHeight / 2, 0);
        leftPost.castShadow = true;
        group.add(leftPost);
        
        const rightPost = new THREE.Mesh(postGeo, postMat);
        rightPost.position.set(postWidth, postHeight / 2, 0);
        rightPost.castShadow = true;
        group.add(rightPost);
        
        const crossbarWidth = postWidth * 2 + 0.6; 
        const crossbarGeo = new THREE.BoxGeometry(crossbarWidth, postThickness, postThickness);
        const crossbar = new THREE.Mesh(crossbarGeo, postMat);
        crossbar.position.y = postHeight;
        crossbar.castShadow = true;
        group.add(crossbar);


        const crossbar2Width = postWidth * 2 + 0.6; 
        const crossbar2Geo = new THREE.BoxGeometry(crossbar2Width, postThickness, postThickness);
        const crossbar2 = new THREE.Mesh(crossbar2Geo, postMat);
        crossbar2.position.y = postHeight/2;
        crossbar2.castShadow = true;
        group.add(crossbar2);
        
        const indicatorGeo = new THREE.BoxGeometry(0.2, 0.1, 0.1);
        const indicatorMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
        const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        indicator.position.set(0, postHeight, 0);
        group.add(indicator);
        
        return group;
    }

    createFullObstacle() {
        const group = new THREE.Group();
        
        const height = 5.0; // 高度增加一倍
        
        const geo = new THREE.BoxGeometry(1.8, height, 1.2);
        const mat = new THREE.MeshPhongMaterial({ 
            color: 0x555555,
            shininess: 30
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        
        const stripeGeo = new THREE.BoxGeometry(0.1, height, 1.3);
        const stripeMat = new THREE.MeshPhongMaterial({ color: 0xFF4444 });
        
        const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
        stripe1.position.set(-0.6, height / 2, 0);
        group.add(stripe1);
        
        const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
        stripe2.position.set(0, height / 2, 0);
        group.add(stripe2);
        
        const stripe3 = new THREE.Mesh(stripeGeo, stripeMat);
        stripe3.position.set(0.6, height / 2, 0);
        group.add(stripe3);
        
     
        
        return group;
    }

    updateObstacles() {
        if (this.scene.isGameOver) return;
        
        const player = this.scene.player;
        if (!player || !player.model) return;
        
        this.obstacles = this.obstacles.filter((obstacle) => {
            if (obstacle.position.z < this.scene.playerZ - 25) {
                this.scene.scene.remove(obstacle);
                obstacle.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                return false;
            }
            
            if (!obstacle.userData.counted && !this.scene.isGameOver) {
                const playerPos = player.model.position;
                const distanceToPlayer = obstacle.position.z - playerPos.z;
                if (distanceToPlayer < 2.5 && distanceToPlayer > -1) {
                    if (this.checkCollision(obstacle, player)) {
                        
                        this.scene.gameOver();
                        return false;
                    }
                }
            }
            
            return true;
        });
    }

    checkCollision(obstacle, player) {
        const playerPos = player.model.position;
        const obsPos = obstacle.position;
        
        const dx = Math.abs(playerPos.x - obsPos.x);
        const dz = Math.abs(obsPos.z - playerPos.z);
        
        if (dz > 1.2) return false;
        
        let collisionRangeX = 1.1;
        if (obstacle.userData.type === 'full') {
            collisionRangeX = 1.2;
        }
        
        const isCrossing = player.isCrossing;
        const isSliding = player.isSliding;
        const landingGraceTimer = player.landingGraceTimer;
        
        if (dx < collisionRangeX) {
            switch(obstacle.userData.type) {
                case 'low':
                    if (isCrossing) {
                        const edge = 0.15;
                        const progress = player.crossJumpElapsed / player.crossJumpDuration;
                        if (progress > edge && progress < 1.0 - edge) {
                            return false;
                        }
                    }
                    if (landingGraceTimer > 0) {
                        return false;
                    }
                    return true;
                    
                case 'high':
                    if (isSliding) {
                        return false;
                    }
                    return true;
                    
                case 'full':
                    return true;
            }
        }
        
        return false;
    }
}

export default ObstacleGenerator;