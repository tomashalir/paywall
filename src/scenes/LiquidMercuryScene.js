import * as THREE from 'three';
import { BaseScene } from './BaseScene';

const MAX_METABALLS = 8;
const DEFAULT_METABALL_COUNT = 7;

function clamp01(value) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function createRenderTarget(width, height) {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false
  });
}

export class LiquidMercuryScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Liquid Mercury',
      presets: [
        {
          name: 'Cathode Melt',
          ascent: 1,
          pressure: 1.396,
          tension: 1,
          evaporation: 0.623,
          threshold: 1.223,
          edgeNoise: 0.348,
          trail: 0.836
        },
        {
          name: 'Pressure Surge',
          ascent: 1.22,
          pressure: 1.3,
          tension: 0.82,
          evaporation: 0.92,
          threshold: 0.92,
          edgeNoise: 0.86,
          trail: 0.96
        },
        {
          name: 'Fractured Haze',
          ascent: 0.9,
          pressure: 0.94,
          tension: 1.18,
          evaporation: 1.35,
          threshold: 1.08,
          edgeNoise: 1.38,
          trail: 1.06
        },
        {
          name: 'Vacuum Rise',
          ascent: 1.34,
          pressure: 0.86,
          tension: 0.92,
          evaporation: 0.88,
          threshold: 1.14,
          edgeNoise: 0.78,
          trail: 0.92
        },
        {
          name: 'Shattered Core',
          ascent: 1.06,
          pressure: 1.16,
          tension: 1.08,
          evaporation: 1.5,
          threshold: 0.95,
          edgeNoise: 1.5,
          trail: 1.03
        }
      ],
      settings: [
        {
          id: 'metaballCount',
          label: 'Gravity Points',
          min: 5,
          max: 8,
          step: 1,
          defaultValue: DEFAULT_METABALL_COUNT
        },
        {
          id: 'feedbackTrail',
          label: 'Feedback Trail',
          min: 0.82,
          max: 0.95,
          step: 0.001,
          defaultValue: 0.861
        },
        {
          id: 'noiseIntensity',
          label: 'Threshold Noise',
          min: 0.3,
          max: 2.4,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'edgeSoftness',
          label: 'Edge Softness',
          min: 0.02,
          max: 0.12,
          step: 0.001,
          defaultValue: 0.12
        },
        {
          id: 'ditherStrength',
          label: 'Dither Strength',
          min: 0.3,
          max: 1.8,
          step: 0.01,
          defaultValue: 0.3
        }
      ]
    });

    this.metaballPosition = new Float32Array(MAX_METABALLS * 2);
    this.metaballDrift = new Float32Array(MAX_METABALLS);
    this.metaballSeed = new Float32Array(MAX_METABALLS);
    this.metaballSize = new Float32Array(MAX_METABALLS);

    this.displayMesh = null;
    this.displayMaterial = null;

    this.simScene = null;
    this.simCamera = null;
    this.simMaterial = null;
    this.simQuad = null;
    this.simUniforms = null;

    this.readTarget = null;
    this.writeTarget = null;
    this.feedbackBlackTexture = null;
    this.targetWidth = 0;
    this.targetHeight = 0;
    this.aspectRatio = 1;

    this.hasFeedbackFrame = false;
  }

  init(params) {
    super.init(params);
    this.seedMetaballs();
    this.createSimulationPipeline();
    this.createDisplayMesh();
    this.resize(this.width, this.height);
  }

  seedMetaballs() {
    for (let i = 0; i < MAX_METABALLS; i += 1) {
      const index = i * 2;
      this.metaballPosition[index] = randomRange(-1.1, 1.1);
      this.metaballPosition[index + 1] = randomRange(-1.35, 1.0);
      this.metaballDrift[i] = randomRange(-0.26, 0.26);
      this.metaballSeed[i] = Math.random();
      this.metaballSize[i] = randomRange(0.19, 0.34);
    }
  }

  createSimulationPipeline() {
    this.feedbackBlackTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    this.feedbackBlackTexture.needsUpdate = true;

    this.simUniforms = {
      uPrevTexture: { value: this.feedbackBlackTexture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uVolume: { value: 0 },
      uThreshold: { value: 1.2 },
      uEdgeNoise: { value: 1 },
      uEdgeSoftness: { value: 0.055 },
      uPressure: { value: 1 },
      uTrail: { value: 0.89 },
      uDitherStrength: { value: 1 },
      uEvaporation: { value: 1 },
      uMetaballCount: { value: DEFAULT_METABALL_COUNT },
      uMetaballs: {
        value: Array.from({ length: MAX_METABALLS }, () => new THREE.Vector4(0, 0, 0, 0))
      }
    };

    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: this.simUniforms,
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;

        uniform sampler2D uPrevTexture;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uVolume;
        uniform float uThreshold;
        uniform float uEdgeNoise;
        uniform float uEdgeSoftness;
        uniform float uPressure;
        uniform float uTrail;
        uniform float uDitherStrength;
        uniform float uEvaporation;
        uniform int uMetaballCount;
        uniform vec4 uMetaballs[8];

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          mat2 rot = mat2(1.6, -1.2, 1.2, 1.6);
          for (int i = 0; i < 5; i++) {
            value += noise(p) * amplitude;
            p = rot * p;
            amplitude *= 0.5;
          }
          return value;
        }

        float bayer4(vec2 fragCoord) {
          vec2 p = mod(floor(fragCoord), 4.0);
          if (p.y < 0.5) {
            if (p.x < 0.5) return 0.0 / 16.0;
            if (p.x < 1.5) return 8.0 / 16.0;
            if (p.x < 2.5) return 2.0 / 16.0;
            return 10.0 / 16.0;
          }
          if (p.y < 1.5) {
            if (p.x < 0.5) return 12.0 / 16.0;
            if (p.x < 1.5) return 4.0 / 16.0;
            if (p.x < 2.5) return 14.0 / 16.0;
            return 6.0 / 16.0;
          }
          if (p.y < 2.5) {
            if (p.x < 0.5) return 3.0 / 16.0;
            if (p.x < 1.5) return 11.0 / 16.0;
            if (p.x < 2.5) return 1.0 / 16.0;
            return 9.0 / 16.0;
          }
          if (p.x < 0.5) return 15.0 / 16.0;
          if (p.x < 1.5) return 7.0 / 16.0;
          if (p.x < 2.5) return 13.0 / 16.0;
          return 5.0 / 16.0;
        }

        void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          uv.x *= aspect;

          float field = 0.0;
          float ripple = 0.0;
          float count = max(1.0, float(uMetaballCount));

          for (int i = 0; i < 8; i++) {
            if (i >= uMetaballCount) {
              break;
            }

            vec4 metaball = uMetaballs[i];
            vec2 d = uv - metaball.xy;
            float d2 = dot(d, d) + 0.012;
            field += (metaball.z * metaball.z) / d2;

            float ring = sin(length(d) * 18.0 - uTime * (1.5 + uMid * 4.0) + metaball.w * 6.2831853);
            ripple += ring * exp(-d2 * 6.0);
          }

          field /= max(1.0, count * 0.22);
          ripple = (ripple / count) * (0.04 + uMid * 0.22);

          float pressurePulse = sin(uTime * (14.0 + uBass * 40.0) + uv.y * 18.0) * (0.01 + uBass * 0.05);
          float thresholdNoise =
            (fbm(uv * 6.5 + vec2(uTime * 0.25, -uTime * 0.18)) - 0.5) *
            (0.02 + uEdgeNoise * 0.18 + uTreble * 0.1);

          float threshold = uThreshold - uPressure * 0.08 + thresholdNoise;
          float edgeDist = field + ripple + pressurePulse - threshold;

          float fluid = smoothstep(-uEdgeSoftness, uEdgeSoftness, edgeDist);
          float edge = exp(-abs(edgeDist) * 28.0);

          float shattered =
            step(
              0.62 - uTreble * 0.28,
              hash21(gl_FragCoord.xy * 0.75 + vec2(uTime * 37.0, uTime * 13.0))
            );
          float dust = edge * shattered * (0.12 + uTreble * 0.5 + uEdgeNoise * 0.25);

          float vaporNoise = fbm(vec2(uv.x * 10.0, uv.y * 14.0 - uTime * (1.0 + uTreble * 2.4)));
          float vaporMask = smoothstep(0.62 - uTreble * 0.2, 0.92, vaporNoise) * smoothstep(-0.2, 0.9, uv.y);
          float vapor = vaporMask * edge * (0.04 + uTreble * 0.18) * uEvaporation;

          float current = clamp(max(fluid, dust + vapor), 0.0, 1.0);

          float previous = texture2D(uPrevTexture, vUv).r;
          float trail = clamp(uTrail, 0.0, 0.98);
          float merged = current + previous * trail * (1.0 - current);
          merged = clamp(merged, 0.0, 0.96);

          float dither = bayer4(gl_FragCoord.xy);
          float quantized = floor(merged * 8.0 + dither * uDitherStrength) / 8.0;

          float scan = 1.0 + sin(vUv.y * uResolution.y * 0.8 + uTime * 9.0) * 0.02;
          float outValue = clamp(max(merged * 0.78, quantized * 0.82) * scan, 0.0, 1.0);

          gl_FragColor = vec4(vec3(outValue), 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false
    });

    this.simScene = new THREE.Scene();
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMaterial);
    this.simScene.add(this.simQuad);
  }

  createDisplayMesh() {
    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.feedbackBlackTexture },
        uGain: { value: 1 }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;

        uniform sampler2D uTexture;
        uniform float uGain;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          float base = texture2D(uTexture, vUv).r * uGain;
          float grain = (hash21(gl_FragCoord.xy * 0.6) - 0.5) * 0.035;
          float value = pow(clamp(base + grain, 0.0, 1.0), 1.06);
          gl_FragColor = vec4(vec3(value), 1.0);
        }
      `,
      transparent: false,
      depthWrite: false,
      depthTest: false
    });

    this.displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.displayMaterial);
    this.displayMesh.position.set(0, 0, 0);
    this.scene.add(this.displayMesh);
  }

  resize(width, height) {
    super.resize(width, height);
    this.rebuildRenderTargets(width, height);
    this.updateDisplayScale();
  }

  rebuildRenderTargets(width, height) {
    const targetWidth = THREE.MathUtils.clamp(Math.round(width * 0.78), 320, 1120);
    const targetHeight = THREE.MathUtils.clamp(Math.round(height * 0.78), 320, 1120);

    if (targetWidth === this.targetWidth && targetHeight === this.targetHeight) {
      return;
    }

    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;
    this.aspectRatio = targetWidth / Math.max(1, targetHeight);

    if (this.readTarget) {
      this.readTarget.dispose();
    }
    if (this.writeTarget) {
      this.writeTarget.dispose();
    }

    this.readTarget = createRenderTarget(targetWidth, targetHeight);
    this.writeTarget = createRenderTarget(targetWidth, targetHeight);
    this.hasFeedbackFrame = false;

    if (this.simUniforms) {
      this.simUniforms.uResolution.value.set(targetWidth, targetHeight);
      this.simUniforms.uPrevTexture.value = this.feedbackBlackTexture;
    }

    if (this.displayMaterial) {
      this.displayMaterial.uniforms.uTexture.value = this.feedbackBlackTexture;
    }
  }

  updateDisplayScale() {
    if (!this.displayMesh || !this.camera) {
      return;
    }

    const distance = Math.max(0.001, this.camera.position.z - this.displayMesh.position.z);
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * distance;
    const width = height * this.camera.aspect;
    this.displayMesh.scale.set(width * 0.5, height * 0.5, 1);
  }

  updateMetaballs(dt, elapsed, bass, mid, volume, preset, metaballCount) {
    for (let i = 0; i < MAX_METABALLS; i += 1) {
      const target = this.simUniforms.uMetaballs.value[i];

      if (i >= metaballCount) {
        target.set(0, 0, 0, 0);
        continue;
      }

      const index = i * 2;
      const seed = this.metaballSeed[i];

      const rise =
        (0.1 + preset.ascent * 0.18 + bass * 0.28 + volume * 0.11) *
        (0.7 + this.metaballSize[i] * 1.4);

      this.metaballPosition[index + 1] += rise * dt;
      if (this.metaballPosition[index + 1] > 1.35) {
        this.metaballPosition[index + 1] = randomRange(-1.55, -1.3);
        this.metaballPosition[index] = randomRange(-1.15, 1.15);
        this.metaballDrift[i] = randomRange(-0.26, 0.26);
      }

      const wobble =
        Math.sin(elapsed * (0.4 + seed * 1.9) + seed * 18.0) * dt * (0.14 + mid * 0.32) +
        this.metaballDrift[i] * dt * (0.2 + volume * 0.3);

      this.metaballPosition[index] += wobble;
      if (this.metaballPosition[index] > 1.18) {
        this.metaballPosition[index] = -1.18;
      } else if (this.metaballPosition[index] < -1.18) {
        this.metaballPosition[index] = 1.18;
      }

      const vibration =
        Math.sin(elapsed * (17 + bass * 40) + seed * 41.0) * (0.004 + bass * 0.03 + volume * 0.008);

      const baseRadius = this.metaballSize[i];
      const pressureScale = 1 + bass * preset.pressure * 0.56 + volume * 0.12;
      const radius = THREE.MathUtils.clamp(baseRadius * pressureScale + vibration, 0.16, 0.52);

      target.set(
        this.metaballPosition[index] * this.aspectRatio,
        this.metaballPosition[index + 1] + vibration * 0.4,
        radius,
        seed
      );
    }
  }

  renderFeedback(renderer) {
    if (!renderer || !this.readTarget || !this.writeTarget || !this.simScene || !this.simCamera) {
      return;
    }

    this.simUniforms.uPrevTexture.value = this.hasFeedbackFrame ? this.readTarget.texture : this.feedbackBlackTexture;

    const previousTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.writeTarget);
    renderer.render(this.simScene, this.simCamera);
    renderer.setRenderTarget(previousTarget);

    const swap = this.readTarget;
    this.readTarget = this.writeTarget;
    this.writeTarget = swap;
    this.hasFeedbackFrame = true;

    this.displayMaterial.uniforms.uTexture.value = this.readTarget.texture;
  }

  update(audio, dt, elapsed, renderContext = {}) {
    const preset = this.getActivePreset() ?? this.presets[0];

    const bass = clamp01(audio.getBass());
    const mid = clamp01(audio.getAverageInRange(220, 2800) / 255);
    const treble = clamp01(audio.getTreble());
    const volume = clamp01(audio.getVolume());

    const metaballCount = THREE.MathUtils.clamp(
      Math.round(this.getSettingValue('metaballCount')),
      5,
      MAX_METABALLS
    );

    this.updateMetaballs(dt, elapsed, bass, mid, volume, preset, metaballCount);

    const feedbackTrail = THREE.MathUtils.clamp(this.getSettingValue('feedbackTrail') * preset.trail, 0.78, 0.96);
    const noiseIntensity = this.getSettingValue('noiseIntensity') * preset.edgeNoise;
    const edgeSoftness = this.getSettingValue('edgeSoftness');
    const ditherStrength = this.getSettingValue('ditherStrength');

    this.simUniforms.uTime.value = elapsed;
    this.simUniforms.uBass.value = bass;
    this.simUniforms.uMid.value = mid;
    this.simUniforms.uTreble.value = treble;
    this.simUniforms.uVolume.value = volume;
    this.simUniforms.uThreshold.value = THREE.MathUtils.clamp(1.18 * preset.threshold - bass * 0.12, 0.9, 1.35);
    this.simUniforms.uPressure.value = (0.5 + bass * 1.4) * preset.pressure;
    this.simUniforms.uEdgeNoise.value = THREE.MathUtils.clamp(noiseIntensity * (0.55 + treble * 0.95), 0.2, 2.5);
    this.simUniforms.uEdgeSoftness.value = THREE.MathUtils.clamp(edgeSoftness * (0.75 + mid * 0.55), 0.015, 0.16);
    this.simUniforms.uTrail.value = feedbackTrail;
    this.simUniforms.uDitherStrength.value = ditherStrength;
    this.simUniforms.uEvaporation.value = THREE.MathUtils.clamp(preset.evaporation * (0.7 + treble * 0.8), 0.3, 2.5);
    this.simUniforms.uMetaballCount.value = metaballCount;

    this.displayMaterial.uniforms.uGain.value = THREE.MathUtils.clamp(0.9 + bass * 0.16 + volume * 0.1, 0.82, 1.2);

    this.renderFeedback(renderContext.renderer);

    this.scene.rotation.z = Math.sin(elapsed * 0.28) * (0.004 + bass * 0.02);
    this.scene.position.x = Math.sin(elapsed * 0.65) * (0.01 + bass * 0.03);
  }

  dispose() {
    if (this.readTarget) {
      this.readTarget.dispose();
      this.readTarget = null;
    }

    if (this.writeTarget) {
      this.writeTarget.dispose();
      this.writeTarget = null;
    }

    if (this.feedbackBlackTexture) {
      this.feedbackBlackTexture.dispose();
      this.feedbackBlackTexture = null;
    }

    if (this.simQuad) {
      this.simQuad.geometry.dispose();
      this.simQuad = null;
    }

    if (this.simMaterial) {
      this.simMaterial.dispose();
      this.simMaterial = null;
    }

    this.simScene = null;
    this.simCamera = null;
    this.simUniforms = null;

    super.dispose();
  }
}
