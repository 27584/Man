class Utils {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // 角度插值，处理跨越2π边界的情况
    static lerpAngle(current, target, t) {
        let diff = target - current;
        
        // 将差值规范化到[-π, π]范围
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        return current + diff * t;
    }

    static normalizeVector(x, y, z) {
        const length = Math.sqrt(x * x + y * y + z * z);
        if (length === 0) return { x: 0, y: 0, z: 0 };
        return { x: x / length, y: y / length, z: z / length };
    }

    static degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    static radToDeg(radians) {
        return radians * (180 / Math.PI);
    }
}
