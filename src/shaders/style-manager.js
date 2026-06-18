import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

class StyleManager {
    constructor() {
        const savedStyle = localStorage.getItem('game_style');
        this.currentStyle = savedStyle && styleConfigs[savedStyle] ? savedStyle : 'default';
        this.composer = null;
        this.shaderPass = null;
        this.clock = new THREE.Clock();
    }

    initComposer(renderer, scene, camera) {
        this.composer = new EffectComposer(renderer);
        this.composer.addPass(new RenderPass(scene, camera));
    }

    setStyle(styleName) {
        if (styleConfigs[styleName]) {
            this.currentStyle = styleName;
            localStorage.setItem('game_style', styleName);
            this.applyCurrentStyle();
            this.applyUIStyle(styleName);
        }
    }

    applyUIStyle(styleName) {
        const uiElements = document.querySelectorAll('#ui, #actionButtons, #settingsModal');
        uiElements.forEach(el => {
            el.classList.remove('style-toon', 'style-cel', 'style-sketch', 'style-sketch2', 'style-cyberpunk', 'style-sepia', 'style-neon', 'style-invert', 'style-grayscale');
            if (styleConfigs[styleName] && styleConfigs[styleName].uiClass) {
                el.classList.add(styleConfigs[styleName].uiClass);
            }
        });
    }

    applyCurrentStyle() {
        if (!this.composer) return;

        if (this.shaderPass) {
            this.composer.removePass(this.shaderPass);
            this.shaderPass.dispose();
            this.shaderPass = null;
        }

        const config = styleConfigs[this.currentStyle];
        if (config && config.shader) {
            this.shaderPass = new ShaderPass(config.shader);
            this.composer.addPass(this.shaderPass);
        }
    }

    update() {
        if (this.shaderPass && this.shaderPass.uniforms && this.shaderPass.uniforms.uTime) {
            this.shaderPass.uniforms.uTime.value = this.clock.getElapsedTime();
        }
    }

    render() {
        if (this.composer) {
            this.composer.render();
            return true;
        }
        return false;
    }

    getAvailableStyles() {
        return Object.keys(styleConfigs).map(key => ({
            id: key,
            name: styleConfigs[key].name
        }));
    }

    getCurrentStyle() {
        return styleConfigs[this.currentStyle];
    }
    
    getStyleConfig(styleId) {
        return styleConfigs[styleId] || null;
    }
}

const styleConfigs = {
    default: {
        name: '默认',
        shader: null,
        uiClass: '',
        preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    toon: {
        name: '卡通',
        uiClass: 'style-toon',
        preview: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null },
                uLevels: { value: 4.0 },
                uBrightness: { value: 1.1 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uLevels;
                uniform float uBrightness;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float stepSize = 1.0 / uLevels;
                    vec3 cartoon = floor(color.rgb / stepSize) * stepSize;
                    gl_FragColor = vec4(cartoon * uBrightness, color.a);
                }
            `
        },
    },
    cel: {
        name: '赛璐珞',
        uiClass: 'style-cel',
        preview: 'linear-gradient(135deg, #00d2d3 0%, #54e346 33%, #ff9f43 66%, #ee5a24 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null },
                uLevels: { value: 4.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uLevels;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float stepSize = 1.0 / uLevels;
                    vec3 cel = floor(color.rgb / stepSize + 0.5) * stepSize + stepSize * 0.5;
                    gl_FragColor = vec4(cel, color.a);
                }
            `
        }
    },
    sketch: {
        name: '手绘',
        uiClass: 'style-sketch',
        preview: 'linear-gradient(135deg, #f5f5f5 0%, #d4d4d4 50%, #8b8b8b 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null },
                uEdgeThreshold: { value: 0.7 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uEdgeThreshold;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    vec3 result = color.rgb;
                    
                    float edge = abs(color.r - texture2D(tDiffuse, vUv + vec2(0.003, 0)).r);
                    edge += abs(color.g - texture2D(tDiffuse, vUv + vec2(0.003, 0)).g);
                    edge += abs(color.b - texture2D(tDiffuse, vUv + vec2(0.003, 0)).b);
                    
                    if (edge > uEdgeThreshold) {
                        result = vec3(0.0);
                    }
                    
                    gl_FragColor = vec4(result, color.a);
                }
            `
        }
    },
    sketch2: {
        name: '素描',
        uiClass: 'style-sketch2',
        preview: 'linear-gradient(135deg, #e8dcc4 0%, #c4b8a4 50%, #4a4a4a 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0 },
                uNoiseIntensity: { value: 0.03 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uTime;
                uniform float uNoiseIntensity;
                varying vec2 vUv;
                
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    
                    vec3 paperColor = vec3(0.96, 0.93, 0.88);
                    vec3 result = mix(paperColor, color.rgb, smoothstep(0.05, 0.15, length(color.rgb)));
                    
                    float n = random(vUv * 100.0 + uTime * 0.2) * uNoiseIntensity;
                    result += n;
                    
                    float edge = abs(color.r - texture2D(tDiffuse, vUv + vec2(0.005, 0)).r);
                    if (edge > 0.2) {
                        result = vec3(0.05);
                    }
                    
                    gl_FragColor = vec4(result, color.a);
                }
            `
        }
    },
    cyberpunk: {
        name: '赛博朋克',
        uiClass: 'style-cyberpunk',
        preview: 'linear-gradient(135deg, #0ff 0%, #f0f 50%, #00f 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0 },
                uScanlineSpeed: { value: 0.02 },
                uChromaticAberration: { value: 0.02 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uTime;
                uniform float uScanlineSpeed;
                uniform float uChromaticAberration;
                varying vec2 vUv;
                
                void main() {
                    vec2 offsetR = vec2(uChromaticAberration * sin(uTime), 0.0);
                    vec2 offsetB = vec2(uChromaticAberration * cos(uTime), 0.0);
                    
                    float r = texture2D(tDiffuse, vUv + offsetR).r;
                    float g = texture2D(tDiffuse, vUv).g;
                    float b = texture2D(tDiffuse, vUv + offsetB).b;
                    
                    float scanline = mod(gl_FragCoord.y * uScanlineSpeed + uTime, 1.0);
                    scanline = step(0.95, scanline) * 0.3;
                    
                    gl_FragColor = vec4(r + scanline, g + scanline * 0.5, b + scanline * 0.5, 1.0);
                }
            `
        }
    },
    sepia: {
        name: '复古',
        uiClass: 'style-sepia',
        preview: 'linear-gradient(135deg, #c9a86c 0%, #8b7355 50%, #654321 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                    vec3 sepia = vec3(0.769, 0.627, 0.478);
                    gl_FragColor = vec4(gray * sepia, color.a);
                }
            `
        }
    },
    neon: {
        name: '霓虹',
        uiClass: 'style-neon',
        preview: 'linear-gradient(135deg, #00ffaa 0%, #00ffff 50%, #ff00ff 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null },
                uIntensity: { value: 0.5 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uIntensity;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    vec3 edges = abs(color.rgb - texture2D(tDiffuse, vUv + vec2(0.01, 0)).rgb) +
                                 abs(color.rgb - texture2D(tDiffuse, vUv - vec2(0.01, 0)).rgb) +
                                 abs(color.rgb - texture2D(tDiffuse, vUv + vec2(0, 0.01)).rgb) +
                                 abs(color.rgb - texture2D(tDiffuse, vUv - vec2(0, 0.01)).rgb);
                    float edge = min(1.0, dot(edges, vec3(1.0)) * 3.0);
                    vec3 neon = vec3(0.5, 0.8, 1.0);
                    gl_FragColor = vec4(color.rgb + edge * neon * uIntensity, color.a);
                }
            `
        }
    },
    invert: {
        name: '反色',
        uiClass: 'style-invert',
        preview: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    gl_FragColor = vec4(1.0 - color.rgb, color.a);
                }
            `
        }
    },
    grayscale: {
        name: '黑白',
        uiClass: 'style-grayscale',
        preview: 'linear-gradient(135deg, #888 0%, #666 50%, #444 100%)',
        shader: {
            uniforms: {
                tDiffuse: { value: null }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                    gl_FragColor = vec4(vec3(gray), color.a);
                }
            `
        }
    }
};

export const styleManager = new StyleManager();
export default StyleManager;