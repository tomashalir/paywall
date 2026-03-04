import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class RadialBurstScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Corona',
      presets: [
        {
          name: 'Solar Bloom',
          petalTwist: 0.95,
          ringDepth: 0.72,
          spokeLength: 1.18,
          jitter: 0.22,
          sparkDrift: 0.82,
          pointSize: 0.025,
          corePulse: 0.72,
          arcWarp: 0.76
        },
        {
          name: 'Needle Storm',
          petalTwist: 1.4,
          ringDepth: 0.52,
          spokeLength: 1.45,
          jitter: 0.4,
          sparkDrift: 1.16,
          pointSize: 0.029,
          corePulse: 1.14,
          arcWarp: 1.22
        },
        {
          name: 'Halo Drift',
          petalTwist: 0.62,
          ringDepth: 1.02,
          spokeLength: 0.92,
          jitter: 0.16,
          sparkDrift: 0.58,
          pointSize: 0.022,
          corePulse: 0.52,
          arcWarp: 0.64
        },
        {
          name: 'Magnet Flare',
          petalTwist: 1.18,
          ringDepth: 1.22,
          spokeLength: 1.3,
          jitter: 0.34,
          sparkDrift: 1.36,
          pointSize: 0.03,
          corePulse: 1.26,
          arcWarp: 1.38
        },
        {
          name: 'Nebula Crown',
          petalTwist: 0.76,
          ringDepth: 0.88,
          spokeLength: 1.04,
          jitter: 0.24,
          sparkDrift: 0.96,
          pointSize: 0.026,
          corePulse: 0.82,
          arcWarp: 0.96
        }
      ],
      settings: [
        {
          id: 'burstScale',
          label: 'Burst Scale',
          min: 0.5,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'sparkFlow',
          label: 'Spark Flow',
          min: 0.4,
          max: 2.2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'corePulse',
          label: 'Core Pulse',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        }
      ]
    });

    this.spokeCount = 360;
    this.spokeAngles = new Float32Array(this.spokeCount);
    this.spokePhase = new Float32Array(this.spokeCount);
    this.spokePositions = new Float32Array(this.spokeCount * 6);
    this.spokes = null;

    this.haloCount = 240;
    this.haloPositions = new Float32Array(this.haloCount * 3);
    this.halo = null;

    this.arcCount = 3;
    this.arcSegments = 180;
    this.arcOffsets = [1.55, 1.98, 2.42];
    this.arcBands = [
      { min: 80, max: 300 },
      { min: 500, max: 2400 },
      { min: 3200, max: 12000 }
    ];
    this.arcPositionArrays = [];
    this.arcs = [];

    this.coreCount = 1800;
    this.coreBase = new Float32Array(this.coreCount * 3);
    this.corePositions = new Float32Array(this.coreCount * 3);
    this.corePhase = new Float32Array(this.coreCount);
    this.core = null;

    this.sparkCount = 3200;
    this.sparkPositions = new Float32Array(this.sparkCount * 3);
    this.sparkVelocity = new Float32Array(this.sparkCount * 3);
    this.sparkPhase = new Float32Array(this.sparkCount);
    this.sparks = null;
  }

  init(params) {
    super.init(params);

    for (let i = 0; i < this.spokeCount; i += 1) {
      this.spokeAngles[i] = (i / this.spokeCount) * Math.PI * 2;
      this.spokePhase[i] = Math.random() * Math.PI * 2;
    }

    const spokeGeometry = new THREE.BufferGeometry();
    spokeGeometry.setAttribute('position', new THREE.BufferAttribute(this.spokePositions, 3));
    this.spokes = new THREE.LineSegments(
      spokeGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.spokes);

    const haloGeometry = new THREE.BufferGeometry();
    haloGeometry.setAttribute('position', new THREE.BufferAttribute(this.haloPositions, 3));
    this.halo = new THREE.LineLoop(
      haloGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.halo);

    for (let i = 0; i < this.arcCount; i += 1) {
      const array = new Float32Array(this.arcSegments * 3);
      this.arcPositionArrays.push(array);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(array, 3));
      const arc = new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.24,
          blending: THREE.AdditiveBlending
        })
      );
      this.arcs.push(arc);
      this.scene.add(arc);
    }

    for (let i = 0; i < this.coreCount; i += 1) {
      const index = i * 3;
      let x = 0;
      let y = 0;
      let z = 0;
      while (x * x + y * y + z * z > 1 || (x === 0 && y === 0 && z === 0)) {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
      }
      this.coreBase[index] = x;
      this.coreBase[index + 1] = y;
      this.coreBase[index + 2] = z;
      this.corePositions[index] = x;
      this.corePositions[index + 1] = y;
      this.corePositions[index + 2] = z;
      this.corePhase[i] = Math.random() * Math.PI * 2;
    }

    const coreGeometry = new THREE.BufferGeometry();
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(this.corePositions, 3));
    this.core = new THREE.Points(
      coreGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.core);

    for (let i = 0; i < this.sparkCount; i += 1) {
      const index = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 4.8;
      const y = (Math.random() - 0.5) * 4;

      this.sparkPositions[index] = Math.cos(theta) * radius;
      this.sparkPositions[index + 1] = y;
      this.sparkPositions[index + 2] = Math.sin(theta) * radius;

      this.sparkVelocity[index] = (Math.random() - 0.5) * 0.02;
      this.sparkVelocity[index + 1] = (Math.random() - 0.5) * 0.02;
      this.sparkVelocity[index + 2] = (Math.random() - 0.5) * 0.02;

      this.sparkPhase[i] = Math.random() * Math.PI * 2;
    }

    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    this.sparks = new THREE.Points(
      sparkGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.024,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.sparks);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const burstScale = this.getSettingValue('burstScale');
    const sparkFlow = this.getSettingValue('sparkFlow');
    const corePulseSetting = this.getSettingValue('corePulse');

    const volume = audio.getVolume();
    const sub = audio.getAverageInRange(20, 80) / 255;
    const bass = audio.getBass();
    const lowMid = audio.getAverageInRange(180, 620) / 255;
    const mid = audio.getAverageInRange(280, 2400) / 255;
    const presence = audio.getAverageInRange(2200, 6000) / 255;
    const treble = audio.getTreble();
    const air = audio.getAverageInRange(6000, 14000) / 255;

    const baseRadius = (1.2 + bass * 1.9) * burstScale;

    for (let i = 0; i < this.spokeCount; i += 1) {
      const phase = this.spokePhase[i];
      const angle =
        this.spokeAngles[i] +
        elapsed * (0.25 + mid * 0.8) * preset.petalTwist +
        Math.sin(elapsed * 0.8 + phase) * (0.1 + bass * 0.2);

      const ringWobble = Math.sin(elapsed * 2.3 + i * 0.14 + phase) * preset.ringDepth * (0.22 + bass * 0.45);
      const radius = baseRadius + ringWobble;
      const length =
        preset.spokeLength *
        burstScale *
        (0.45 + treble * 2.2 + Math.cos(elapsed * 3.6 + phase * 1.3 + i * 0.08) * 0.3);

      const x = Math.cos(angle) * radius;
      const y = Math.sin(elapsed * 0.65 + i * 0.09 + phase) * (0.2 + lowMid * 1.1);
      const z = Math.sin(angle) * radius;

      const jitter = Math.sin(elapsed * 8 + i * 0.91 + phase) * preset.jitter * (0.1 + air * 0.5);
      const tx = Math.cos(angle) * (radius + length) + Math.sin(angle * 3.2 + elapsed * 1.3) * jitter;
      const ty = y + Math.cos(elapsed * 5 + i * 0.14 + phase) * jitter;
      const tz = Math.sin(angle) * (radius + length) + Math.cos(angle * 2.7 - elapsed * 1.1) * jitter;

      const index = i * 6;
      this.spokePositions[index] = x;
      this.spokePositions[index + 1] = y;
      this.spokePositions[index + 2] = z;
      this.spokePositions[index + 3] = tx;
      this.spokePositions[index + 4] = ty;
      this.spokePositions[index + 5] = tz;
    }
    this.spokes.geometry.attributes.position.needsUpdate = true;
    this.spokes.material.opacity = THREE.MathUtils.clamp(0.2 + volume * 0.36 + treble * 0.26, 0.12, 0.9);

    for (let i = 0; i < this.haloCount; i += 1) {
      const p = i / this.haloCount;
      const angle = p * Math.PI * 2;
      const wobble =
        Math.sin(angle * 8 + elapsed * (1.4 + bass * 2.1)) * (0.12 + preset.ringDepth * 0.16) +
        Math.cos(angle * 13 - elapsed * (1.8 + treble * 3.2)) * (0.06 + air * 0.12);
      const radius = baseRadius * 1.15 + wobble;
      const index = i * 3;
      this.haloPositions[index] = Math.cos(angle) * radius;
      this.haloPositions[index + 1] = Math.sin(angle * 2 + elapsed * 0.7) * (0.08 + mid * 0.5);
      this.haloPositions[index + 2] = Math.sin(angle) * radius;
    }
    this.halo.geometry.attributes.position.needsUpdate = true;
    this.halo.material.opacity = THREE.MathUtils.clamp(0.16 + bass * 0.42 + air * 0.2, 0.08, 0.78);

    for (let arcIndex = 0; arcIndex < this.arcCount; arcIndex += 1) {
      const arcArray = this.arcPositionArrays[arcIndex];
      const band = this.arcBands[arcIndex];
      const bandEnergy = audio.getAverageInRange(band.min, band.max) / 255;
      const baseArcRadius = this.arcOffsets[arcIndex] + bandEnergy * (0.9 + preset.arcWarp * 0.8);

      for (let i = 0; i < this.arcSegments; i += 1) {
        const p = i / this.arcSegments;
        const angle = p * Math.PI * 2;
        const ripple =
          Math.sin(angle * (6 + arcIndex * 3) + elapsed * (1.6 + bandEnergy * 3.8)) * (0.06 + preset.arcWarp * 0.14) +
          Math.cos(angle * (10 + arcIndex * 4) - elapsed * (1 + air * 2.8)) * (0.02 + treble * 0.12);

        const index = i * 3;
        arcArray[index] = Math.cos(angle) * (baseArcRadius + ripple);
        arcArray[index + 1] = Math.sin(elapsed * (0.5 + arcIndex * 0.3) + angle * 3) * (0.1 + bandEnergy * 0.45);
        arcArray[index + 2] = Math.sin(angle) * (baseArcRadius + ripple);
      }

      this.arcs[arcIndex].geometry.attributes.position.needsUpdate = true;
      this.arcs[arcIndex].material.opacity = THREE.MathUtils.clamp(0.1 + bandEnergy * 0.46 + air * 0.1, 0.08, 0.78);
      this.arcs[arcIndex].rotation.x = Math.sin(elapsed * 0.7 + arcIndex) * 0.24;
      this.arcs[arcIndex].rotation.y = Math.cos(elapsed * 0.6 + arcIndex * 0.8) * 0.28;
    }

    for (let i = 0; i < this.coreCount; i += 1) {
      const index = i * 3;
      const phase = this.corePhase[i];
      const bx = this.coreBase[index];
      const by = this.coreBase[index + 1];
      const bz = this.coreBase[index + 2];

      const pulse =
        0.65 +
        preset.corePulse *
          corePulseSetting *
          (sub * 0.8 + bass * 1.3 + Math.sin(elapsed * 3.2 + phase * 1.4) * (0.04 + presence * 0.1));
      const jitter = Math.sin(elapsed * 8.4 + phase * 2.1) * (0.02 + treble * 0.08);

      this.corePositions[index] = bx * pulse + jitter;
      this.corePositions[index + 1] = by * pulse + Math.cos(elapsed * 6.2 + phase * 1.9) * (0.02 + presence * 0.06);
      this.corePositions[index + 2] = bz * pulse - jitter;
    }
    this.core.geometry.attributes.position.needsUpdate = true;
    this.core.material.size = 0.014 + bass * 0.02 + presence * 0.012;
    this.core.material.opacity = THREE.MathUtils.clamp(0.12 + bass * 0.32 + presence * 0.22, 0.1, 0.82);

    const swirl = (0.28 + mid * 1.3) * preset.sparkDrift * sparkFlow;
    for (let i = 0; i < this.sparkCount; i += 1) {
      const index = i * 3;
      const phase = this.sparkPhase[i];

      const x = this.sparkPositions[index];
      const y = this.sparkPositions[index + 1];
      const z = this.sparkPositions[index + 2];

      this.sparkVelocity[index] += (-z * 0.0018 + Math.sin(elapsed * 2.4 + phase) * 0.0006) * swirl;
      this.sparkVelocity[index + 2] += (x * 0.0018 + Math.cos(elapsed * 2.1 + phase) * 0.0006) * swirl;
      this.sparkVelocity[index + 1] += Math.sin(elapsed * 3.2 + phase * 1.7) * 0.0005 * (1 + treble * 2.4);

      this.sparkVelocity[index] *= 0.985;
      this.sparkVelocity[index + 1] *= 0.985;
      this.sparkVelocity[index + 2] *= 0.985;

      this.sparkPositions[index] += this.sparkVelocity[index] * (1 + bass * 1.5);
      this.sparkPositions[index + 1] += this.sparkVelocity[index + 1] * (1 + air * 1.8);
      this.sparkPositions[index + 2] += this.sparkVelocity[index + 2] * (1 + bass * 1.5);

      const radius = Math.sqrt(
        this.sparkPositions[index] * this.sparkPositions[index] +
          this.sparkPositions[index + 1] * this.sparkPositions[index + 1] +
          this.sparkPositions[index + 2] * this.sparkPositions[index + 2]
      );

      if (radius > 6.6 || radius < 0.35) {
        const theta = Math.random() * Math.PI * 2;
        const r = 1 + Math.random() * 4.5;
        this.sparkPositions[index] = Math.cos(theta) * r;
        this.sparkPositions[index + 1] = (Math.random() - 0.5) * 3.5;
        this.sparkPositions[index + 2] = Math.sin(theta) * r;
        this.sparkVelocity[index] = 0;
        this.sparkVelocity[index + 1] = 0;
        this.sparkVelocity[index + 2] = 0;
      }
    }

    this.sparks.geometry.attributes.position.needsUpdate = true;
    this.sparks.material.size += (preset.pointSize + air * 0.012 - this.sparks.material.size) * 0.18;
    this.sparks.material.opacity = THREE.MathUtils.clamp(0.14 + volume * 0.34 + treble * 0.28, 0.12, 0.88);

    this.scene.rotation.y = Math.sin(elapsed * 0.18) * 0.09;
    this.scene.rotation.x = Math.cos(elapsed * 0.14) * 0.05;
  }
}
