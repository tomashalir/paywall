import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class WaveformScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Nerve',
      presets: [
        {
          name: 'Synaptic Coil',
          amplitude: 0.94,
          coilDensity: 6.8,
          wander: 0.52,
          glitch: 0.3,
          sporePull: 0.72,
          pointSize: 0.026,
          barHeight: 0.84,
          barSpread: 0.9,
          echoWarp: 0.72
        },
        {
          name: 'Frayed Axon',
          amplitude: 1.24,
          coilDensity: 8.3,
          wander: 0.92,
          glitch: 0.46,
          sporePull: 1.08,
          pointSize: 0.03,
          barHeight: 1.26,
          barSpread: 1.18,
          echoWarp: 1.12
        },
        {
          name: 'Quiet Tendon',
          amplitude: 0.72,
          coilDensity: 5.4,
          wander: 0.34,
          glitch: 0.18,
          sporePull: 0.5,
          pointSize: 0.022,
          barHeight: 0.58,
          barSpread: 0.76,
          echoWarp: 0.46
        },
        {
          name: 'Neural Storm',
          amplitude: 1.36,
          coilDensity: 9.2,
          wander: 1,
          glitch: 0.58,
          sporePull: 1.24,
          pointSize: 0.032,
          barHeight: 1.5,
          barSpread: 1.34,
          echoWarp: 1.32
        },
        {
          name: 'Signal Lattice',
          amplitude: 0.84,
          coilDensity: 6.1,
          wander: 0.46,
          glitch: 0.24,
          sporePull: 0.66,
          pointSize: 0.024,
          barHeight: 1,
          barSpread: 0.84,
          echoWarp: 0.9
        }
      ],
      settings: [
        {
          id: 'amplitude',
          label: 'Amplitude',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'coilDensity',
          label: 'Coil Density',
          min: 0.5,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'sporePull',
          label: 'Spore Pull',
          min: 0.4,
          max: 2.4,
          step: 0.01,
          defaultValue: 1
        }
      ]
    });

    this.sampleCount = 560;
    this.strandCount = 4;
    this.strands = [];

    this.sporeCount = 2600;
    this.sporePositions = new Float32Array(this.sporeCount * 3);
    this.sporePhase = new Float32Array(this.sporeCount);
    this.spores = null;

    this.barCount = 84;
    this.barPositions = new Float32Array(this.barCount * 6);
    this.bars = null;

    this.echoCount = 220;
    this.echoPositions = new Float32Array(this.echoCount * 3);
    this.echo = null;
  }

  init(params) {
    super.init(params);

    for (let strandIndex = 0; strandIndex < this.strandCount; strandIndex += 1) {
      const positions = new Float32Array(this.sampleCount * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.84 - strandIndex * 0.16,
          blending: THREE.AdditiveBlending
        })
      );
      this.scene.add(line);
      this.strands.push({ line, positions });
    }

    for (let i = 0; i < this.sporeCount; i += 1) {
      const index = i * 3;
      this.sporePositions[index] = (Math.random() - 0.5) * 4.5;
      this.sporePositions[index + 1] = (Math.random() - 0.5) * 8;
      this.sporePositions[index + 2] = (Math.random() - 0.5) * 3.8;
      this.sporePhase[i] = Math.random() * Math.PI * 2;
    }
    const sporeGeometry = new THREE.BufferGeometry();
    sporeGeometry.setAttribute('position', new THREE.BufferAttribute(this.sporePositions, 3));
    this.spores = new THREE.Points(
      sporeGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.028,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.spores);

    const barGeometry = new THREE.BufferGeometry();
    barGeometry.setAttribute('position', new THREE.BufferAttribute(this.barPositions, 3));
    this.bars = new THREE.LineSegments(
      barGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.bars);

    const echoGeometry = new THREE.BufferGeometry();
    echoGeometry.setAttribute('position', new THREE.BufferAttribute(this.echoPositions, 3));
    this.echo = new THREE.LineLoop(
      echoGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.echo);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const amplitudeSetting = this.getSettingValue('amplitude');
    const coilDensitySetting = this.getSettingValue('coilDensity');
    const sporePullSetting = this.getSettingValue('sporePull');

    const wave = audio.getTimeData();
    const frequencies = audio.getFrequencyData();
    const volume = audio.getVolume();
    const sub = audio.getAverageInRange(20, 80) / 255;
    const bass = audio.getBass();
    const lowMid = audio.getAverageInRange(180, 620) / 255;
    const mid = audio.getAverageInRange(300, 2400) / 255;
    const presence = audio.getAverageInRange(2200, 6000) / 255;
    const treble = audio.getTreble();
    const air = audio.getAverageInRange(6000, 14000) / 255;

    for (let strandIndex = 0; strandIndex < this.strands.length; strandIndex += 1) {
      const strand = this.strands[strandIndex];
      const phaseOffset = strandIndex * 1.36;

      for (let i = 0; i < this.sampleCount; i += 1) {
        const index = i * 3;
        const waveSample = wave[(i * 2 + strandIndex * 13) % wave.length];
        const signal = (waveSample - 128) / 128;
        const p = i / (this.sampleCount - 1);

        const theta =
          p * (Math.PI * preset.coilDensity * coilDensitySetting) +
          elapsed * (0.55 + bass * 0.95) +
          phaseOffset +
          signal * (0.3 + treble * 0.7);

        const spineY = THREE.MathUtils.lerp(-4.2, 4.2, p);
        const radius =
          0.95 +
          signal * (1.3 + volume * 1.9) * preset.amplitude * amplitudeSetting +
          Math.sin(elapsed * 1.8 + p * 9 + phaseOffset) * (0.14 + mid * 0.24);
        const wander = Math.sin(p * 13 + elapsed * 2.8 + phaseOffset) * preset.wander * (0.2 + mid * 0.5);

        strand.positions[index] = Math.cos(theta) * radius + wander;
        strand.positions[index + 1] =
          spineY +
          signal * (1 + volume * 1.8) * preset.amplitude * amplitudeSetting +
          Math.sin(theta * 0.72 + phaseOffset) * 0.3 * presence;
        strand.positions[index + 2] =
          Math.sin(theta) * radius * 0.84 +
          Math.cos(p * 11 - elapsed * 3.2 + phaseOffset) * preset.glitch * treble;
      }

      strand.line.geometry.attributes.position.needsUpdate = true;
      strand.line.material.opacity = THREE.MathUtils.clamp(
        0.22 + volume * 0.34 + treble * 0.24 - strandIndex * 0.08,
        0.12,
        0.92
      );
      strand.line.rotation.y = Math.sin(elapsed * 0.23 + strandIndex * 0.4) * 0.12;
      strand.line.rotation.x = Math.cos(elapsed * 0.16 + strandIndex * 0.7) * 0.06;
    }

    for (let i = 0; i < this.sporeCount; i += 1) {
      const index = i * 3;
      const phase = this.sporePhase[i];

      const freq = frequencies[i % frequencies.length] / 255;
      const targetTheta = elapsed * (0.26 + air * 0.24) + phase;
      const targetRadius = 1.2 + bass * 2.1 + freq * 0.8;
      const targetX = Math.cos(targetTheta) * targetRadius;
      const targetY = Math.sin(phase * 0.74 + elapsed * 0.95) * 3.9 + (freq - 0.5) * 1.2;
      const targetZ = Math.sin(targetTheta) * targetRadius * 0.82;

      const pull = (0.01 + volume * 0.05) * preset.sporePull * sporePullSetting;
      this.sporePositions[index] += (targetX - this.sporePositions[index]) * pull;
      this.sporePositions[index + 1] += (targetY - this.sporePositions[index + 1]) * pull;
      this.sporePositions[index + 2] += (targetZ - this.sporePositions[index + 2]) * pull;

      this.sporePositions[index] += Math.sin(elapsed * 3 + phase * 1.8) * 0.0022 * (1 + treble * 2.2);
      this.sporePositions[index + 1] += Math.cos(elapsed * 2.4 + phase * 1.1) * 0.0018 * (1 + mid * 2.2);
      this.sporePositions[index + 2] += Math.sin(elapsed * 3.7 + phase * 2.3) * 0.002 * (1 + air * 2);
    }
    this.spores.geometry.attributes.position.needsUpdate = true;
    this.spores.material.size += (preset.pointSize * amplitudeSetting + air * 0.012 - this.spores.material.size) * 0.18;
    this.spores.material.opacity = THREE.MathUtils.clamp(0.16 + treble * 0.35 + volume * 0.26, 0.12, 0.86);

    for (let i = 0; i < this.barCount; i += 1) {
      const p = i / (this.barCount - 1);
      const x = THREE.MathUtils.lerp(-5.2, 5.2, p);
      const bin = Math.floor(p * (frequencies.length - 1));
      const freq = frequencies[bin] / 255;

      let bandScale = 1;
      if (p < 0.22) {
        bandScale = 0.7 + (sub + bass) * 2.1;
      } else if (p < 0.58) {
        bandScale = 0.8 + (lowMid + mid) * 1.8;
      } else {
        bandScale = 0.9 + (presence + treble + air) * 1.55;
      }

      const height =
        (0.18 + freq * 2.7 * preset.barHeight * bandScale) *
        (0.65 + Math.sin(elapsed * 2.8 + i * 0.43) * 0.08 + bass * 0.2);
      const zBend = Math.sin(elapsed * 1.8 + p * 12) * (0.1 + preset.barSpread * 0.22 + air * 0.3);

      const index = i * 6;
      this.barPositions[index] = x;
      this.barPositions[index + 1] = -4.6;
      this.barPositions[index + 2] = zBend;
      this.barPositions[index + 3] = x;
      this.barPositions[index + 4] = -4.6 + height;
      this.barPositions[index + 5] = -zBend;
    }
    this.bars.geometry.attributes.position.needsUpdate = true;
    this.bars.material.opacity = THREE.MathUtils.clamp(0.14 + lowMid * 0.2 + treble * 0.34, 0.1, 0.86);

    for (let i = 0; i < this.echoCount; i += 1) {
      const p = i / this.echoCount;
      const angle = p * Math.PI * 2;
      const radialWave =
        Math.sin(angle * 5 + elapsed * (1.2 + bass * 2.2)) * (0.18 + preset.echoWarp * 0.3) +
        Math.cos(angle * 9 - elapsed * (1.6 + presence * 2.8)) * (0.08 + air * 0.2);
      const radius = 2 + preset.echoWarp * 0.9 + radialWave;
      const index = i * 3;
      this.echoPositions[index] = Math.cos(angle) * radius;
      this.echoPositions[index + 1] = Math.sin(angle * 2 + elapsed * 0.8) * (0.12 + mid * 0.45);
      this.echoPositions[index + 2] = Math.sin(angle) * radius;
    }
    this.echo.geometry.attributes.position.needsUpdate = true;
    this.echo.material.opacity = THREE.MathUtils.clamp(0.08 + bass * 0.26 + air * 0.22, 0.06, 0.64);

    this.scene.rotation.y = Math.sin(elapsed * 0.19) * 0.08;
    this.scene.rotation.x = Math.cos(elapsed * 0.13) * 0.06;
  }
}
