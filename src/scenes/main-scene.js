import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

import Camera from '../core/camera.js';
import Player from '../core/player.js';
import Portal from '../entities/portal.js';
import LeaderboardManager from '../managers/leaderboard.js';
import { VERSION_DATA } from '../version.js';

class MainScene {
    static GROUND_Y = 0;

    constructor(game) {
        this.game = game;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.clock = new THREE.Clock();
        this.ground = null;
        this.walls = [];
        this.portal = null;
        this.isInitialized = false;
        this.versionData = null;

        this.showHUD();
        this.loadVersionData();
        this.leaderboardManager = new LeaderboardManager();
        this.bindGithubEvents();
        this.bindChangelogEvents();
    }

    // 绑定 GitHub 按钮事件
    bindGithubEvents() {
        const githubBtn = document.getElementById('githubBtn');
        if (!githubBtn) return;
        
        githubBtn.addEventListener('click', () => {
            window.open('https://github.com/27584/Man', '_blank');
        });
    }

    // 加载版本信息
    loadVersionData() {
        this.versionData = VERSION_DATA;
        
        const version = this.versionData.version || 'v1.0.0';
        
        // 更新浏览器标签页标题
        document.title = `Man! ${version}`;
        
        // 更新版本号显示
        const versionElement = document.getElementById('version');
        if (versionElement) {
            versionElement.textContent = version;
        }
    }

    // 绑定更新日志按钮事件
    bindChangelogEvents() {
        const btn = document.getElementById('changelogBtn');
        const modal = document.getElementById('changelogModal');
        const closeBtn = document.getElementById('closeChangelog');
        const content = document.getElementById('changelogContent');

        if (!btn || !modal || !closeBtn || !content) return;

        btn.addEventListener('click', () => {
            modal.classList.add('active');
            
            if (this.versionData && this.versionData.changelog) {
                let html = '';
                this.versionData.changelog.forEach((entry) => {
                    html += `
                        <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size: 18px; font-weight: 700; color: var(--primary-color); margin-bottom: 8px;">
                                ${entry.version}
                            </div>
                            <div style="font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 12px;">
                                ${entry.date}
                            </div>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                    `;
                    entry.changes.forEach((change) => {
                        html += `<li style="font-size: 14px; color: var(--light-text); margin: 6px 0; padding-left: 16px; position: relative;">
                            <span style="position: absolute; left: 0; color: var(--secondary-color);">•</span>
                            ${change}
                        </li>`;
                    });
                    html += '</ul></div>';
                });
                content.innerHTML = html;
            } else {
                content.innerHTML = '<p style="color: rgba(255,255,255,0.6);">加载失败</p>';
            }
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.loadSkybox();
        this.createGround();
        this.createWalls();
        this.createLights();
        this.createPortal();
        this.loadPlayer();
        this.isInitialized = true;
    }

    showHUD() {
        const titleDiv = document.getElementById('title');
        const subtitleDiv = document.getElementById('subtitle');
        if (titleDiv) titleDiv.style.display = 'none';
        if (subtitleDiv) subtitleDiv.style.display = 'none';

        const mainHud = document.getElementById('hud');
        const runHud = document.getElementById('run_hud');
        const runHudMobile = document.getElementById('run_hud_mobile');
        
        if (this.isMobile()) {
            // 移动端隐藏所有 HUD
            if (mainHud) mainHud.style.display = 'none';
            if (runHud) runHud.style.display = 'none';
            if (runHudMobile) runHudMobile.style.display = 'none';
        } else {
            // 桌面端显示键盘操作提示
            if (mainHud) mainHud.style.display = 'block';
            if (runHud) runHud.style.display = 'none';
            if (runHudMobile) runHudMobile.style.display = 'none';
        }
        
        this.setupMobileRunButton();
    }
    
    isMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /(android|iphone|ipad|ipod|blackberry|iemobile|opera mini)/i.test(userAgent) ||
               (navigator.maxTouchPoints > 0 && navigator.userAgent.indexOf('Mac') === -1);
    }
    
    setupMobileRunButton() {
        const runButton = document.getElementById('runButton');
        if (!runButton) return;
        
        if (this.isMobile()) {
            runButton.style.display = 'block';
            runButton.onclick = () => {
                this.game.enterRunGame();
            };
        } else {
            runButton.style.display = 'none';
        }
    }

    hideHUD() {
        const mainHud = document.getElementById('hud');
        if (mainHud) mainHud.style.display = 'none';
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
    }

    setupCamera() {
        const threeCamera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera = new Camera(threeCamera);
        this.camera.setupControls(this.game.canvas);
    }

    loadSkybox() {
        const loader = new THREE.TextureLoader();
        loader.load('assets/textures/skybox.png', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            this.scene.background = texture;
        });
    }

    createGround() {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.1
        });
        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = MainScene.GROUND_Y;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        const gridHelper = new THREE.GridHelper(100, 50, 0x666666, 0x444444);
        gridHelper.position.y = MainScene.GROUND_Y + 0.01;
        this.scene.add(gridHelper);
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });

        const wallThickness = 0.1;
        const wallHeight = 20;

        const walls = [
            { position: [0, wallHeight / 2, -50], scale: [100, wallHeight, wallThickness] },
            { position: [0, wallHeight / 2, 50], scale: [100, wallHeight, wallThickness] },
            { position: [-50, wallHeight / 2, 0], scale: [wallThickness, wallHeight, 100] },
            { position: [50, wallHeight / 2, 0], scale: [wallThickness, wallHeight, 100] }
        ];

        walls.forEach((wallConfig) => {
            const geometry = new THREE.BoxGeometry(...wallConfig.scale);
            const wall = new THREE.Mesh(geometry, wallMaterial);
            wall.position.set(...wallConfig.position);
            wall.name = 'wall';
            this.scene.add(wall);
            this.walls.push(wall);
        });
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        this.scene.add(directionalLight);
    }

    createPortal() {
        this.portal = new Portal(this.scene, new THREE.Vector3(20, MainScene.GROUND_Y, 20), () => {
            this.game.enterRunGame();
        });
    }

    loadPlayer() {
        this.player = new Player(this.scene);
        this.player.load().then(() => {
            this.player.setCamera(this.camera);
            this.camera.setTarget(this.player.getPosition());
            this.game.camera = this.camera.camera;
        });
    }

    update(deltaTime) {
        if (!this.isInitialized) return;

        if (this.player) {
            this.player.update(deltaTime);
        }

        if (this.camera && this.player && this.player.isLoaded) {
            this.camera.setTarget(this.player.getPosition());
            this.camera.update();
        }

        if (this.portal && this.player && this.player.isLoaded) {
            this.portal.update(deltaTime);
            if (this.portal.checkCollision(this.player.getPosition())) {
                this.portal.onEnter();
            }
        }
    }

    onResize() {
        if (!this.camera) return;
        this.camera.onResize();
    }

    destroy() {
        this.hideHUD();
        if (this.player) this.player.destroy();
        if (this.portal) this.portal.destroy();
        this.scene = null;
        this.camera = null;
        this.isInitialized = false;
    }
}

export default MainScene;