import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

import Camera from '../core/camera.js';
import Player from '../core/player.js';
import Portal from '../entities/portal.js';

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

        this.showHUD();
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
        if (mainHud) mainHud.style.display = 'block';
        if (runHud) runHud.style.display = 'none';
        
        this.setupMobileRunButton();
    }
    
    isAndroid() {
        return /Android/i.test(navigator.userAgent);
    }
    
    setupMobileRunButton() {
        const runButton = document.getElementById('runButton');
        if (!runButton) return;
        
        if (this.isAndroid()) {
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