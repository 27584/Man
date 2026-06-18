import Utils from './utils.js';
/**
 * MainScene中的Camera
 */
class Camera {
    constructor(camera) {
        this.camera = camera;
        this.distance = 10;
        this.height = 5;
        this.angleX = 0;
        this.angleY = 0.3;
        this.target = null;
        this.isPointerLocked = false;
    }

    setTarget(target) {
        this.target = target;
    }

    setupControls(canvas) {
        document.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.angleX -= e.movementX * 0.002;
                this.angleY += e.movementY * 0.002;
                this.angleY = Utils.clamp(this.angleY, 0.1, 1.2);
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === canvas;
            if (this.isPointerLocked) {
                document.getElementById('title').style.display = 'none';
                document.getElementById('subtitle').style.display = 'none';
                document.getElementById('hud').style.display = 'block';
            } else {
                document.getElementById('hud').style.display = 'none';
            }
        });

        canvas.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                try {
                    canvas.requestPointerLock();
                } catch (error) {
                    console.warn('Pointer lock request failed:', error.message);
                }
            }
        });
    }

    update() {
        if (!this.target) return;

        const targetPos = this.target.clone();
        targetPos.y += 2;

        const cameraX = targetPos.x + Math.sin(this.angleX) * this.distance * Math.cos(this.angleY);
        const cameraY = targetPos.y + Math.sin(this.angleY) * this.distance;
        const cameraZ = targetPos.z + Math.cos(this.angleX) * this.distance * Math.cos(this.angleY);

        this.camera.position.set(cameraX, cameraY, cameraZ);
        this.camera.lookAt(targetPos);
    }

    getAngleX() {
        return this.angleX;
    }

    isLocked() {
        return this.isPointerLocked;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}

export default Camera;