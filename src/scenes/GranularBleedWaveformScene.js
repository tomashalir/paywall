import * as THREE from 'three';
import { BaseScene } from './BaseScene';

const MIN_PARTICLE_COUNT = 10000;
const MAX_PARTICLE_COUNT = 140000;
const DEFAULT_PARTICLE_COUNT = 45000;

function clamp01(value) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

export class GranularBleedWaveformScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Granular Bleed',
      presets: [
        {
          name: 'Glow White',
          amplitudeGain: 1,
          bleedSpread: 1,
          bleedFocus: 0.7,
          pointScale: 1,
          glowIntensity: 1.05,
          warmth: 0
        },
        {
          name: 'Glow White',
          amplitudeGain: 1.464,
          bleedSpread: 1.962,
          bleedFocus: 0.665,
          pointScale: 0.939,
          glowIntensity: 1.455,
          warmth: 0,
          sceneSettings: {
            particleCount: 45000,
            decayRate: 0.949,
            noiseMagnitude: 0.131,
            lineThreshold: 1.23,
            bleedAmount: 1.36,
            agcHeadroom: 0.58
          }
        },
        {
          name: 'Dense Mist',
          amplitudeGain: 0.95,
          bleedSpread: 1.36,
          bleedFocus: 0.82,
          pointScale: 0.92,
          glowIntensity: 0.94,
          warmth: 0.2
        },
        {
          name: 'Signal Fracture',
          amplitudeGain: 1.18,
          bleedSpread: 1.42,
          bleedFocus: 0.56,
          pointScale: 1.2,
          glowIntensity: 1.22,
          warmth: 0.08
        },
        {
          name: 'Needle Thread',
          amplitudeGain: 0.82,
          bleedSpread: 0.74,
          bleedFocus: 0.86,
          pointScale: 0.84,
          glowIntensity: 0.92,
          warmth: 0
        }
      ],
      settings: [
        {
          id: 'particleCount',
          label: 'Particle Density',
          min: MIN_PARTICLE_COUNT,
          max: MAX_PARTICLE_COUNT,
          step: 1000,
          defaultValue: DEFAULT_PARTICLE_COUNT
        },
        {
          id: 'decayRate',
          label: 'Trail Persistence',
          min: 0.82,
          max: 0.995,
          step: 0.001,
          defaultValue: 0.949
        },
        {
          id: 'noiseMagnitude',
          label: 'Treble Jitter',
          min: 0.02,
          max: 0.42,
          step: 0.001,
          defaultValue: 0.131
        },
        {
          id: 'lineThreshold',
          label: 'Treble Scatter',
          min: 0,
          max: 2,
          step: 0.01,
          defaultValue: 1.23
        },
        {
          id: 'bleedAmount',
          label: 'Vertical Bleed',
          min: 0.35,
          max: 2,
          step: 0.01,
          defaultValue: 1.36
        },
        {
          id: 'agcHeadroom',
          label: 'AGC Headroom',
          min: 0.55,
          max: 0.95,
          step: 0.005,
          defaultValue: 0.58
        }
      ]
    });

    this.setPreset(1);

    this.sampleCount = 512;
    this.horizontalSpan = 11.6;
    this.verticalSpan = 4.8;

    this.positions = null;
    this.alpha = null;
    this.seeds = null;
    this.columnIndex = null;
    this.bleedSeed = null;

    this.amplitude = new Float32Array(this.sampleCount);
    this.smoothAmplitude = new Float32Array(this.sampleCount);

    this.particleCount = 0;

    this.points = null;
    this.bleedLines = null;
    this.bleedLinePositions = new Float32Array(this.sampleCount * 6);

    this.agcEnvelope = 0.22;
    this.agcGain = 1;
  }

  init(params) {
    super.init(params);

    this.createParticleSystem(this.getSettingValue('particleCount'));
    this.createLineLayer();
  }

  createParticleSystem(requestedCount) {
    const nextCount = THREE.MathUtils.clamp(Math.round(requestedCount), MIN_PARTICLE_COUNT, MAX_PARTICLE_COUNT);

    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.points = null;
    }

    this.particleCount = nextCount;
    this.positions = new Float32Array(nextCount * 3);
    this.alpha = new Float32Array(nextCount);
    this.seeds = new Float32Array(nextCount);
    this.columnIndex = new Float32Array(nextCount);
    this.bleedSeed = new Float32Array(nextCount);

    const halfSpan = this.horizontalSpan * 0.5;

    for (let i = 0; i < nextCount; i += 1) {
      const index = i * 3;
      const column = i % this.sampleCount;
      const x = -halfSpan + (column / (this.sampleCount - 1)) * this.horizontalSpan;

      this.positions[index] = x;
      this.positions[index + 1] = (Math.random() - 0.5) * this.verticalSpan;
      this.positions[index + 2] = (Math.random() - 0.5) * 0.35;

      this.alpha[i] = 0;
      this.seeds[i] = Math.random();
      this.columnIndex[i] = column;
      this.bleedSeed[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPointSize: { value: 8.5 },
        uBrightness: { value: 1.0 },
        uColor: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSeed;
        uniform float uPointSize;
        varying float vAlpha;
        varying float vSeed;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float depthScale = clamp(1.4 / max(0.45, -mvPosition.z), 0.4, 2.4);
          gl_PointSize = uPointSize * depthScale * (0.82 + aSeed * 0.36);
          gl_Position = projectionMatrix * mvPosition;

          vAlpha = aAlpha;
          vSeed = aSeed;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uBrightness;

        varying float vAlpha;
        varying float vSeed;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float radius = dot(p, p);
          if (radius > 1.0) {
            discard;
          }

          float radial = pow(1.0 - radius, 1.9);
          float grain = 0.72 + random(gl_FragCoord.xy + vSeed * 59.0) * 0.56;
          float a = radial * vAlpha * grain;

          if (a < 0.01) {
            discard;
          }

          gl_FragColor = vec4(uColor * uBrightness, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  createLineLayer() {
    if (this.bleedLines) {
      this.scene.remove(this.bleedLines);
      this.bleedLines.geometry.dispose();
      this.bleedLines.material.dispose();
      this.bleedLines = null;
    }

    const bleedGeometry = new THREE.BufferGeometry();
    bleedGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.bleedLinePositions, 3).setUsage(THREE.DynamicDrawUsage)
    );

    this.bleedLines = new THREE.LineSegments(
      bleedGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    this.scene.add(this.bleedLines);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];

    const requestedParticleCount = this.getSettingValue('particleCount');
    if (Math.round(requestedParticleCount) !== this.particleCount) {
      this.createParticleSystem(requestedParticleCount);
    }

    const decayRate = this.getSettingValue('decayRate');
    const noiseMagnitude = this.getSettingValue('noiseMagnitude');
    const trebleScatter = this.getSettingValue('lineThreshold');
    const bleedAmountSetting = this.getSettingValue('bleedAmount');
    const agcHeadroom = this.getSettingValue('agcHeadroom');

    const wave = audio.getTimeData();
    const frequencies = audio.getFrequencyData();

    if (!wave || wave.length === 0 || !frequencies || frequencies.length === 0) {
      return;
    }

    const bass = clamp01(audio.getBass());
    const treble = clamp01(audio.getTreble());
    const volume = clamp01(audio.getVolume());
    const sub = clamp01(audio.getAverageInRange(20, 80) / 255);
    const high = clamp01(audio.getAverageInRange(6000, 14000) / 255);

    let rawPeak = 0;
    for (let i = 0; i < this.sampleCount; i += 1) {
      const p = i / (this.sampleCount - 1);
      const waveIndex = Math.floor(p * (wave.length - 1));
      const signal = Math.abs((wave[waveIndex] - 128) / 128);
      if (signal > rawPeak) {
        rawPeak = signal;
      }
    }

    const attack = 1 - Math.exp(-dt * 4.8);
    const release = 1 - Math.exp(-dt * 1.15);
    const envelopeLerp = rawPeak > this.agcEnvelope ? attack : release;
    this.agcEnvelope += (rawPeak - this.agcEnvelope) * envelopeLerp;

    const targetGain = THREE.MathUtils.clamp(agcHeadroom / (this.agcEnvelope + 0.085), 0.45, 2.4);
    const gainLerp = 1 - Math.exp(-dt * 2.1);
    this.agcGain += (targetGain - this.agcGain) * gainLerp;

    const amplitudeScale = (0.68 + volume * 1.58) * preset.amplitudeGain * this.agcGain;
    const bleedSpread = (0.45 + bass * 1.2) * preset.bleedSpread * bleedAmountSetting;
    const bleedFocus = THREE.MathUtils.clamp(1.2 + preset.bleedFocus * 2.2 + treble * 1.2, 1, 4.8);
    const jitterAmount = noiseMagnitude * (0.2 + treble * 1.9 + high * 0.8);
    const shakeAmount = (0.03 + sub * 0.26 + bass * 0.14) * bleedAmountSetting;

    const smoothFollow = 1 - Math.exp(-dt * (3.6 + volume * 2.1));
    const xStep = this.horizontalSpan / (this.sampleCount - 1);
    const halfSpan = this.horizontalSpan * 0.5;

    for (let i = 0; i < this.sampleCount; i += 1) {
      const p = i / (this.sampleCount - 1);
      const waveIndex = Math.floor(p * (wave.length - 1));
      const signal = (wave[waveIndex] - 128) / 128;
      const shapedSignal = THREE.MathUtils.clamp(signal * amplitudeScale, -1.12, 1.12);

      this.amplitude[i] = shapedSignal;
      this.smoothAmplitude[i] += (shapedSignal - this.smoothAmplitude[i]) * smoothFollow;

      const x = -halfSpan + i * xStep;
      const ampY = this.smoothAmplitude[i] * this.verticalSpan * 0.5;

      const bleedIndex = i * 6;
      this.bleedLinePositions[bleedIndex] = x;
      this.bleedLinePositions[bleedIndex + 1] = ampY;
      this.bleedLinePositions[bleedIndex + 2] = 0;
      this.bleedLinePositions[bleedIndex + 3] = x;
      this.bleedLinePositions[bleedIndex + 4] = 0;
      this.bleedLinePositions[bleedIndex + 5] = 0;
    }

    this.bleedLines.geometry.attributes.position.needsUpdate = true;
    this.bleedLines.material.opacity = THREE.MathUtils.clamp(0.07 + volume * 0.2 + bass * 0.13, 0.06, 0.34);

    const decay = Math.pow(decayRate, dt * 60);

    for (let i = 0; i < this.particleCount; i += 1) {
      this.alpha[i] *= decay;

      const index = i * 3;
      const column = this.columnIndex[i] | 0;
      const amp = this.amplitude[column];
      const smoothAmp = this.smoothAmplitude[column];
      const seed = this.seeds[i];
      const freq = frequencies[Math.floor((column / (this.sampleCount - 1)) * (frequencies.length - 1))] / 255;

      const dispersion = 1 + trebleScatter * (high * 1.2 + treble * 0.8 + freq * 1.1);
      const spreadToCenter = Math.pow(this.bleedSeed[i], bleedFocus) * bleedSpread * dispersion;
      const yAlongBleed = amp * (1 - spreadToCenter);
      const coreY = THREE.MathUtils.lerp(smoothAmp, yAlongBleed, 0.84) * this.verticalSpan * 0.5;

      const jitterWave = Math.sin(elapsed * (11 + treble * 44) + seed * 43 + column * 0.11);
      const shimmer = Math.cos(elapsed * (7.5 + high * 23) + seed * 67 + column * 0.07);
      const verticalNoise = (jitterWave * 0.7 + shimmer * 0.3) * jitterAmount * (1 + freq * trebleScatter * 0.6);

      const x = -halfSpan + (column / (this.sampleCount - 1)) * this.horizontalSpan;
      const orbit = (0.004 + freq * 0.03) * trebleScatter;
      const xJitter =
        Math.sin(elapsed * (4.5 + bass * 16) + seed * 120) *
          shakeAmount *
          (0.12 + seed * 0.4 + freq * trebleScatter * 0.35) +
        Math.cos(elapsed * (1.3 + freq * 6.2) + seed * 18) * orbit;
      const zJitter =
        Math.cos(elapsed * (5.7 + treble * 21) + seed * 89) *
          (0.02 + noiseMagnitude * 0.22 + freq * trebleScatter * 0.14) +
        Math.sin(elapsed * (1.8 + freq * 5.4) + seed * 27) * orbit;

      this.positions[index] = x + xJitter;
      this.positions[index + 1] = coreY + verticalNoise;
      this.positions[index + 2] = zJitter;

      const density = clamp01(1 - Math.min(1, spreadToCenter));
      const baseAlpha = (0.16 + density * 0.82) * (0.35 + volume * 0.8 + treble * 0.25 + freq * trebleScatter * 0.18);
      this.alpha[i] = Math.max(this.alpha[i], baseAlpha);
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;

    const pointSize = (7 + treble * 5.4 + bass * 2.4) * preset.pointScale;
    this.points.material.uniforms.uPointSize.value += (pointSize - this.points.material.uniforms.uPointSize.value) * 0.16;
    this.points.material.uniforms.uBrightness.value = THREE.MathUtils.clamp(
      0.8 + preset.glowIntensity * 0.28 + volume * 0.3 + bass * 0.22,
      0.75,
      1.7
    );

    const warmth = clamp01(preset.warmth);
    this.points.material.uniforms.uColor.value.setRGB(
      1,
      THREE.MathUtils.lerp(1, 0.973, warmth),
      THREE.MathUtils.lerp(1, 0.9, warmth)
    );

    this.scene.rotation.z = Math.sin(elapsed * 0.6) * (0.01 + bass * 0.03);
    this.scene.position.x = Math.sin(elapsed * 1.6 + bass * 2.4) * shakeAmount * 0.28;
  }
}
