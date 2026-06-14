import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import ObstacleGenerator from '../entities/obstacle-generator.js';
import CoinGenerator from '../entities/coin-generator.js';
import EnvironmentGenerator from '../entities/environment-generator.js';
import CGManager from '../managers/cg-manager.js';
import Chaser from '../entities/chaser.js';
import Player from '../entities/player.js';

class RunGameScene {
    constructor(game) {
        this.game = game;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.player = null;
        this.chaser = null;
        this.coinGenerator = null;
        this.gameSpeed = 12;
        this.score = 0;
        this.isGameOver = false;
        
        this.TRACK_WIDTH = 2.5;
        this.NUM_TRACKS = 3;
        this.PLAYER_START_TRACK = 1;
        this.targetTrack = this.PLAYER_START_TRACK;
        
        this.slideCooldown = 0;
        
        this.playerZ = 0;
        
        this.environmentGenerator = null;
        this.cgManager = null;
        
        this._onKeyDown = null;
        this._onKeyUp = null;
        this._onRestart = null;
        
        this.gameOverCanvas = null;
        this.gameOverCtx = null;
        this.gameOverCanvasTexture = null;
        this.gameOverStartTime = 0;
        this.gameOverAnimDuration = 1.2;
        
        this.gameOverStartY = 0;
        this.gameOverVelocityY = 0;
        this.gameOverGravity = 15;
        
        this.obstacleGenerator = new ObstacleGenerator(this);

        // 上传分数按钮相关
        this.uploadScoreBtn = null;
        this.isUploadingScore = false;
        this.SUPABASE_ANON_KEY = "sb_publishable_5GQK7A-LKm6QyGheeqYksA_S7FnMdFd";
        this.SUPABASE_FUNC_URL = "https://wshazyyuenmktoxzaxmx.supabase.co/functions/v1/score_rank";
    }
    
    init() {
        this.environmentGenerator = new EnvironmentGenerator(this);
        this.environmentGenerator.preloadTextures();
        this.environmentGenerator.loadSkybox();
        this.environmentGenerator.initInfiniteWorld();
        
        this.createCamera();
        
        this.cgManager = new CGManager(this);
        
        this.createLighting();
        this.createPlayer();
        this.createChaser();
        this.createUI();
        

        
        this.playerZ = 0;
        
        this.game.camera = this.camera;
        this.hideHUD();
        
        this.coinGenerator = new CoinGenerator(this);
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
        const runButton = document.getElementById('runButton');
        if (runButton) runButton.style.display = 'none';
    }
    
    isAndroid() {
        return /Android/i.test(navigator.userAgent);
    }
    
    showMobileRunButton() {
        const runButton = document.getElementById('runButton');
        if (!runButton) return;
        
        if (this.isAndroid()) {
            runButton.style.display = 'block';
            runButton.onclick = () => {
                this.game.enterRunGame();
            };
        }
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
    
    createPlayer() {
        this.player = new Player(this);
        this.player.load();
    }
    
    createChaser() {
        this.chaser = new Chaser(this);
        this.chaser.load();
    }
    
    playAudio(url, loop = false) {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported');
                return;
            }
        }
        
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
    
    updateGameSpeed(deltaTime) {
        if (this.isGameOver || this.cgManager.isPlaying()) return;
        
        const MAX_SPEED = 25;
        const ACCELERATION = 0.5;
        
        this.gameSpeed = Math.min(MAX_SPEED, this.gameSpeed + ACCELERATION * deltaTime);
    }
    
    endCG() {
        this.cgManager.endCG(this.playAudio.bind(this));
    }
    
    onTransitionComplete() {
        this.showHUD();
        this.obstacleGenerator.spawnInitialObstacles();
    }
    
    updateChaser(deltaTime) {
        if (this.chaser) {
            this.chaser.update(deltaTime, this.gameSpeed, this.playerZ, this.targetTrack, this.isGameOver);
        }
    }
    
    update(deltaTime) {
        const dt = Math.min(deltaTime, 0.1);
        
        if (this.cgManager.isPlaying()) {
            if (this.cgManager.isPlayingCG) {
                this.updateCG(dt);
            } else if (this.cgManager.isTransitioning) {
                this.cgManager.updateTransition(dt);
                this.playerZ = 0;
            }
            return;
        }
        
        if (this.isGameOver && this.gameOverSprite && this.gameOverCanvasTexture) {
            this.updateGameOverUI();
        }
        
        if (this.isGameOver && this.player && this.player.model) {
            
            this.gameOverVelocityY -= this.gameOverGravity * dt;
            this.player.model.position.y += this.gameOverVelocityY * dt;
            
            if (this.player.model.position.y <= 0.2) {
                this.player.model.position.y = 0.2;
                this.gameOverVelocityY = 0;
            }
           this.player.update(dt, this.gameSpeed, this.playerZ, this.isGameOver);
        this.updateChaser(dt);
        return;     
         
        }
        
        if (this.isGameOver) return;
        
        this.playerZ += this.gameSpeed * dt;
        
        if (this.environmentGenerator) {
            this.environmentGenerator.updateInfiniteWorld(this.playerZ);
        }
        
        
        
        this.obstacleGenerator.updateObstacles();
        this.updateGameSpeed(dt);
        this.obstacleGenerator.update(this.playerZ);
        this.updateChaser(dt);
        
        if (this.coinGenerator) {
            this.coinGenerator.update(dt);
        }
        
        if (this.player) {
            const result = this.player.update(dt, this.gameSpeed, this.playerZ, this.isGameOver);
            
            if (result.boostDistance > 0) {
                this.playerZ += result.boostDistance;
            }
            
            const playerPos = result.position;
            
            if (playerPos && this.camera && !this.isGameOver) {
                const camTargetX = playerPos.x;
                const camTargetZ = playerPos.z - 8;
                this.camera.position.x += (camTargetX - this.camera.position.x) * 8 * dt;
                this.camera.position.z += (camTargetZ - this.camera.position.z) * 8 * dt;
                this.camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z + 10);
                
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
        
        if (!this.player || !this.chaser) return;
        
        this.player.updateCG(dt);
        
        if (this.chaser) {
            this.chaser.updateCG(dt, this.player.model ? this.player.model.position : null);
        }
        
        if (this.cgManager) {
            this.cgManager.updateCG(dt);
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

    // 上传分数方法
    async uploadScore(nickname) {
        if (this.isUploadingScore) return;
        this.isUploadingScore = true;
        this.uploadScoreBtn.disabled = true;
        this.uploadScoreBtn.textContent = "上传中...";

        const finalScore = Math.floor(this.score);
        try {
            const res = await fetch(this.SUPABASE_FUNC_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ nickname, score: finalScore })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "上传失败");
            alert(data.message || "分数上传成功！");
        } catch (err) {
            console.error(err);
            alert("上传失败：" + err.message);
        } finally {
            this.isUploadingScore = false;
            if (this.uploadScoreBtn) {
                this.uploadScoreBtn.disabled = false;
                this.uploadScoreBtn.textContent = "上传我的分数";
            }
        }
    }
    
    gameOver() {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        this.hideHUD();
        
        this.showMobileRunButton();
        
        this.playAudio('assets/audio/manba-out.mp3');

        if (this.player && this.player.model) {

            this.gameOverStartY = this.player.model.position.y;
            this.gameOverVelocityY = 0;
            this.gameOverGravity = 15;
            this.player.playGameOverAnimation();
        }
        
        if (this.chaser) {
            this.chaser.playAttackAnimation();
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

        if (!this.uploadScoreBtn) {
            this.uploadScoreBtn = document.createElement("button");
            Object.assign(this.uploadScoreBtn.style, {
                position: "fixed",
                top: "20px",    
                left: "20px",  
                padding: "8px 14px",
                fontSize: "16px",
                zIndex: "9999",
                cursor: "pointer",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#222222",
                color: "#ffffff"
            });
            this.uploadScoreBtn.textContent = "上传我的分数";
            this.uploadScoreBtn.onclick = () => {
                const nick = prompt("请输入你的昵称：", "匿名玩家");
                if (!nick || nick.trim() === "") return;
                this.uploadScore(nick.trim());
            };
            document.body.appendChild(this.uploadScoreBtn);
        } else {
            this.uploadScoreBtn.style.display = "block";
        }
    }
    
    onResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }
    
    destroy() {
        this.hideHUD();
        
        if (this.player && this.player.removeInputListeners) {
            this.player.removeInputListeners();
        }
        
        if (this._onRestart) {
            window.removeEventListener('keydown', this._onRestart);
        }

        // 销毁上传按钮
        if (this.uploadScoreBtn) {
            this.uploadScoreBtn.remove();
            this.uploadScoreBtn = null;
        }
        
        this.obstacleGenerator.obstacles.forEach((obstacle) => {
            this.scene.remove(obstacle);
            if (obstacle.geometry) obstacle.geometry.dispose();
            if (obstacle.material) obstacle.material.dispose();
        });
        
        if (this.environmentGenerator) {
            this.environmentGenerator.reset();
        }
        
        if (this.cgManager) {
            this.cgManager.stop();
        }
        
        if (this.player && this.player.model) {
            this.scene.remove(this.player.model);
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
        
        this.obstacleGenerator.obstacles = [];
        this.isGameOver = true;
    }
}

export default RunGameScene;