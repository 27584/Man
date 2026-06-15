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
        
        // 显示加载 UI
        this.showLoadingUI();
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
        
        // 隐藏加载 UI
        this.hideLoadingUI();
    }
    
    // 显示加载 UI
    showLoadingUI() {
        const loading = document.getElementById('runGameLoading');
        if (loading) {
            loading.classList.add('active');
        }
    }

    // 隐藏加载 UI
    hideLoadingUI() {
        const loading = document.getElementById('runGameLoading');
        if (loading) {
            loading.classList.remove('active');
        }
    }

    showHUD() {
        const runHud = document.getElementById('run_hud');
        const runHudMobile = document.getElementById('run_hud_mobile');
        const mainHud = document.getElementById('hud');
        const mainHudMobile = document.getElementById('hud-mobile');
        const titleDiv = document.getElementById('title');
        const subtitleDiv = document.getElementById('subtitle');
        
        if (titleDiv) titleDiv.style.display = 'none';
        if (subtitleDiv) subtitleDiv.style.display = 'none';
        
        if (this.isMobile()) {
            // 移动端显示触摸操作提示
            if (runHud) runHud.style.display = 'none';
            if (runHudMobile) runHudMobile.style.display = 'block';
            if (mainHud) mainHud.style.display = 'none';
            if (mainHudMobile) mainHudMobile.style.display = 'none';
        } else {
            // 桌面端显示键盘操作提示
            if (runHud) runHud.style.display = 'block';
            if (runHudMobile) runHudMobile.style.display = 'none';
            if (mainHud) mainHud.style.display = 'none';
            if (mainHudMobile) mainHudMobile.style.display = 'none';
        }
        
        if (this.scoreElement) this.scoreElement.style.display = 'block';
    }
    
    hideHUD() {
        const runHud = document.getElementById('run_hud');
        const runHudMobile = document.getElementById('run_hud_mobile');
        const mainHud = document.getElementById('hud');
        const mainHudMobile = document.getElementById('hud-mobile');
        
        if (runHud) runHud.style.display = 'none';
        if (runHudMobile) runHudMobile.style.display = 'none';
        if (this.scoreElement) this.scoreElement.style.display = 'none';
        if (mainHud) mainHud.style.display = 'none';
        if (mainHudMobile) mainHudMobile.style.display = 'none';
        const runButton = document.getElementById('runButton');
        if (runButton) runButton.style.display = 'none';
    }
    
    isMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /(android|iphone|ipad|ipod|blackberry|iemobile|opera mini)/i.test(userAgent) ||
               (navigator.maxTouchPoints > 0 && navigator.userAgent.indexOf('Mac') === -1);
    }
    
    showMobileRunButton() {
        const runButton = document.getElementById('runButton');
        if (!runButton) return;
        
        if (this.isMobile()) {
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
        this.scoreElement.textContent = ' 0';
        document.body.appendChild(this.scoreElement);
    }
    
    updateScore() {
        if (this.scoreElement) {
            this.scoreElement.textContent = `${Math.floor(this.score)}`;
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
    
    // 上传分数方法
    async uploadScore(nickname) {
        if (this.isUploadingScore) return;
        this.isUploadingScore = true;
        this.hideNicknameModal();
        if (this.uploadScoreBtn) {
            this.uploadScoreBtn.disabled = true;
            this.uploadScoreBtn.textContent = "上传中...";
        }

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
            this.showToast(data.message || "分数上传成功！", "success");
        } catch (err) {
            console.error(err);
            this.showToast("上传失败：" + err.message, "error");
        } finally {
            this.isUploadingScore = false;
            if (this.uploadScoreBtn) {
                this.uploadScoreBtn.disabled = false;
                this.uploadScoreBtn.textContent = "上传我的分数";
            }
        }
    }
    
    // 显示昵称输入弹窗
    showNicknameModal() {
        const modal = document.getElementById('nicknameModal');
        const input = document.getElementById('nicknameInput');
        if (modal && input) {
            input.value = '';
            input.focus();
            modal.classList.add('active');
        }
        
        const submitBtn = document.getElementById('submitNickname');
        const cancelBtn = document.getElementById('cancelNickname');
        
        if (submitBtn) {
            submitBtn.onclick = () => {
                const nick = input.value.trim();
                if (nick) {
                    this.uploadScore(nick);
                }
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.hideNicknameModal();
            };
        }
    }
    
    // 隐藏昵称输入弹窗
    hideNicknameModal() {
        const modal = document.getElementById('nicknameModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    // 显示提示消息
    showToast(message, type = 'info') {
        const toast = document.getElementById('toastMessage');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast-message active ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
    
    // 显示 GAMEOVER UI
    showGameOverUI() {
        const overlay = document.getElementById('gameOverOverlay');
        const scoreElement = document.getElementById('gameOverScore');
        
        if (scoreElement) {
            scoreElement.textContent = Math.floor(this.score);
        }
        
        if (overlay) {
            overlay.classList.add('active');
        }
    }
    
    // 隐藏 GAMEOVER UI
    hideGameOverUI() {
        const overlay = document.getElementById('gameOverOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
    
    gameOver() {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        this.hideHUD();
        
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
        
        this.gameOverStartTime = performance.now();
        
        this.showGameOverUI();

        // 绑定按钮点击事件
        const restartBtn = document.getElementById('restartBtn');
        const backToMenuBtn = document.getElementById('backToMenuBtn');
        
        if (restartBtn) {
            restartBtn.onclick = () => {
                this.game.enterRunGame();
            };
        }
        
        if (backToMenuBtn) {
            backToMenuBtn.onclick = () => {
                this.game.returnToMainMenu();
            };
        }

        if (!this.uploadScoreBtn) {
            this.uploadScoreBtn = document.getElementById('uploadScoreBtn');
            if (this.uploadScoreBtn) {
                this.uploadScoreBtn.onclick = () => {
                    this.showNicknameModal();
                };
            }
        }
        if (this.uploadScoreBtn) {
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
        this.hideGameOverUI();
        
        if (this.player && this.player.removeInputListeners) {
            this.player.removeInputListeners();
        }
        
        if (this._onRestart) {
            window.removeEventListener('keydown', this._onRestart);
        }

        // 隐藏上传按钮
        if (this.uploadScoreBtn) {
            this.uploadScoreBtn.style.display = "none";
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