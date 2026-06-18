class GestureService {
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.hands = null;
        
        this.lastX = null;
        this.lastY = null;
        this.lastTime = 0;
        this.swipeThreshold = 40;
        this.swipeCooldown = 400;
        this.lastSwipeTime = 0;
        
        this.onSwipeLeft = null;
        this.onSwipeRight = null;
        this.onSwipeUp = null;
        this.onSwipeDown = null;
        
        this.isGestureMode = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            await this.loadMediaPipe();
            
            this.videoElement = document.createElement('video');
            this.videoElement.style.display = 'none';
            this.videoElement.autoplay = true;
            this.videoElement.muted = true;
            this.videoElement.playsInline = true;
            document.body.appendChild(this.videoElement);
            
            this.canvasElement = document.createElement('canvas');
            this.canvasElement.style.position = 'fixed';
            this.canvasElement.style.bottom = '20px';
            this.canvasElement.style.left = '20px';
            this.canvasElement.style.width = '120px';
            this.canvasElement.style.height = '90px';
            this.canvasElement.style.border = '2px solid #00ffff';
            this.canvasElement.style.borderRadius = '8px';
            this.canvasElement.style.zIndex = '200';
            this.canvasElement.style.display = 'none';
            this.canvasCtx = this.canvasElement.getContext('2d');
            document.body.appendChild(this.canvasElement);
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize GestureService:', error);
            throw error;
        }
    }
    
    async loadMediaPipe() {
        return new Promise((resolve, reject) => {
            if (window.Hands) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load MediaPipe Hands'));
            document.head.appendChild(script);
        });
    }
    
    async start() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (this.isRunning) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            
            this.videoElement.srcObject = stream;
            await new Promise(resolve => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    this.canvasElement.width = this.videoElement.videoWidth;
                    this.canvasElement.height = this.videoElement.videoHeight;
                    resolve();
                };
            });
            
            this.hands = new Hands({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }});
            
            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.hands.onResults(this.onResults.bind(this));
            
            this.isRunning = true;
            this.isGestureMode = true;
            this.canvasElement.style.display = 'block';
            
            this.lastX = null;
            this.lastY = null;
            
            this.detectLoop();
            
        } catch (error) {
            console.error('Failed to start gesture capture:', error);
            throw error;
        }
    }
    
    async stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.isGestureMode = false;
        
        if (this.videoElement && this.videoElement.srcObject) {
            const stream = this.videoElement.srcObject;
            stream.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        
        if (this.hands) {
            this.hands.close();
            this.hands = null;
        }
        
        this.canvasElement.style.display = 'none';
    }
    
    async detectLoop() {
        if (!this.isRunning || !this.videoElement) return;
        
        try {
            await this.hands.send({image: this.videoElement});
        } catch (error) {
            console.warn('Gesture detection error:', error);
        }
        
        if (this.isRunning) {
            requestAnimationFrame(this.detectLoop.bind(this));
        }
    }
    
    onResults(results) {
        if (!this.canvasCtx || !results) return;
        
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        this.canvasCtx.drawImage(
            results.image, 0, 0, this.canvasElement.width, this.canvasElement.height
        );
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            this.canvasCtx.fillStyle = '#00ffff';
            this.canvasCtx.strokeStyle = '#00ffff';
            this.canvasCtx.lineWidth = 2;
            
            for (const landmark of landmarks) {
                const x = landmark.x * this.canvasElement.width;
                const y = landmark.y * this.canvasElement.height;
                
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
                this.canvasCtx.fill();
            }
            
            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4],
                [0, 5], [5, 6], [6, 7], [7, 8],
                [0, 9], [9, 10], [10, 11], [11, 12],
                [0, 13], [13, 14], [14, 15], [15, 16],
                [0, 17], [17, 18], [18, 19], [19, 20],
                [5, 9], [9, 13], [13, 17]
            ];
            
            for (const [startIdx, endIdx] of connections) {
                const start = landmarks[startIdx];
                const end = landmarks[endIdx];
                
                this.canvasCtx.beginPath();
                this.canvasCtx.moveTo(start.x * this.canvasElement.width, start.y * this.canvasElement.height);
                this.canvasCtx.lineTo(end.x * this.canvasElement.width, end.y * this.canvasElement.height);
                this.canvasCtx.stroke();
            }
            
            this.detectSwipe(landmarks);
        } else {
            this.lastX = null;
            this.lastY = null;
        }
        
        this.canvasCtx.restore();
    }
    
    detectSwipe(landmarks) {
        const currentTime = performance.now();
        
        if (currentTime - this.lastSwipeTime < this.swipeCooldown) return;
        
        const indexTip = landmarks[8];
        const currentX = indexTip.x * this.canvasElement.width;
        const currentY = indexTip.y * this.canvasElement.height;
        
        if (this.lastX === null || this.lastY === null) {
            this.lastX = currentX;
            this.lastY = currentY;
            this.lastTime = currentTime;
            return;
        }
        
        const deltaX = currentX - this.lastX;
        const deltaY = currentY - this.lastY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (Math.max(absDeltaX, absDeltaY) > this.swipeThreshold) {
            if (absDeltaX > absDeltaY) {
                if (deltaX > 0) {
                    this.triggerSwipeLeft();
                } else {
                    this.triggerSwipeRight();
                }
            } else {
                if (deltaY > 0) {
                    this.triggerSwipeDown();
                } else {
                    this.triggerSwipeUp();
                }
            }
            
            this.lastSwipeTime = currentTime;
        }
        
        this.lastX = currentX;
        this.lastY = currentY;
        this.lastTime = currentTime;
    }
    
    triggerSwipeLeft() {
        if (this.onSwipeLeft) {
            this.onSwipeLeft();
        }
    }
    
    triggerSwipeRight() {
        if (this.onSwipeRight) {
            this.onSwipeRight();
        }
    }
    
    triggerSwipeUp() {
        if (this.onSwipeUp) {
            this.onSwipeUp();
        }
    }
    
    triggerSwipeDown() {
        if (this.onSwipeDown) {
            this.onSwipeDown();
        }
    }
    
    setCallbacks(callbacks) {
        if (callbacks.onSwipeLeft) this.onSwipeLeft = callbacks.onSwipeLeft;
        if (callbacks.onSwipeRight) this.onSwipeRight = callbacks.onSwipeRight;
        if (callbacks.onSwipeUp) this.onSwipeUp = callbacks.onSwipeUp;
        if (callbacks.onSwipeDown) this.onSwipeDown = callbacks.onSwipeDown;
    }
    
    destroy() {
        this.stop();
        
        if (this.videoElement && this.videoElement.parentNode) {
            this.videoElement.parentNode.removeChild(this.videoElement);
            this.videoElement = null;
        }
        
        if (this.canvasElement && this.canvasElement.parentNode) {
            this.canvasElement.parentNode.removeChild(this.canvasElement);
            this.canvasElement = null;
        }
        
        this.isInitialized = false;
    }
}

export default GestureService;