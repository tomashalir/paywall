import * as THREE from 'three';
import { BaseScene } from './BaseScene';

const SPRING_COUNT = 640;
const PARTICLE_CAPACITY = 5000;
const TWO_PI = Math.PI * 2;

function clamp01(value) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / Math.max(0.000001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export class SurfaceTensionReboundScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Surface Tension',
      presets: [
        {
          name: 'Suspended Glass',
          pull: 1,
          stiffness: 1,
          turbulence: 1,
          edgeNoise: 1,
          glow: 1,
          shred: 1
        },
        {
          name: '808 Muscle',
          pull: 1.24,
          stiffness: 1.18,
          turbulence: 0.9,
          edgeNoise: 0.96,
          glow: 1.2,
          shred: 1.08
        },
        {
          name: 'Sub Mound',
          pull: 0.86,
          stiffness: 0.84,
          turbulence: 1.08,
          edgeNoise: 1.12,
          glow: 0.9,
          shred: 0.82
        },
        {
          name: 'Needle 808',
          pull: 1.12,
          stiffness: 1.34,
          turbulence: 1.24,
          edgeNoise: 1.26,
          glow: 1.22,
          shred: 1.34
        },
        {
          name: 'Heavy Drag',
          pull: 0.78,
          stiffness: 0.92,
          turbulence: 0.74,
          edgeNoise: 0.84,
          glow: 0.82,
          shred: 0.72
        }
      ],
      settings: [
        {
          id: 'baselineY',
          label: 'Baseline Height',
          min: 0.35,
          max: 0.62,
          step: 0.001,
          defaultValue: 0.44
        },
        {
          id: 'restoringForce',
          label: 'Spring Restoring',
          min: 0.5,
          max: 1.8,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'neighborCoupling',
          label: 'Surface Coupling',
          min: 0.5,
          max: 2.4,
          step: 0.01,
          defaultValue: 1.32
        },
        {
          id: 'viscosity',
          label: 'Viscosity',
          min: 0.2,
          max: 2.4,
          step: 0.01,
          defaultValue: 1.28
        },
        {
          id: 'edgeDamping',
          label: 'Edge Damping',
          min: 0.2,
          max: 2.5,
          step: 0.01,
          defaultValue: 1.42
        },
        {
          id: 'pullSensitivity',
          label: '808 Pull Sensitivity',
          min: 0.35,
          max: 2.4,
          step: 0.01,
          defaultValue: 1.12
        },
        {
          id: 'shatterThreshold',
          label: 'Mist Threshold',
          min: 0.2,
          max: 0.95,
          step: 0.005,
          defaultValue: 0.56
        },
        {
          id: 'noiseThreshold',
          label: 'Edge Threshold',
          min: 0.34,
          max: 0.82,
          step: 0.005,
          defaultValue: 0.57
        }
      ]
    });

    this.springY = new Float32Array(SPRING_COUNT);
    this.springV = new Float32Array(SPRING_COUNT);
    this.renderY = new Float32Array(SPRING_COUNT);
    this.renderTension = new Float32Array(SPRING_COUNT);
    this.edgeFade = new Float32Array(SPRING_COUNT);
    this.turbulencePhase = new Float32Array(SPRING_COUNT);

    this.surfaceData = new Float32Array(SPRING_COUNT * 4);
    this.surfaceTexture = null;
    this.surfaceMesh = null;
    this.surfaceMaterial = null;

    this.particlePositions = new Float32Array(PARTICLE_CAPACITY * 3);
    this.particleLife = new Float32Array(PARTICLE_CAPACITY);
    this.particleSeed = new Float32Array(PARTICLE_CAPACITY);
    this.particleVelocity = new Float32Array(PARTICLE_CAPACITY * 3);
    this.particlePointer = 0;
    this.particles = null;
    this.particleMaterial = null;

    this.worldWidth = 1;
    this.worldHeight = 1;

    this.bassEnvelope = 0;
    this.pitchNorm = 0.25;
    this.attractorY = 0.54;
    this.attractorX = 0.5;
    this.attractorPull = 42;
    this.lateralPhase = Math.random() * TWO_PI;
    this.mistAccumulator = 0;

    this.jetHeight = 0.08;
    this.columnRadius = 0.028;
    this.columnStretch = 0;
    this.centralY = 0.44;

    this.setPreset(1);
  }

  init(params) {
    super.init(params);
    this.seedSimulation();
    this.createSurfaceLayer();
    this.createParticleLayer();
    this.resize(this.width, this.height);
  }

  seedSimulation() {
    const baseline = this.getSettingValue('baselineY');
    const center = Math.floor((SPRING_COUNT - 1) * 0.5);
    const moundWidth = SPRING_COUNT * 0.1;

    for (let i = 0; i < SPRING_COUNT; i += 1) {
      const d = (i - center) / moundWidth;
      const mound = Math.exp(-d * d * 1.8) * 0.018;

      this.springY[i] = baseline + mound;
      this.springV[i] = 0;
      this.renderY[i] = baseline + mound;
      this.renderTension[i] = mound * 42;
      this.turbulencePhase[i] = Math.random() * TWO_PI;

      const p = i / (SPRING_COUNT - 1);
      const edgeDistance = Math.min(p, 1 - p);
      this.edgeFade[i] = smoothstep(0.02, 0.22, edgeDistance);
    }

    this.centralY = baseline + 0.016;
    this.attractorY = baseline + 0.08;
    this.jetHeight = this.attractorY - this.centralY;
    this.columnRadius = 0.03;
  }

  createSurfaceLayer() {
    this.surfaceTexture = new THREE.DataTexture(
      this.surfaceData,
      SPRING_COUNT,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.surfaceTexture.needsUpdate = true;
    this.surfaceTexture.magFilter = THREE.LinearFilter;
    this.surfaceTexture.minFilter = THREE.LinearFilter;
    this.surfaceTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.surfaceTexture.wrapT = THREE.ClampToEdgeWrapping;

    this.surfaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSurfaceTex: { value: this.surfaceTexture },
        uTime: { value: 0 },
        uBaseline: { value: this.getSettingValue('baselineY') },
        uCenterY: { value: this.getSettingValue('baselineY') },
        uJetCenterX: { value: 0.5 },
        uJetHeight: { value: 0.08 },
        uJetRadius: { value: 0.028 },
        uJetTension: { value: 0 },
        uNoiseAmount: { value: 1 },
        uNoiseThreshold: { value: 0.57 },
        uLineThickness: { value: 0.008 },
        uGlowBoost: { value: 1.2 },
        uFillet: { value: 0.022 },
        uAberration: { value: 0.06 }
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

        uniform sampler2D uSurfaceTex;
        uniform float uTime;
        uniform float uBaseline;
        uniform float uCenterY;
        uniform float uJetCenterX;
        uniform float uJetHeight;
        uniform float uJetRadius;
        uniform float uJetTension;
        uniform float uNoiseAmount;
        uniform float uNoiseThreshold;
        uniform float uLineThickness;
        uniform float uGlowBoost;
        uniform float uFillet;
        uniform float uAberration;

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

        float smin(float a, float b, float k) {
          float h = clamp(0.5 + 0.5 * (b - a) / max(0.0001, k), 0.0, 1.0);
          return mix(b, a, h) - k * h * (1.0 - h);
        }

        float sdTaperedColumn(vec2 p, vec2 a, vec2 b, float ra, float rb) {
          vec2 ba = b - a;
          float h = clamp(dot(p - a, ba) / max(0.00001, dot(ba, ba)), 0.0, 1.0);
          float r = mix(ra, rb, h);
          return length(p - mix(a, b, h)) - r;
        }

        void main() {
          vec2 uv = vUv;
          vec4 sampleData = texture2D(uSurfaceTex, vec2(uv.x, 0.5));
          float surfaceY = sampleData.r;
          float tension = sampleData.g;

          float lineSdf = abs(uv.y - surfaceY) - uLineThickness;

          float jetAmount = smoothstep(0.0, 0.2, uJetHeight);
          vec2 base = vec2(uJetCenterX, uCenterY);
          vec2 tip = vec2(uJetCenterX, uCenterY + uJetHeight);
          float jetSdf = sdTaperedColumn(uv, base, tip, uJetRadius, uJetRadius * 0.22);
          float unionSdf = smin(lineSdf, jetSdf, uFillet * jetAmount);

          float edgeNoise = (fbm(vec2(uv.x * 320.0, uv.y * 280.0 + uTime * 0.8)) - 0.5) * 0.016 * uNoiseAmount;
          float edgeBand = 1.0 - smoothstep(0.0, uLineThickness * 1.8, abs(unionSdf + edgeNoise));
          float grain = fbm(vec2(uv.x * 560.0 + uTime * 1.8, uv.y * 520.0 - uTime * 1.6));
          float granular = step(uNoiseThreshold, edgeBand - (grain - 0.5) * 0.95);

          float baselineGlow = smoothstep(0.02, 0.0, abs(uv.y - uBaseline)) * 0.06;
          float stress = clamp(tension * 1.4 + uJetTension * jetAmount, 0.0, 2.0);
          float glow = granular * (0.68 + stress * uGlowBoost);

          float fringe = smoothstep(0.4, 1.2, stress) * uAberration * granular;
          vec3 color = vec3(glow + baselineGlow);
          color.r += fringe * 0.35;
          color.g += fringe * 0.04;
          color.b -= fringe * 0.2;
          color = clamp(color, 0.0, 1.0);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false
    });

    this.surfaceMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.surfaceMaterial);
    this.surfaceMesh.renderOrder = 1;
    this.scene.add(this.surfaceMesh);
  }

  createParticleLayer() {
    for (let i = 0; i < PARTICLE_CAPACITY; i += 1) {
      const index = i * 3;
      this.particlePositions[index] = 0;
      this.particlePositions[index + 1] = -99;
      this.particlePositions[index + 2] = 0;
      this.particleLife[i] = 0;
      this.particleSeed[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePositions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute(
      'aLife',
      new THREE.BufferAttribute(this.particleLife, 1).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.particleSeed, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPointSize: { value: 5.2 },
        uBrightness: { value: 1.0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float aLife;
        attribute float aSeed;
        varying float vLife;
        varying float vSeed;

        uniform float uPointSize;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float depthScale = clamp(1.4 / max(0.45, -mvPosition.z), 0.35, 2.4);
          gl_PointSize = uPointSize * depthScale * (0.75 + aSeed * 0.7) * (0.25 + aLife * 0.95);
          gl_Position = projectionMatrix * mvPosition;
          vLife = aLife;
          vSeed = aSeed;
        }
      `,
      fragmentShader: `
        varying float vLife;
        varying float vSeed;
        uniform float uBrightness;
        uniform float uTime;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float r2 = dot(p, p);
          if (r2 > 1.0) {
            discard;
          }

          float core = pow(1.0 - r2, 1.7);
          float grain = hash21(gl_FragCoord.xy + vSeed * 63.0 + uTime * 7.0);
          float mask = step(0.38, core * 0.9 + grain * 0.85);
          float alpha = core * vLife * mask;
          if (alpha < 0.02) {
            discard;
          }

          gl_FragColor = vec4(vec3(alpha * uBrightness), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });

    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.particles.renderOrder = 2;
    this.scene.add(this.particles);
  }

  resize(width, height) {
    super.resize(width, height);
    this.updateDisplayScale();
  }

  updateDisplayScale() {
    if (!this.surfaceMesh || !this.camera) {
      return;
    }

    const distance = Math.max(0.001, this.camera.position.z - this.surfaceMesh.position.z);
    const viewportHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * distance;
    const viewportWidth = viewportHeight * this.camera.aspect;

    this.worldWidth = viewportWidth;
    this.worldHeight = viewportHeight;
    this.surfaceMesh.scale.set(viewportWidth * 0.5, viewportHeight * 0.5, 1);
  }

  spawnMistParticles(count, intensity) {
    const usableHeight = Math.max(0.03, this.jetHeight);

    for (let i = 0; i < count; i += 1) {
      const slot = this.particlePointer;
      const index = slot * 3;
      this.particlePointer = (this.particlePointer + 1) % PARTICLE_CAPACITY;

      const side = Math.random() > 0.5 ? 1 : -1;
      const yRatio = 0.34 + Math.random() * 0.64;
      const jitter = (Math.random() - 0.5) * this.columnRadius * 0.45;
      const xNorm = this.attractorX + side * this.columnRadius * (0.75 + Math.random() * 0.55) + jitter;
      const yNorm = this.centralY + usableHeight * yRatio + (Math.random() - 0.5) * 0.008;

      const worldX = (xNorm - 0.5) * this.worldWidth;
      const worldY = (yNorm - 0.5) * this.worldHeight;

      this.particlePositions[index] = worldX;
      this.particlePositions[index + 1] = worldY;
      this.particlePositions[index + 2] = (Math.random() - 0.5) * 0.12;

      this.particleVelocity[index] = side * (0.08 + Math.random() * 0.72) * intensity;
      this.particleVelocity[index + 1] = (0.04 + Math.random() * 0.48) * intensity;
      this.particleVelocity[index + 2] = (Math.random() - 0.5) * 0.24;

      this.particleLife[slot] = 0.36 + Math.random() * 0.95;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.aLife.needsUpdate = true;
  }

  updateParticles(dt) {
    const gravity = (0.6 + this.getSettingValue('restoringForce') * 0.45) * this.worldHeight * 0.18;
    const sinkFloor = -this.worldHeight * 0.58;

    for (let i = 0; i < PARTICLE_CAPACITY; i += 1) {
      let life = this.particleLife[i];
      if (life <= 0) {
        continue;
      }

      const index = i * 3;
      this.particleVelocity[index + 1] -= gravity * dt;

      this.particlePositions[index] += this.particleVelocity[index] * dt;
      this.particlePositions[index + 1] += this.particleVelocity[index + 1] * dt;
      this.particlePositions[index + 2] += this.particleVelocity[index + 2] * dt;

      this.particleVelocity[index] *= 0.982;
      this.particleVelocity[index + 1] *= 0.986;
      this.particleVelocity[index + 2] *= 0.98;

      life -= dt * 0.94;
      if (this.particlePositions[index + 1] < sinkFloor) {
        life = 0;
      }
      this.particleLife[i] = Math.max(0, life);
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.aLife.needsUpdate = true;
  }

  update808State(dt, audio, preset) {
    const low30 = clamp01(audio.getAverageInRange(30, 42) / 255);
    const low45 = clamp01(audio.getAverageInRange(42, 56) / 255);
    const low60 = clamp01(audio.getAverageInRange(56, 68) / 255);
    const low75 = clamp01(audio.getAverageInRange(68, 80) / 255);
    const bass = clamp01(audio.getBass());

    const total = low30 + low45 + low60 + low75 + 0.0001;
    const pitchRaw = clamp01((low45 * 0.33 + low60 * 0.66 + low75 * 1.0) / total);
    const pitchLerp = 1 - Math.exp(-dt * (6.6 + pitchRaw * 4.2));
    this.pitchNorm += (pitchRaw - this.pitchNorm) * pitchLerp;

    const ampRaw = clamp01(low30 * 0.28 + low45 * 0.7 + low60 * 0.95 + low75 * 0.56 + bass * 0.35);
    const attack = 1 - Math.exp(-dt * 9.5);
    const release = 1 - Math.exp(-dt * 2.1);
    const envLerp = ampRaw > this.bassEnvelope ? attack : release;
    this.bassEnvelope += (ampRaw - this.bassEnvelope) * envLerp;

    const baseline = this.getSettingValue('baselineY');
    const pullSensitivity = this.getSettingValue('pullSensitivity');
    const restAnchor = baseline + 0.053;
    const targetAttractorY = THREE.MathUtils.clamp(
      restAnchor + this.bassEnvelope * (0.08 + preset.pull * 0.34) * pullSensitivity,
      baseline + 0.045,
      0.9
    );
    const yLerp = 1 - Math.exp(-dt * (7 + this.bassEnvelope * 4));
    this.attractorY += (targetAttractorY - this.attractorY) * yLerp;

    const targetPull = (34 + this.bassEnvelope * 190 * preset.pull) * pullSensitivity;
    const pullLerp = 1 - Math.exp(-dt * 5.4);
    this.attractorPull += (targetPull - this.attractorPull) * pullLerp;

    const jitterRate = 2 + this.pitchNorm * 18;
    this.lateralPhase += dt * jitterRate * TWO_PI;
    const jitterAmp = (0.0008 + this.pitchNorm * this.pitchNorm * 0.016) * (0.2 + this.bassEnvelope * 1.1);
    const jitter =
      Math.sin(this.lateralPhase) * jitterAmp + Math.sin(this.lateralPhase * 0.47 + 1.1) * jitterAmp * 0.4;
    this.attractorX = THREE.MathUtils.clamp(0.5 + jitter, 0.44, 0.56);
  }

  updateSprings(dt, elapsed, audioState, preset) {
    const baseline = this.getSettingValue('baselineY');
    const restoring = this.getSettingValue('restoringForce');
    const coupling = this.getSettingValue('neighborCoupling');
    const viscosity = this.getSettingValue('viscosity');
    const edgeDamping = this.getSettingValue('edgeDamping');

    const pitch = this.pitchNorm;
    const lowHeavy = 1 - pitch;

    const k = 20 * restoring * preset.stiffness * (0.85 + audioState.bass * 0.78 + pitch * 0.95);
    const neighborK = 170 * coupling * (0.78 + audioState.bass * 0.7 + pitch * 0.52);
    const visc = 4.4 * viscosity * (1.38 - pitch * 0.72);
    const damp = 8.5 + edgeDamping * 1.8 + lowHeavy * 2.2;

    const attractorRadius = SPRING_COUNT * (0.04 + lowHeavy * 0.085);
    const attractorIndex = this.attractorX * (SPRING_COUNT - 1);

    const substeps = Math.min(4, Math.max(1, Math.ceil(dt / 0.008)));
    const h = dt / substeps;

    for (let step = 0; step < substeps; step += 1) {
      for (let i = 0; i < SPRING_COUNT; i += 1) {
        const y = this.springY[i];
        const v = this.springV[i];
        const leftY = i > 0 ? this.springY[i - 1] : baseline;
        const rightY = i < SPRING_COUNT - 1 ? this.springY[i + 1] : baseline;
        const leftV = i > 0 ? this.springV[i - 1] : 0;
        const rightV = i < SPRING_COUNT - 1 ? this.springV[i + 1] : 0;
        const edgeWeight = this.edgeFade[i];
        const edgeLoss = 1 - edgeWeight;

        const restoringForce = (baseline - y) * k;
        const neighborForce = (leftY + rightY - 2 * y) * neighborK;
        const viscousForce = (leftV + rightV - 2 * v) * visc;
        let acceleration = restoringForce + neighborForce + viscousForce - v * damp;

        const dx = (i - attractorIndex) / attractorRadius;
        const profile = Math.exp(-dx * dx * 1.9);
        const attractForce = (this.attractorY - y) * this.attractorPull * profile;
        const suspensionBias = profile * (4 + this.attractorPull * 0.08);
        acceleration += attractForce + suspensionBias;

        acceleration += (baseline - y) * edgeLoss * edgeDamping * 42;

        this.springV[i] += acceleration * h;
        this.springV[i] *= 1 - edgeLoss * edgeDamping * 0.08 * h;
        this.springV[i] = THREE.MathUtils.clamp(this.springV[i], -2.8, 2.8);
      }

      for (let i = 0; i < SPRING_COUNT; i += 1) {
        this.springY[i] += this.springV[i] * h;
        this.springY[i] = THREE.MathUtils.clamp(this.springY[i], 0.03, 0.96);
      }
    }

    const midJitter = (0.0006 + audioState.mid * 0.0105) * preset.turbulence * (0.62 + pitch * 0.8);
    const ridgeBoost = 0.56 + audioState.bass * 0.82 + this.columnStretch * 0.54;

    for (let i = 0; i < SPRING_COUNT; i += 1) {
      const p = i / (SPRING_COUNT - 1);
      const xWave = p * TWO_PI;
      const noise =
        Math.sin(xWave * 17.0 + elapsed * (7.4 + audioState.mid * 4.6) + this.turbulencePhase[i]) * midJitter +
        Math.sin(xWave * 29.0 - elapsed * (11.8 + audioState.mid * 5.6) + this.turbulencePhase[i] * 0.6) *
          midJitter *
          0.5;

      this.renderY[i] = THREE.MathUtils.clamp(this.springY[i] + noise, 0.04, 0.96);

      const left = i > 0 ? this.springY[i - 1] : baseline;
      const right = i < SPRING_COUNT - 1 ? this.springY[i + 1] : baseline;
      const curvature = Math.abs(left + right - 2 * this.springY[i]);
      const displacement = Math.abs(this.springY[i] - baseline);
      this.renderTension[i] = THREE.MathUtils.clamp((displacement * 24 + curvature * 165) * ridgeBoost, 0, 1.7);
    }
  }

  updateColumn(dt) {
    const centerIndex = THREE.MathUtils.clamp(Math.round(this.attractorX * (SPRING_COUNT - 1)), 2, SPRING_COUNT - 3);
    const centerY =
      (this.springY[centerIndex - 2] +
        this.springY[centerIndex - 1] +
        this.springY[centerIndex] +
        this.springY[centerIndex + 1] +
        this.springY[centerIndex + 2]) /
      5;
    this.centralY = THREE.MathUtils.clamp(centerY, 0.08, 0.9);

    const targetJet = Math.max(0.03, this.attractorY - this.centralY);
    const jetLerp = 1 - Math.exp(-dt * (10 + this.bassEnvelope * 4.6));
    this.jetHeight += (targetJet - this.jetHeight) * jetLerp;
    this.columnStretch = clamp01((this.jetHeight - 0.04) / 0.34);

    const targetRadius = THREE.MathUtils.lerp(0.048, 0.013, this.pitchNorm);
    const radiusLerp = 1 - Math.exp(-dt * 8.4);
    this.columnRadius += (targetRadius - this.columnRadius) * radiusLerp;
  }

  updateSurfaceTexture() {
    for (let i = 0; i < SPRING_COUNT; i += 1) {
      const index = i * 4;
      this.surfaceData[index] = this.renderY[i];
      this.surfaceData[index + 1] = clamp01(this.renderTension[i]);
      this.surfaceData[index + 2] = 0;
      this.surfaceData[index + 3] = 1;
    }
    this.surfaceTexture.needsUpdate = true;
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const safeDt = Math.min(dt, 0.05);

    const sub = clamp01(audio.getAverageInRange(20, 90) / 255);
    const bass = clamp01(audio.getBass());
    const mid = clamp01(audio.getAverageInRange(220, 2400) / 255);
    const highs = clamp01(audio.getAverageInRange(6500, 16000) / 255);
    const treble = clamp01(audio.getTreble());

    this.update808State(safeDt, audio, preset);
    this.updateSprings(
      safeDt,
      elapsed,
      {
        sub,
        bass,
        mid
      },
      preset
    );
    this.updateColumn(safeDt);

    const mistThreshold = this.getSettingValue('shatterThreshold');
    const mistDrive = clamp01((highs * 0.72 + treble * 0.28) * (0.22 + this.columnStretch * 1.3) * preset.shred);
    const mistRate = Math.max(0, mistDrive - mistThreshold * 0.46) * (180 + this.columnStretch * 980);
    this.mistAccumulator += mistRate * safeDt;
    const emitCount = Math.min(260, Math.floor(this.mistAccumulator));
    if (emitCount > 0) {
      const intensity = 0.46 + mistDrive * 1.54;
      this.spawnMistParticles(emitCount, intensity);
      this.mistAccumulator -= emitCount;
    }

    this.updateParticles(safeDt);
    this.updateSurfaceTexture();

    const noiseThreshold = this.getSettingValue('noiseThreshold');
    const centerTension = this.renderTension[Math.floor(this.attractorX * (SPRING_COUNT - 1))];
    const lineThickness = THREE.MathUtils.clamp(
      0.0048 + (1 - this.pitchNorm) * 0.008 + bass * 0.0032,
      0.0045,
      0.028
    );

    this.surfaceMaterial.uniforms.uTime.value = elapsed;
    this.surfaceMaterial.uniforms.uBaseline.value = this.getSettingValue('baselineY');
    this.surfaceMaterial.uniforms.uCenterY.value = this.centralY;
    this.surfaceMaterial.uniforms.uJetCenterX.value = this.attractorX;
    this.surfaceMaterial.uniforms.uJetHeight.value = this.jetHeight;
    this.surfaceMaterial.uniforms.uJetRadius.value = this.columnRadius;
    this.surfaceMaterial.uniforms.uJetTension.value = THREE.MathUtils.clamp(
      centerTension * 1.12 + this.columnStretch * 0.92,
      0,
      1.9
    );
    this.surfaceMaterial.uniforms.uNoiseAmount.value =
      (0.62 + mid * 0.95 + highs * 0.75 + this.columnStretch * 0.55) * preset.edgeNoise;
    this.surfaceMaterial.uniforms.uNoiseThreshold.value = THREE.MathUtils.clamp(
      noiseThreshold - this.columnStretch * 0.05,
      0.28,
      0.88
    );
    this.surfaceMaterial.uniforms.uLineThickness.value = lineThickness;
    this.surfaceMaterial.uniforms.uGlowBoost.value = THREE.MathUtils.clamp(
      0.85 + preset.glow * 0.72 + this.columnStretch * 0.95 + this.bassEnvelope * 0.42,
      0.7,
      2.6
    );
    this.surfaceMaterial.uniforms.uFillet.value = THREE.MathUtils.clamp(0.013 + this.columnRadius * 0.74, 0.01, 0.07);
    this.surfaceMaterial.uniforms.uAberration.value = THREE.MathUtils.clamp(
      0.02 + highs * 0.06 * this.columnStretch + this.pitchNorm * 0.02,
      0.02,
      0.12
    );

    this.particleMaterial.uniforms.uPointSize.value = 3.8 + highs * 3.5 + this.columnStretch * 1.8;
    this.particleMaterial.uniforms.uBrightness.value = 0.72 + highs * 0.6 + this.columnStretch * 0.42;
    this.particleMaterial.uniforms.uTime.value = elapsed;
  }

  dispose() {
    if (this.surfaceTexture) {
      this.surfaceTexture.dispose();
      this.surfaceTexture = null;
    }

    if (this.surfaceMesh) {
      this.scene.remove(this.surfaceMesh);
      this.surfaceMesh.geometry.dispose();
      this.surfaceMesh = null;
    }

    if (this.surfaceMaterial) {
      this.surfaceMaterial.dispose();
      this.surfaceMaterial = null;
    }

    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles = null;
    }

    if (this.particleMaterial) {
      this.particleMaterial.dispose();
      this.particleMaterial = null;
    }

    super.dispose();
  }
}
