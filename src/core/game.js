import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import MainScene from '../scenes/main-scene.js';
import RunGameScene from '../scenes/run-game-scene.js';

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isRunning = false;
        this.lastTime = 0;
        this.setupCanvas();
        this.setupRenderer();
        this.start();
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            if (this.renderer) {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
            if (this.scene && this.scene.onResize) {
                this.scene.onResize();
            }
        });
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    start() {
        this.scene = new MainScene(this);
        this.scene.init();
        this.isRunning = true;
        this.gameLoop(0);
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (this.scene) {
            this.scene.update(deltaTime);
            this.render();
        }

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    render() {
        if (!this.renderer || !this.scene) return;
        
        const threeScene = this.scene.scene || this.scene;
        let camera = this.camera;
        
        if (!camera && this.scene.camera) {
            if (this.scene.camera.camera) {
                camera = this.scene.camera.camera;
            } else {
                camera = this.scene.camera;
            }
        }
        
        if (!camera) return;
        
        this.renderer.render(threeScene, camera);
    }

    enterRunGame() {
        if (this.scene && typeof this.scene.destroy === 'function') {
            this.scene.destroy();
        }
        this.scene = new RunGameScene(this);
        this.scene.init();
    }

    returnToMainMenu() {
        if (this.scene && typeof this.scene.destroy === 'function') {
            this.scene.destroy();
        }
        this.scene = new MainScene(this);
        this.scene.init();
    }

    destroy() {
        this.isRunning = false;
        if (this.scene) {
            this.scene.destroy();
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

export default Game;