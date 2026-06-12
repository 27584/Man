class ObstacleGenerator {
    constructor(scene) {
        this.scene = scene;
        
        this.MIN_SPEED = 12;
        this.MAX_SPEED = 25;
        
        this.params = {
            minObstacleGap: { min: 2.5, max: 1.0 },
            emptyColumnChance: { min: 0.4, max: 0.05 },
            obstacleRatio: {
                low: { min: 0.6, max: 0.3 },
                high: { min: 0.15, max: 0.45 },
                full: { min: 0.05, max: 0.25 }
            },
            coinChance: {
                emptyTrack: { min: 0.6, max: 0.35 },
                nearObstacle: { min: 0.3, max: 0.1 }
            }
        };
        
        this.columnHistory = [];
        this.maxHistoryLength = 10;
        
        this.consecutiveObstacleColumns = 0;
        this.maxConsecutiveObstacleColumns = 5;
        
        this.currentColumnGap = 0;
        this.lastSpawnZ = 0;
    }
    
    getSpeedFactor() {
        const speed = this.scene.gameSpeed;
        return Math.min(1, Math.max(0, (speed - this.MIN_SPEED) / (this.MAX_SPEED - this.MIN_SPEED)));
    }
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    getCurrentParams() {
        const factor = this.getSpeedFactor();
        return {
            minObstacleGap: this.lerp(this.params.minObstacleGap.min, this.params.minObstacleGap.max, factor),
            emptyColumnChance: this.lerp(this.params.emptyColumnChance.min, this.params.emptyColumnChance.max, factor),
            obstacleRatio: {
                low: this.lerp(this.params.obstacleRatio.low.min, this.params.obstacleRatio.low.max, factor),
                high: this.lerp(this.params.obstacleRatio.high.min, this.params.obstacleRatio.high.max, factor),
                full: this.lerp(this.params.obstacleRatio.full.min, this.params.obstacleRatio.full.max, factor)
            },
            coinChance: {
                emptyTrack: this.lerp(this.params.coinChance.emptyTrack.min, this.params.coinChance.emptyTrack.max, factor),
                nearObstacle: this.lerp(this.params.coinChance.nearObstacle.min, this.params.coinChance.nearObstacle.max, factor)
            }
        };
    }
    
    shouldGenerateColumn(currentZ) {
        const params = this.getCurrentParams();
        const distanceSinceLastSpawn = currentZ - this.lastSpawnZ;
        
        if (distanceSinceLastSpawn >= params.minObstacleGap * this.scene.TRACK_WIDTH) {
            return true;
        }
        return false;
    }
    
    generateColumn(currentZ) {
        const params = this.getCurrentParams();
        const columns = this.scene.NUM_TRACKS;
        
        let columnData = {
            obstacles: [],
            coins: [],
            z: currentZ
        };
        
        if (this.consecutiveObstacleColumns >= this.maxConsecutiveObstacleColumns) {
            this.consecutiveObstacleColumns = 0;
            this.columnHistory.push(columnData);
            if (this.columnHistory.length > this.maxHistoryLength) {
                this.columnHistory.shift();
            }
            this.lastSpawnZ = currentZ;
            return columnData;
        }
        
        if (Math.random() < params.emptyColumnChance) {
            this.consecutiveObstacleColumns = 0;
            this.columnHistory.push(columnData);
            if (this.columnHistory.length > this.maxHistoryLength) {
                this.columnHistory.shift();
            }
            this.lastSpawnZ = currentZ;
            return columnData;
        }
        
        const obstacleTypes = ['low', 'high', 'full'];
        const weights = [params.obstacleRatio.low, params.obstacleRatio.high, params.obstacleRatio.full];
        
        const lastColumn = this.columnHistory[this.columnHistory.length - 1];
        const lastObstacles = lastColumn ? lastColumn.obstacles : [];
        
        let fullCount = 0;
        const currentObstacles = [];
        
        for (let track = 0; track < columns; track++) {
            const lastTrackObstacle = lastObstacles.find(o => o.track === track);
            
            let type = this.weightedRandom(obstacleTypes, weights);
            
            if (type === 'full') {
                if (fullCount >= 2) {
                    type = this.weightedRandom(['low', 'high'], [params.obstacleRatio.low, params.obstacleRatio.high]);
                } else {
                    const hasLastTwoFull = this.columnHistory.length >= 2 &&
                        this.columnHistory[this.columnHistory.length - 1].obstacles.filter(o => o.type === 'full').length >= 2 &&
                        this.columnHistory[this.columnHistory.length - 2].obstacles.filter(o => o.type === 'full').length >= 2;
                    
                    if (hasLastTwoFull) {
                        type = this.weightedRandom(['low', 'high'], [params.obstacleRatio.low, params.obstacleRatio.high]);
                    } else {
                        fullCount++;
                    }
                }
            }
            
            if (type === 'high' && lastTrackObstacle && lastTrackObstacle.type === 'high') {
                type = 'low';
            }
            
            if (type !== 'none') {
                currentObstacles.push({ track, type });
            }
        }
        
        if (currentObstacles.length > 0) {
            this.consecutiveObstacleColumns++;
        } else {
            this.consecutiveObstacleColumns = 0;
        }
        
        columnData.obstacles = currentObstacles;
        
        for (let track = 0; track < columns; track++) {
            const hasObstacle = currentObstacles.some(o => o.track === track);
            
            if (hasObstacle) {
                continue;
            }
            
            const hasAdjacentObstacle = currentObstacles.some(o => Math.abs(o.track - track) <= 1);
            const coinChance = hasAdjacentObstacle ? params.coinChance.nearObstacle : params.coinChance.emptyTrack;
            
            if (Math.random() < coinChance) {
                columnData.coins.push({ track });
            }
        }
        
        this.columnHistory.push(columnData);
        if (this.columnHistory.length > this.maxHistoryLength) {
            this.columnHistory.shift();
        }
        
        this.lastSpawnZ = currentZ;
        
        return columnData;
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
    
    spawnColumn(zPos) {
        const columnData = this.generateColumn(zPos);
        
        columnData.obstacles.forEach(obs => {
            const xPos = (obs.track - 1) * this.scene.TRACK_WIDTH;
            this.scene.createObstacle(obs.type, zPos, xPos);
        });
        
        columnData.coins.forEach(coin => {
            const xPos = (coin.track - 1) * this.scene.TRACK_WIDTH;
            this.scene.createCoin(xPos, zPos);
        });
    }
    
    update(currentZ) {
        if (this.shouldGenerateColumn(currentZ)) {
            const spawnZ = currentZ + 50;
            this.spawnColumn(spawnZ);
        }
    }
}