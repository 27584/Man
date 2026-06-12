class RunGameScene {
    constructor(game) {
        this.game = game;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.player = null;
        this.chaser = null;
        this.chaserAnimationMixer = null;
        this.chaserAnimations = {};
        this.obstacles = [];
        this.coins = [];
        this.gameSpeed = 12;
        this.score = 0;
        this.isGameOver = false;
        this.isPlayingCG = true;
        this.isTransitioning = false;
        
        this.CG_DURATION = 6000;
        this.CG_START_TIME = 0;
        
        this.TRACK_WIDTH = 2.5;
        this.NUM_TRACKS = 3;
        this.PLAYER_START_TRACK = 1;
        this.targetTrack = this.PLAYER_START_TRACK;
        
        this.isSliding = false;
        this.isCrossing = false;
        this.slideCooldown = 0;
        
        // 跳跃
        this.crossJumpElapsed = 0;
        this.crossJumpDuration = 0.8;
        this.crossJumpHeight = 3.0;
        this.landingGraceTimer = 0;
        this.LANDING_GRACE = 0.05;
        
        this.playerZ = 0;
        
        // 追击者系统
        this.chaserDistance = 10;
        this.chaserSpeed = 12;
        this.chaserMode = 'medium';
        this.chaserModeTimer = 0;
        this.chaserModeInterval = 5000;
        
        // 生成系统
        this.trackSegments = [];
        this.buildings = [];
        this.segmentLength = 50;
        this.segmentCount = 5;
        this.lastSegmentZ = 0;
        
        // 贴图缓存
        this.textureCache = [];
        this.textureLoader = new THREE.TextureLoader();
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
        
        // CG摄像机
        this.cameraOffset = new THREE.Vector3(0, 8, -15);
        this.targetCameraOffset = new THREE.Vector3(0, 8, -15);
        this.shakeIntensity = 0;
        this.shakeOffset = new THREE.Vector2(0, 0);
        
        // 音频
        this.audioContext = null;
        this.currentAudio = null;
        this.cgAudioTimer = 0;
        this.cgAudioPlayed = [];
        
        this._onKeyDown = null;
        this._onKeyUp = null;
        this._onRestart = null;
        
        // Game Over UI 相关
        this.gameOverCanvas = null;
        this.gameOverCtx = null;
        this.gameOverCanvasTexture = null;
        this.gameOverStartTime = 0;
        this.gameOverAnimDuration = 1.2;
        
        // Game Over 物理模拟
        this.gameOverStartY = 0;
        this.gameOverVelocityY = 0;
        this.gameOverGravity = 15;
        
        // 障碍物生成系统配置
        this.obstacleGenerator = new ObstacleGenerator(this);
        
        // 冲刺系统配置
        this.isSprinting = false;
        this.sprintCooldown = 0;
        this.sprintDuration = 0;
        this.sprintSpeedBoost = 0;
        this.SPRINT_COOLDOWN_TIME = 0.75;
        this.SPRINT_DURATION_TIME = 0.2;
        this.SPRINT_SPEED_MULTIPLIER = 2.5;
        
        this.setupInputListeners();
    }
    
    setupInputListeners() {
        this._onKeyDown = (e) => {
            if (this.isGameOver || this.isPlayingCG) return;
            
            // 跳跃：空格、上箭头
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.tryCross();
                return;
            }
            // 滑铲：Ctrl、下箭头
            if ((e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'ArrowDown')
                && !this.isSliding && this.slideCooldown <= 0) {
                e.preventDefault();
                this.startSliding();
                this.slideCooldown = 0.3;
                return;
            }
            // 冲刺：Shift
            if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight')
                && !this.isSprinting && this.sprintCooldown <= 0 && !this.isSliding) {
                e.preventDefault();
                this.startSprint();
                return;
            }
            // 左切换跑道
            if (e.code === 'ArrowLeft') {
                e.preventDefault();
                this.targetTrack = Math.min(this.NUM_TRACKS - 1, this.targetTrack + 1);
                return;
            }
            // 右切换跑道
            if (e.code === 'ArrowRight') {
                e.preventDefault();
                this.targetTrack = Math.max(0, this.targetTrack - 1);
                return;
            }
        };
        this._onKeyUp = () => {};
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }
    
    // 预加载所有贴图
    preloadTextures() {
        
        this.textureFiles.forEach((file) => {
            const path = `assets/man/${file}`;
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
    
    // 获取随机贴图
getRandomTexture() {
    if (this.textureCache.length === 0) {
        return null;
    }
    const randomIndex = Math.floor(Math.random() * this.textureCache.length);
    const texture = this.textureCache[randomIndex];
    
    // 确保贴图正确配置
    if (texture) {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.flipY = true;
        texture.repeat.set(1, 1);
        texture.needsUpdate = true;
    }
    
    return texture;
}

    
    init() {
        this.preloadTextures();
        this.loadSkybox();
        this.createCamera();
        this.createLighting();
        this.createPlayer();
        this.createChaser();
        this.createUI();
        
        this.initInfiniteWorld();
        
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnInterval = 2800;
        
        this.playerZ = 0;
        
        this.game.camera = this.camera;
        this.hideHUD();
    }
    
    showHUD() {
        const runHud = document.getElementById('run_hud');
        const mainHud = document.getElementById('hud');
        if (runHud) runHud.style.display = 'block';
        if (mainHud) mainHud.style.display = 'none';
        const titleDiv = document.getElementById('title');
        const subtitleDiv = document.getElementById('subtitle');
        if (titleDiv) titleDiv.style.display = 'none';
        if (subtitleDiv) subtitleDiv.style.display = 'none';
        if (this.scoreElement) this.scoreElement.style.display = 'block';
    }

    hideHUD() {
        const runHud = document.getElementById('run_hud');
        if (runHud) runHud.style.display = 'none';
        if (this.scoreElement) this.scoreElement.style.display = 'none';
         const mainHud = document.getElementById('hud');
        if (mainHud) mainHud.style.display = 'none';
    }
    
    loadSkybox() {
        this.scene.background = new THREE.Color(0x87ceeb);
        
        const loader = new THREE.TextureLoader();
        loader.load('assets/skybox.png', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            this.scene.background = texture;
        });
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, -8);
        this.camera.lookAt(0, 2, 10);
    }
    
    createLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
        backLight.position.set(0, 5, -10);
        this.scene.add(backLight);
        
        const fillLight = new THREE.PointLight(0x4466cc, 0.3);
        fillLight.position.set(5, 10, 5);
        this.scene.add(fillLight);
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
            this.scene.add(track);
            
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
            this.scene.add(line);
        }
    }
    
    createSurroundings(zPos) {
    const buildingColors = [0x8888aa, 0x6699cc, 0x88aadd, 0x557799, 0x99aacc, 0x6688aa, 0x77aacc];
    const buildingHeights = [12, 15, 18, 20, 14, 16, 22, 10, 25, 13];
    
    // 创建带随机贴图的建筑
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
        this.scene.add(building);
        this.buildings.push(building);
    };
    
    // 左侧主建筑
    const leftHeight = buildingHeights[Math.floor(Math.random() * buildingHeights.length)];
    createBuildingWithRandomTexture(-this.TRACK_WIDTH * 1.5 - 5, zPos, leftHeight);
    
    // 右侧主建筑
    const rightHeight = buildingHeights[Math.floor(Math.random() * buildingHeights.length)];
    createBuildingWithRandomTexture(this.TRACK_WIDTH * 1.5 + 5, zPos, rightHeight);
    
    // 左侧副建筑
    if (Math.random() > 0.4) {
        const extraLeftHeight = buildingHeights[Math.floor(Math.random() * buildingHeights.length)];
        createBuildingWithRandomTexture(-this.TRACK_WIDTH * 1.5 - 14, zPos + (Math.random() - 0.5) * 15, extraLeftHeight);
    }
    
    // 右侧副建筑
    if (Math.random() > 0.4) {
        const extraRightHeight = buildingHeights[Math.floor(Math.random() * buildingHeights.length)];
        createBuildingWithRandomTexture(this.TRACK_WIDTH * 1.5 + 14, zPos + (Math.random() - 0.5) * 15, extraRightHeight);
    }
    
    // 路灯
    if (Math.random() > 0.4) {
        this.createLampPost(-this.TRACK_WIDTH * 1.5 - 2.8, zPos);
        this.createLampPost(this.TRACK_WIDTH * 1.5 + 2.8, zPos);
    }
    
    // 树木
    if (Math.random() > 0.6) {
        this.createTree(-this.TRACK_WIDTH * 1.5 - 8, zPos);
        this.createTree(this.TRACK_WIDTH * 1.5 + 8, zPos);
    }
    
    // 广告牌
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
        this.scene.add(lampGroup);
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
        this.scene.add(treeGroup);
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
        this.scene.add(billboardGroup);
        this.buildings.push(billboardGroup);
    }
    
    createPlayer() {
        const loader = new THREE.GLTFLoader();
        loader.load('assets/kobe.glb', (gltf) => {
            this.player = gltf.scene;
            this.player.position.set(0, 0.8, 0);
            this.player.scale.set(1.5, 1.5, 1.5);
            this.player.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.scene.add(this.player);
            
            this.animationMixer = new THREE.AnimationMixer(this.player);
            this.animations = {};
            
            console.log('Available animations:', gltf.animations.map(a => a.name));
            
            gltf.animations.forEach((clip) => {
                const action = this.animationMixer.clipAction(clip);
                action.clampWhenFinished = true;
                
                if (clip.name === 'sprint') {
                    action.setLoop(THREE.LoopRepeat);
                } else {
                    action.setLoop(THREE.LoopOnce);
                }
                
                this.animations[clip.name] = action;
            });
            
            if (this.animations['sprint']) {
                this.animations['sprint'].play();
            }
            
            this.checkCGStart();
        });
    }
    
    createChaser() {
        const loader = new THREE.GLTFLoader();
        loader.load('assets/doubao.glb', (gltf) => {
            this.chaser = gltf.scene;
            this.chaser.position.set(0, 0.8, -15);
            this.chaser.scale.set(1.5, 1.5, 1.5);
            this.chaser.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.scene.add(this.chaser);
            
            this.chaserAnimationMixer = new THREE.AnimationMixer(this.chaser);
            this.chaserAnimations = {};
            
            console.log('Chaser animations:', gltf.animations.map(a => a.name));
            
            gltf.animations.forEach((clip) => {
                const action = this.chaserAnimationMixer.clipAction(clip);
                action.clampWhenFinished = true;
                action.setLoop(THREE.LoopRepeat);
                this.chaserAnimations[clip.name] = action;
            });
            
            if (this.chaserAnimations['o_sprint']) {
                this.chaserAnimations['o_sprint'].play();
            } else if (this.chaserAnimations['o_run']) {
                this.chaserAnimations['o_run'].play();
            } else if (this.chaserAnimations[Object.keys(this.chaserAnimations)[0]]) {
                this.chaserAnimations[Object.keys(this.chaserAnimations)[0]].play();
            }
            
            this.checkCGStart();
        });
    }
    
    checkCGStart() {
        if (this.player && this.chaser && !this.CG_START_TIME) {
            this.CG_START_TIME = performance.now();
            this.initAudio();
        }
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    playAudio(url, loop = false) {
        if (!this.audioContext) return;
        
        if (this.currentAudio) {
            this.currentAudio.stop();
            this.currentAudio = null;
        }
        
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => this.audioContext.decodeAudioData(buffer))
            .then(audioBuffer => {
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.loop = loop;
                
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0.5;
                
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                source.start(0);
                this.currentAudio = source;
                
                source.onended = () => {
                    if (this.currentAudio === source) {
                        this.currentAudio = null;
                    }
                };
            })
            .catch(error => {
                console.warn('Failed to play audio:', error);
            });
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    updateCGCamera(deltaTime) {
        if (!this.player || !this.chaser) return;
        
        const elapsed = performance.now() - this.CG_START_TIME;
        const progress = elapsed / this.CG_DURATION;
        
        const playerPos = this.player.position;
        const chaserPos = this.chaser.position;
        
        const midPoint = new THREE.Vector3(
            (playerPos.x + chaserPos.x) / 2,
            (playerPos.y + chaserPos.y) / 2,
            (playerPos.z + chaserPos.z) / 2
        );
        
        let phase1End = 0.25;
        let phase2End = 0.35;
        let phase3End = 0.65;
        
        let lookAtFront = false;
        
        if (progress < phase1End) {
            const t = progress / phase1End;
            const easeT = this.easeInOutCubic(t);
            
            const angle = t * Math.PI;
            const radius = 5;
            
            this.targetCameraOffset.x = Math.sin(angle) * radius;
            this.targetCameraOffset.y = 3 + easeT * 2;
            this.targetCameraOffset.z = Math.cos(angle) * radius;
            
            this.shakeIntensity = 0;
            lookAtFront = true;
        } else if (progress < phase2End) {
            const t = (progress - phase1End) / (phase2End - phase1End);
            const easeT = this.easeInOutCubic(t);
            
            const startX = 0;
            const startY = 10;
            const startZ = -10;
            const endX = 2;
            const endY = 6;
            const endZ = -8;
            
            this.targetCameraOffset.x = startX + (endX - startX) * easeT;
            this.targetCameraOffset.y = startY + (endY - startY) * easeT;
            this.targetCameraOffset.z = startZ + (endZ - startZ) * easeT;
            
            this.shakeIntensity = 0.01;
        } else if (progress < phase3End) {
            const t = (progress - phase2End) / (phase3End - phase2End);
            const easeT = this.easeInOutCubic(t);
            
            const baseX = 2;
            const baseY = 5;
            const baseZ = -8;
            
            this.targetCameraOffset.x = baseX;
            this.targetCameraOffset.y = baseY;
            this.targetCameraOffset.z = baseZ;
            
            this.shakeIntensity = 0.015;
        } else {
            const t = (progress - phase3End) / (1 - phase3End);
            const easeT = this.easeInOutCubic(t);
            
            const startX = this.targetCameraOffset.x;
            const startY = this.targetCameraOffset.y;
            const startZ = this.targetCameraOffset.z;
            const endX = 0;
            const endY = 5;
            const endZ = -8;
            
            this.targetCameraOffset.x = startX + (endX - startX) * easeT;
            this.targetCameraOffset.y = startY + (endY - startY) * easeT;
            this.targetCameraOffset.z = startZ + (endZ - startZ) * easeT;
            
            this.shakeIntensity = 0;
        }
        
        this.cameraOffset.lerp(this.targetCameraOffset, deltaTime * 5);
        
        this.shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity * 2;
        this.shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity * 2;
        
        const finalCamPos = new THREE.Vector3(
            midPoint.x + this.cameraOffset.x + this.shakeOffset.x,
            midPoint.y + this.cameraOffset.y + this.shakeOffset.y,
            midPoint.z + this.cameraOffset.z
        );
        
        this.camera.position.lerp(finalCamPos, deltaTime * 8);
        
        const lookAtPoint = new THREE.Vector3();
        if (lookAtFront) {
            lookAtPoint.x = playerPos.x ;
            lookAtPoint.y = playerPos.y + 1.5;
            lookAtPoint.z = playerPos.z -12;
        } else {
            lookAtPoint.x = midPoint.x + (playerPos.x - midPoint.x) * 0.3;
            lookAtPoint.y = midPoint.y + 1;
            lookAtPoint.z = midPoint.z + 8;
        }
        this.camera.lookAt(lookAtPoint);
    }
    
    createUI() {
        this.scoreElement = document.createElement('div');
        this.scoreElement.style.position = 'fixed';
        this.scoreElement.style.top = '20px';
        this.scoreElement.style.left = '20px';
        this.scoreElement.style.color = '#ffffff';
        this.scoreElement.style.font = 'bold 32px Arial';
        this.scoreElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        this.scoreElement.style.zIndex = '100';
        this.scoreElement.style.pointerEvents = 'none';
        this.scoreElement.textContent = 'Score: 0';
        document.body.appendChild(this.scoreElement);
    }
    
    updateScore() {
        if (this.scoreElement) {
            this.scoreElement.textContent = `Score: ${Math.floor(this.score)}`;
        }
    }
    
    createObstacle(type, zPos, xPos = null) {
        let obstacle;
        
        let track;
        if (xPos !== null) {
            track = Math.round(xPos / this.TRACK_WIDTH) + 1;
        } else {
            track = Math.floor(Math.random() * this.NUM_TRACKS);
            xPos = (track - 1) * this.TRACK_WIDTH;
        }
        
        switch(type) {
            case 'low': {
                const group = new THREE.Group();
                
                const bodyGeo = new THREE.BoxGeometry(1.8, 0.6, 1.8);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.4, emissive: 0x331111 });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = 0.3;
                group.add(body);
                
                const topGeo = new THREE.BoxGeometry(1.6, 0.1, 1.6);
                const topMat = new THREE.MeshStandardMaterial({ color: 0xff8888, emissive: 0x441111 });
                const top = new THREE.Mesh(topGeo, topMat);
                top.position.y = 0.65;
                group.add(top);
                
                group.position.set(xPos, 1, zPos);
                obstacle = group;
                obstacle.userData.type = 'low';
                obstacle.userData.track = track;
                break;
            }
            
            case 'high': {
                const group = new THREE.Group();
                
                const platformGeo = new THREE.BoxGeometry(1.8, 0.3, 1.8);
                const platformMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x116611, roughness: 0.3 });
                const platform = new THREE.Mesh(platformGeo, platformMat);
                platform.position.y = 0;
                group.add(platform);
                
                const ringGeo = new THREE.TorusGeometry(1.0, 0.08, 16, 32);
                const ringMat = new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x33ff33, emissiveIntensity: 0.6 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                ring.position.y = 0.15;
                group.add(ring);
                
                const pillarGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 6);
                const pillarMat = new THREE.MeshStandardMaterial({ color: 0x88aa88 });
                const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.y = -0.75;
                group.add(pillar);
                
                const topBallGeo = new THREE.SphereGeometry(0.25, 8, 8);
                const topBallMat = new THREE.MeshStandardMaterial({ color: 0xffff88, emissive: 0x44aa44 });
                const topBall = new THREE.Mesh(topBallGeo, topBallMat);
                topBall.position.y = 0.25;
                group.add(topBall);
                
                group.position.set(xPos, 4.2, zPos);
                obstacle = group;
                obstacle.userData.type = 'high';
                obstacle.userData.track = track;
                break;
            }
            
            case 'full': {
                const group = new THREE.Group();
                
                const bodyGeo = new THREE.CylinderGeometry(0.9, 0.9, 4.2, 8);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x442200, roughness: 0.2 });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = 2.1;
                group.add(body);
                
                const topGeo = new THREE.SphereGeometry(0.6, 8, 8);
                const topMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x442200 });
                const top = new THREE.Mesh(topGeo, topMat);
                top.position.y = 4.3;
                group.add(top);
                
                const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                for (let i = 0; i < 3; i++) {
                    const stripeGeo = new THREE.TorusGeometry(0.95, 0.08, 8, 24);
                    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
                    stripe.rotation.x = Math.PI / 2;
                    stripe.position.y = 1.0 + i * 1.2;
                    group.add(stripe);
                }
                
                group.position.set(xPos, 0, zPos);
                obstacle = group;
                obstacle.userData.type = 'full';
                obstacle.userData.track = track;
                break;
            }
        }
        
        if (obstacle) {
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
        }
    }
    
    createCoin(xPos, zPos, isHigh = false) {
        const group = new THREE.Group();
        
        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
        
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
        
        const edgeGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 16);
        const edgeMat = new THREE.MeshStandardMaterial({ 
            color: 0xffff00, 
            emissive: 0x888800 
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.y = height;
        group.add(edge);
        
        const innerRingGeo = new THREE.TorusGeometry(0.25, 0.04, 8, 16);
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
        this.scene.add(group);
        this.coins.push(group);
    }
    
    spawnObstacle() {
        const types = ['low', 'high', 'full'];
        const type = types[Math.floor(Math.random() * types.length)];
        const spawnZ = this.playerZ + 50 + Math.random() * 35;
        this.createObstacle(type, spawnZ);
    }
    
    updateInfiniteWorld(deltaTime) {
        const generateThreshold = this.playerZ + this.segmentLength * 2;
        while (this.lastSegmentZ < generateThreshold) {
            this.lastSegmentZ += this.segmentLength;
            this.createTrackSegment(this.lastSegmentZ);
            this.createSurroundings(this.lastSegmentZ);
        }
        
        const removeThreshold = this.playerZ - this.segmentLength * 2;
        
        for (let trackIdx = 0; trackIdx < this.trackSegments.length; trackIdx++) {
            if (this.trackSegments[trackIdx]) {
                this.trackSegments[trackIdx] = this.trackSegments[trackIdx].filter(segment => {
                    if (segment.position.z < removeThreshold) {
                        this.scene.remove(segment);
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
                this.scene.remove(building);
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
    
    updateObstacles(deltaTime) {
        if (this.isGameOver) return;
        
        this.obstacleSpawnTimer += deltaTime * 1000;
        if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
            this.obstacleSpawnInterval = Math.max(1300, 2800 - this.score * 1.2);
        }
        
        this.obstacles = this.obstacles.filter((obstacle) => {
            if (obstacle.position.z < this.playerZ - 25) {
                this.scene.remove(obstacle);
                if (obstacle.geometry) obstacle.geometry.dispose();
                if (obstacle.material) obstacle.material.dispose();
                return false;
            }
            
            if (this.player && !obstacle.userData.counted && !this.isGameOver) {
                const distanceToPlayer = obstacle.position.z - this.player.position.z;
                if (distanceToPlayer < 2.5 && distanceToPlayer > -1) {
                    if (this.checkCollision(obstacle)) {
                        this.gameOver();
                        return false;
                    }
                }
            }
            
            return true;
        });
    }
    
    updateCoins(deltaTime) {
        if (this.isGameOver) return;
        
        this.coins = this.coins.filter((coin) => {
            if (coin.position.z < this.playerZ - 25) {
                this.scene.remove(coin);
                coin.children.forEach((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                return false;
            }
            
            coin.userData.rotationAngle += deltaTime * 3;
            coin.rotation.y = coin.userData.rotationAngle;
            
            if (!coin.userData.collected && this.player) {
                const playerPos = this.player.position;
                const coinPos = coin.position;
                
                const dx = Math.abs(playerPos.x - coinPos.x);
                const dz = Math.abs(coinPos.z - playerPos.z);
                
                if (dx < 1.2 && dz < 2.0) {
                    const isHighCoin = coin.userData.isHigh;
                    // 只要 isCrossing 为 true 就是跳跃状态
                    const isPlayerJumping = this.isCrossing;
                    
                    // 下方的金币不能在跳跃时捡，只能在地面捡
                    // 高处的金币必须在跳跃时捡
                    if ((!isHighCoin && !isPlayerJumping) || (isHighCoin && isPlayerJumping)) {
                        coin.userData.collected = true;
                        this.score += 25;
                        this.updateScore();
                        
                        this.scene.remove(coin);
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
    
    updateGameSpeed(deltaTime) {
        if (this.isGameOver || this.isPlayingCG || this.isTransitioning) return;
        
        const MAX_SPEED = 25;
        const ACCELERATION = 0.5;
        
        this.gameSpeed = Math.min(MAX_SPEED, this.gameSpeed + ACCELERATION * deltaTime);
    }
    
    updateCoinSpawner(deltaTime) {
        if (!this.coinSpawnTimer) this.coinSpawnTimer = 0;
        if (!this.coinSpawnInterval) this.coinSpawnInterval = 2000;
        
        this.coinSpawnTimer += deltaTime * 1000;
        
        const MIN_INTERVAL = 800;
        const MAX_INTERVAL = 2000;
        const speedFactor = (this.gameSpeed - 12) / 13;
        this.coinSpawnInterval = MAX_INTERVAL - (MAX_INTERVAL - MIN_INTERVAL) * speedFactor;
        
        if (this.coinSpawnTimer >= this.coinSpawnInterval) {
            this.coinSpawnTimer = 0;
            
            const spawnZ = this.playerZ + 60 + Math.random() * 20;
            const track = Math.floor(Math.random() * this.NUM_TRACKS);
            const xPos = (track - 1) * this.TRACK_WIDTH;
            
            const hasObstacle = this.obstacles.some(obs => 
                Math.abs(obs.position.x - xPos) < this.TRACK_WIDTH && 
                Math.abs(obs.position.z - spawnZ) < 10
            );
            
            if (!hasObstacle) {
                const isHigh = Math.random() < 0.35;
                this.createCoin(xPos, spawnZ, isHigh);
            }
        }
    }
    
    updateSprintAnimationSpeed() {
        if (!this.animations || !this.animations['sprint']) return;
        
        const baseSpeed = 1.0;
        const maxSpeed = 2.0;
        const minSpeed = 12;
        const maxSpeedValue = 25;
        
        const speedFactor = Math.min(1, Math.max(0, (this.gameSpeed - minSpeed) / (maxSpeedValue - minSpeed)));
        const animationSpeed = baseSpeed + (maxSpeed - baseSpeed) * speedFactor;
        
        this.animations['sprint'].playbackRate = animationSpeed;
    }
    
    updateChaser(deltaTime) {
        if (!this.chaser || this.isGameOver) return;
        
        // 速度模式对应的倍率（基于gameSpeed）
        const modeMultipliers = {
            'high': 1.3,
            'medium': 1.0,
            'low': 0.7
        };
        
        // 追击者当前速度 = 游戏速度 * 模式倍率
        this.chaserSpeed = this.gameSpeed * modeMultipliers[this.chaserMode];
        
        // 计算实际移动距离
        const moveDistance = this.chaserSpeed * deltaTime;
        
        // 更新追击者z位置
        this.chaser.position.z += moveDistance;
        
        // 更新与玩家的距离
        this.chaserDistance = -this.chaser.position.z + this.playerZ;
        
        // 距离检查
        if (this.chaserDistance < 4) {
            // 安全距离，进入中速模式
            this.chaserMode = 'medium';
        } else if (this.chaserDistance > 16) {
            // 太远，瞬移到安全距离并进入高速模式
            this.chaserDistance = 16;
            this.chaser.position.z = this.playerZ - 16;
            this.chaserMode = 'high';
        }
        
        // 每5秒判断切换速度模式
        this.chaserModeTimer += deltaTime * 1000;
        if (this.chaserModeTimer >= this.chaserModeInterval) {
            this.chaserModeTimer = 0;
            
            if (this.chaserDistance > 8.5) {
                // 距离远，在中速和高速随机
                this.chaserMode = Math.random() < 0.5 ? 'high' : 'medium';
            } else if (this.chaserDistance < 8.5) {
                // 距离近，在中速和低速随机
                this.chaserMode = Math.random() < 0.5 ? 'low' : 'medium';
            }
        }
        
        // 横向跟随玩家
        const playerTrackX = (this.targetTrack - 1) * this.TRACK_WIDTH;
        this.chaser.position.x += (playerTrackX - this.chaser.position.x) * deltaTime * 2;
        
        this.chaser.position.y = 0.8;
        
        // 更新追击者动画速度（倍率随游戏时间增大，与玩家相同）
        if (this.chaserAnimationMixer && this.chaserAnimations) {
            const minSpeed = 12;
            const maxSpeed = 25;
            const minAnimSpeed = 1.0;
            const maxAnimSpeed = 2.0;
            
            const speedFactor = Math.min(1, Math.max(0, (this.gameSpeed - minSpeed) / (maxSpeed - minSpeed)));
            const chaserAnimSpeed = minAnimSpeed + (maxAnimSpeed - minAnimSpeed) * speedFactor;
            
            if (this.chaserAnimations['o_sprint']) {
                this.chaserAnimations['o_sprint'].playbackRate = chaserAnimSpeed;
            }
        }
    }
    
    checkCollision(obstacle) {
        if (!this.player) return false;
        
        const playerPos = this.player.position;
        const obsPos = obstacle.position;
        
        const dx = Math.abs(playerPos.x - obsPos.x);
        const dz = Math.abs(obsPos.z - playerPos.z);
        
        if (dz > 1.2) return false;
        
        let collisionRangeX = 1.1;
        if (obstacle.userData.type === 'full') {
            collisionRangeX = 1.2;
        }
        
        if (dx < collisionRangeX) {
            switch(obstacle.userData.type) {
                case 'low':
                    if (this.isCrossing) {
                        const edge = 0.15;
                        const progress = this.crossJumpElapsed / this.crossJumpDuration;
                        if (progress > edge && progress < 1.0 - edge) {
                            return false;
                        }
                    }
                    if (this.landingGraceTimer > 0) {
                        return false;
                    }
                    return true;
                    
                case 'high':
                    if (this.isSliding) {
                        return false;
                    }
                    return true;
                    
                case 'full':
                    return true;
            }
        }
        
        return false;
    }
    
    tryCross() {
        if (this.isCrossing || !this.animations || !this.player || this.isGameOver) return;
        
        if (this.animations['cross']) {
            if (this.isSliding) {
                this.isSliding = false;
                if (this.animations['sliding_tackle']) {
                    this.animations['sliding_tackle'].stop();
                }
            } else {
                if (this.animations['sprint']) this.animations['sprint'].stop();
            }
            
            this.isCrossing = true;
            this.crossJumpElapsed = 0;
            this.player.position.y = 0.8;
            
            this.animations['cross'].stop();
            this.animations['cross'].reset();
            this.animations['cross'].play();
        }
    }
    
    startSliding() {
        if (this.isSliding || !this.animations || this.isGameOver) return;
        
        // 跳跃时立即取消跳跃并开始下滑
        if (this.isCrossing) {
            this.isCrossing = false;
            this.crossJumpElapsed = 0;
            if (this.player) {
                this.player.position.y = 0.3;
            }
            if (this.animations['cross']) {
                this.animations['cross'].stop();
            }
        }
        
        this.isSliding = true;
        if (this.animations['sprint']) this.animations['sprint'].stop();
        this.animations['sliding_tackle'].stop();
        this.animations['sliding_tackle'].reset();
        this.animations['sliding_tackle'].play();
    }
    
    stopSliding() {
        if (!this.isSliding) return;
        
        this.isSliding = false;
        if (this.player && !this.isCrossing && !this.isGameOver) {
            this.player.position.y = 0.8;
        }
        if (this.animations && this.animations['sprint'] && !this.isGameOver) {
            this.animations['sprint'].reset();
            this.animations['sprint'].play();
        }
    }
    
    startSprint() {
        if (this.isSprinting || this.isSliding || this.isGameOver) return;
        
        this.isSprinting = true;
        this.sprintDuration = this.SPRINT_DURATION_TIME;
        this.sprintCooldown = this.SPRINT_COOLDOWN_TIME;
        this.sprintSpeedBoost = this.gameSpeed * this.SPRINT_SPEED_MULTIPLIER;
        
        if (this.animations && this.animations['sprint']) {
            this.animations['sprint'].playbackRate = 3.0;
        }
    }
    
    updateSprint(deltaTime) {
        if (!this.isSprinting) {
            if (this.sprintCooldown > 0) {
                this.sprintCooldown -= deltaTime;
            }
            return;
        }
        
        this.sprintDuration -= deltaTime;
        
        this.playerZ += this.sprintSpeedBoost * deltaTime;
        
        if (this.sprintDuration <= 0) {
            this.isSprinting = false;
            if (this.animations && this.animations['sprint']) {
                this.updateSprintAnimationSpeed();
            }
        }
    }
    
    update(deltaTime) {
        const dt = Math.min(deltaTime, 0.1);
        
        if (this.animationMixer) {
            this.animationMixer.update(dt);
        }
        
        if (this.chaserAnimationMixer) {
            this.chaserAnimationMixer.update(dt);
        }
        
        if (this.isPlayingCG) {
            this.updateCG(dt);
            return;
        }
        
        if (this.isTransitioning) {
            this.updateTransition(dt);
            return;
        }
        
        if (this.isGameOver && this.gameOverSprite && this.gameOverCanvasTexture) {
            this.updateGameOverUI();
        }
        
        if (this.isGameOver && this.player) {
            this.gameOverVelocityY -= this.gameOverGravity * dt;
            this.player.position.y += this.gameOverVelocityY * dt;
            
            if (this.player.position.y <= 0.2) {
                this.player.position.y = 0.2;
                this.gameOverVelocityY = 0;
            }
            return;
        }
        
        if (this.isGameOver) return;
        
        this.playerZ += this.gameSpeed * dt;
        
        this.updateInfiniteWorld(dt);
        
        if (this.slideCooldown > 0) {
            this.slideCooldown -= dt;
        }
        
        this.updateObstacles(dt);
        this.updateCoins(dt);
        this.updateGameSpeed(dt);
        this.obstacleGenerator.update(this.playerZ);
        this.updateCoinSpawner(dt);
        this.updateSprintAnimationSpeed();
        this.updateChaser(dt);
        this.updateSprint(dt);
        
        if (this.player) {
            this.player.position.z = this.playerZ;
            
            const targetX = (this.targetTrack - 1) * this.TRACK_WIDTH;
            this.player.position.x += (targetX - this.player.position.x) * 12 * dt;
            
            if (this.landingGraceTimer > 0) {
                this.landingGraceTimer -= dt;
            }
            
            if (this.isCrossing) {
                this.crossJumpElapsed += dt;
                const progress = Math.min(this.crossJumpElapsed / this.crossJumpDuration, 1.0);
                const jumpY = Math.sin(progress * Math.PI) * this.crossJumpHeight;
                this.player.position.y = 0.8 + jumpY;
                
                if (progress >= 1.0) {
                    this.isCrossing = false;
                    this.crossJumpElapsed = 0;
                    this.landingGraceTimer = this.LANDING_GRACE;
                    this.player.position.y = 0.8;
                    if (this.animations['cross']) this.animations['cross'].stop();
                    if (this.animations && this.animations['sprint'] && !this.isGameOver) {
                        this.animations['sprint'].reset();
                        this.animations['sprint'].play();
                    }
                }
            } else if (this.isSliding) {
                this.player.position.y = 0.3;
                const action = this.animations['sliding_tackle'];
                if (action && action.time >= action.getClip().duration - 0.001) {
                    this.stopSliding();
                }
            } else {
                this.player.position.y = 0.8;
            }
            
            if (this.camera && !this.isGameOver) {
                const camTargetX = this.player.position.x;
                const camTargetZ = this.player.position.z - 8;
                this.camera.position.x += (camTargetX - this.camera.position.x) * 8 * dt;
                this.camera.position.z += (camTargetZ - this.camera.position.z) * 8 * dt;
                this.camera.lookAt(this.player.position.x, this.player.position.y + 1, this.player.position.z + 10);
                
                if (this.scoreSprite) {
                    this.scoreSprite.position.set(
                        this.camera.position.x - 4,
                        this.camera.position.y + 3,
                        this.camera.position.z - 4
                    );
                }
            }
        }
    }
    
    updateCG(deltaTime) {
        const dt = Math.min(deltaTime, 0.1);
        
        if (!this.CG_START_TIME) return;
        
        const elapsed = performance.now() - this.CG_START_TIME;
        
        if (elapsed >= this.CG_DURATION) {
            this.endCG();
            return;
        }
        
        if (!this.player || !this.chaser) return;
        
        const cgSpeed = 15;
        this.player.position.z += cgSpeed * dt;
        this.chaser.position.z += cgSpeed * dt * 1.1;
        
        const distance = this.player.position.z - this.chaser.position.z;
        if (distance < 6) {
            this.chaser.position.z = this.player.position.z - 8;
        } else if (distance > 12) {
            this.chaser.position.z = this.player.position.z - 10;
        }
        
        this.updateCGCamera(dt);
        
        this.cgAudioTimer += dt;
        if (this.cgAudioTimer >= 1.0 && this.cgAudioPlayed.length === 0) {
            this.playAudio('assets/man.mp3');
            this.cgAudioPlayed.push('man');
            this.cgAudioTimer = 0;
        } else if (this.cgAudioTimer >= 1.0 && this.cgAudioPlayed.length === 1) {
            this.playAudio('assets/what can i say.mp3');
            this.cgAudioPlayed.push('what');
            this.cgAudioTimer = 0;
        }
    }
    
    endCG() {
        this.isPlayingCG = false;
        this.isTransitioning = true;
        this.transitionStartTime = performance.now();
        this.transitionDuration = 1000;
        
        this.transitionStartCamPos = this.camera.position.clone();
        this.transitionStartPlayerPos = this.player.position.clone();
        
        this.transitionEndCamPos = new THREE.Vector3(0, 5, -8);
        this.transitionEndPlayerPos = new THREE.Vector3(0, 0.8, 0);
        
        if (this.chaser) {
            this.chaser.position.set(0, 0.8, -10);
            this.chaserDistance = 10;
            this.chaserSpeed = 12;
            this.chaserMode = 'medium';
            this.chaserModeTimer = 0;
        }
        
        this.playAudio('assets/seeyouagain.mp3', true);
    }
    
    updateTransition(deltaTime) {
        if (!this.isTransitioning) return;
        
        const elapsed = performance.now() - this.transitionStartTime;
        const progress = Math.min(elapsed / this.transitionDuration, 1);
        const easeT = this.easeInOutCubic(progress);
        
        this.camera.position.lerpVectors(this.transitionStartCamPos, this.transitionEndCamPos, easeT);
        
        this.player.position.x = this.transitionStartPlayerPos.x + (this.transitionEndPlayerPos.x - this.transitionStartPlayerPos.x) * easeT;
        this.player.position.z = this.transitionEndPlayerPos.z;
        
        const lookAtY = 2;
        this.camera.lookAt(this.player.position.x, lookAtY, this.player.position.z + 10);
        
        this.playerZ = 0;
        
        if (progress >= 1) {
            this.isTransitioning = false;
            this.isPlayingCG = false;
            this.showHUD();
            this.spawnInitialCoins();
        }
    }
    
    spawnInitialCoins() {
        for (let i = 0; i < 8; i++) {
            const zPos = 30 + i * 15;
            const track = Math.floor(Math.random() * this.NUM_TRACKS);
            const xPos = (track - 1) * this.TRACK_WIDTH;
            const isHigh = Math.random() < 0.35;
            this.createCoin(xPos, zPos, isHigh);
        }
    }
    
    updateGameOverUI() {
        if (!this.gameOverStartTime) return;
        
        const elapsed = (performance.now() - this.gameOverStartTime) / 1000;
        const t = Math.min(1, elapsed / this.gameOverAnimDuration);
        
        if (t < 1.0 && this.gameOverCanvasTexture && this.gameOverCtx) {
            const easeOutBack = (t) => {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            };
            
            const scale = 0.4 + easeOutBack(t) * 0.6;
            const alpha = Math.min(1, t * 1.5);
            
            let shakeX = 0, shakeY = 0;
            if (t < 0.25) {
                const intensity = (1 - t / 0.25) * 12;
                shakeX = (Math.random() - 0.5) * intensity;
                shakeY = (Math.random() - 0.5) * intensity;
            }
            
            this.drawGameOverCanvas(alpha, scale, { x: shakeX, y: shakeY });
            this.gameOverCanvasTexture.needsUpdate = true;
        }
    }
    
    drawGameOverCanvas(alpha = 1, scale = 1, shakeOffset = { x: 0, y: 0 }) {
        if (!this.gameOverCtx || !this.gameOverCanvas) return;
        
        const ctx = this.gameOverCtx;
        const canvas = this.gameOverCanvas;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(canvas.width / 2 + shakeOffset.x, 80 + shakeOffset.y);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.font = 'bold 52px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.fillText('GAME OVER', 0, 0);
        
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeText('GAME OVER', 0, 0);
        ctx.restore();
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Final Score: ${Math.floor(this.score)}`, canvas.width / 2, 160);
        
        const blinkAlpha = alpha * (0.5 + Math.sin(Date.now() * 0.005) * 0.5);
        ctx.fillStyle = `rgba(0, 255, 0, ${blinkAlpha})`;
        ctx.font = '24px Arial';
        ctx.fillText('Press ENTER to restart', canvas.width / 2, 220);
        
        ctx.shadowBlur = 0;
    }
    
    gameOver() {
        if (this.isGameOver) return;
        
        console.log('Game Over - Playing over animation');
        
        this.isGameOver = true;
        this.hideHUD();
        
        this.playAudio('assets/manba out.mp3');
        
        if (this.player) {
            this.gameOverStartY = this.player.position.y;
            this.gameOverVelocityY = 0;
            this.gameOverGravity = 15;
        }
        
        if (this.animations && this.animations['over']) {
            console.log('Found over animation, playing...');
            
            if (this.animations['sprint']) this.animations['sprint'].stop();
            if (this.animations['cross']) this.animations['cross'].stop();
            if (this.animations['sliding_tackle']) this.animations['sliding_tackle'].stop();
            
            const overAction = this.animations['over'];
            overAction.reset();
            overAction.setLoop(THREE.LoopOnce);
            overAction.clampWhenFinished = true;
            overAction.play();
            this.chaserAnimations['o_attack_1'].reset();
            this.chaserAnimations['o_attack_1'].play();
        } else {
            console.warn('over animation not found! Available:', this.animations ? Object.keys(this.animations) : 'none');
        }
        
        if (this._onKeyDown) {
            window.removeEventListener('keydown', this._onKeyDown);
        }
        if (this._onKeyUp) {
            window.removeEventListener('keyup', this._onKeyUp);
        }
        
        this.gameOverCanvas = document.createElement('canvas');
        this.gameOverCanvas.width = 512;
        this.gameOverCanvas.height = 256;
        this.gameOverCtx = this.gameOverCanvas.getContext('2d');
        
        this.drawGameOverCanvas();
        this.gameOverCanvasTexture = new THREE.CanvasTexture(this.gameOverCanvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: this.gameOverCanvasTexture, transparent: true, depthTest: false });
        this.gameOverSprite = new THREE.Sprite(spriteMaterial);
        
        if (this.camera) {
            this.gameOverSprite.position.copy(this.camera.position);
            this.gameOverSprite.position.z += 6;
            this.gameOverSprite.position.y += 1;
        } else {
            this.gameOverSprite.position.set(0, 3, 5);
        }
        this.gameOverSprite.scale.set(8, 4, 1);
        this.scene.add(this.gameOverSprite);
        
        this.gameOverStartTime = performance.now();
        
        this._onRestart = (e) => {
            if (e.code === 'Enter') {
                window.removeEventListener('keydown', this._onRestart);
                this.game.enterRunGame();
            }
        };
        window.addEventListener('keydown', this._onRestart);
    }
    
    onResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }
    
    destroy() {
        this.hideHUD();
        
        if (this._onKeyDown) {
            window.removeEventListener('keydown', this._onKeyDown);
        }
        if (this._onKeyUp) {
            window.removeEventListener('keyup', this._onKeyUp);
        }
        if (this._onRestart) {
            window.removeEventListener('keydown', this._onRestart);
        }
        
        this.obstacles.forEach((obstacle) => {
            this.scene.remove(obstacle);
            if (obstacle.geometry) obstacle.geometry.dispose();
            if (obstacle.material) obstacle.material.dispose();
        });
        
        this.trackSegments.forEach(tracks => {
            tracks.forEach(track => {
                this.scene.remove(track);
                if (track.geometry) track.geometry.dispose();
                if (track.material) track.material.dispose();
            });
        });
        
        this.buildings.forEach(building => {
            this.scene.remove(building);
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
        
        if (this.player) {
            this.scene.remove(this.player);
        }
        
        if (this.gameOverSprite) {
            this.scene.remove(this.gameOverSprite);
            if (this.gameOverSprite.material && this.gameOverSprite.material.map) {
                this.gameOverSprite.material.map.dispose();
            }
            if (this.gameOverSprite.material) {
                this.gameOverSprite.material.dispose();
            }
        }
        
        if (this.scoreSprite) {
            this.scene.remove(this.scoreSprite);
            if (this.scoreSprite.material && this.scoreSprite.material.map) {
                this.scoreSprite.material.map.dispose();
            }
            if (this.scoreSprite.material) {
                this.scoreSprite.material.dispose();
            }
        }
        
        // 清理所有贴图
        this.textureCache.forEach(texture => {
            if (texture) texture.dispose();
        });
        this.textureCache = [];
        
        this.obstacles = [];
        this.trackSegments = [];
        this.buildings = [];
        this.isGameOver = true;
    }
}