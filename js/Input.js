export class Input {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    isKeyPressed(key) {
        return this.keys[key] || false;
    }

    getMovement() {
        const move = { x: 0, z: 0 };
        
        if (this.isKeyPressed('KeyW')) move.z -= 1;
        if (this.isKeyPressed('KeyS')) move.z += 1;
        if (this.isKeyPressed('KeyA')) move.x -= 1;
        if (this.isKeyPressed('KeyD')) move.x += 1;

        const length = Math.sqrt(move.x * move.x + move.z * move.z);
        if (length > 0) {
            move.x /= length;
            move.z /= length;
        }

        return move;
    }

    isSprinting() {
        return this.isKeyPressed('ShiftLeft') || this.isKeyPressed('ShiftRight');
    }

    isJumping() {
        return this.isKeyPressed('Space');
    }
}