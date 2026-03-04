import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class SeismicRingsScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Seismic Rings',
      presets: [
        {
          name: 'Fault Glow',
          ridge: 0.78,
          shift: 0.66,
          crackle: 0.72,
          plume: 0.82,
          ringWarp: 0.74,
          pointSize: 0.02
        },
        {
          name: 'Plate Break',
          ridge: 1.22,
          shift: 1.1,
          crackle: 1.3,
          plume: 1.14,
          ringWarp: 1.2,
          pointSize: 0.023
        },
        {
          name: 'Deep Calm',
          ridge: 0.54,
          shift: 0.44,
          crackle: 0.46,
          plume: 0.58,
          ringWarp: 0.52,
          pointSize: 0.017
        },
        {
          name: 'Magma Pulse',
          ridge: 1.04,
          shift: 0.94,
          crackle: 1.12,
          plume: 1.34,
          ringWarp: 1.1,
          pointSize: 0.024
        },
        {
          name: 'Aftershock Veil',
          ridge: 0.88,
          shift: 0.74,
          crackle: 0.84,
          plume: 0.94,
          ringWarp: 0.9,
          pointSize: 0.021
        }
      ],
      settings: [
        {
          id: 'pressure',
          label: 'Pressure',
          min: 0.4,
          max: 2.3,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'fracture',
          label: 'Fracture',
          min: 0.4,
          max: 2.2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'mist',
          label: 'Mist',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        }
      ]
    });

    this.ringCount = 6;
    this.ringSegments = 220;
    this.ringOffsets = [0.8, 1.45, 2.1, 2.75, 3.4, 4.05];
    this.ringBandMap = [
      { min: 20, max: 80 },
      { min: 80, max: 180 },
      { min: 180, max: 620 },
      { min: 620, max: 2200 },
      { min: 2200, max: 6000 },
      { min: 6000, max: 14000 }
    ];
    this.ringPositionArrays = [];
    this.rings = [];

    this.crackCount = 24;
    this.crackSegments = 54;
    this.crackSeed = new Float32Array(this.crackCount);
    this.crackPositions = [];
    this.cracks = [];

    this.pillarCount = 140;
    this.pillarPositions = new Float32Array(this.pillarCount * 6);
    this.pillarPhase = new Float32Array(this.pillarCount);
    this.pillars = null;

    this.ashCount = 3000;
    this.ashPositions = new Float32Array(this.ashCount * 3);
    this.ashPhase = new Float32Array(this.ashCount);
    this.ash = null;

    this.plumeCount = 360;
    this.plumePositions = new Float32Array(this.plumeCount * 6);
    this.plumePhase = new Float32Array(this.plumeCount);
    this.plumes = null;
  }

  init(params) {
    super.init(params);

    for (let ringIndex = 0; ringIndex < this.ringCount; ringIndex += 1) {
      const positions = new Float32Array(this.ringSegments * 3);
      this.ringPositionArrays.push(positions);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.26,
          blending: THREE.AdditiveBlending
        })
      );
      line.rotation.x = -Math.PI * 0.5;
      this.rings.push(line);
      this.scene.add(line);
    }

    for (let crackIndex = 0; crackIndex < this.crackCount; crackIndex += 1) {
      const positions = new Float32Array(this.crackSegments * 3);
      this.crackSeed[crackIndex] = Math.random() * Math.PI * 2;
      this.crackPositions.push(positions);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const crack = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending
        })
      );
      crack.rotation.x = -Math.PI * 0.5;
      this.cracks.push(crack);
      this.scene.add(crack);
    }

    for (let i = 0; i < this.pillarCount; i += 1) {
      this.pillarPhase[i] = Math.random() * Math.PI * 2;
    }

    const pillarGeometry = new THREE.BufferGeometry();
    pillarGeometry.setAttribute('position', new THREE.BufferAttribute(this.pillarPositions, 3));
    this.pillars = new THREE.LineSegments(
      pillarGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.pillars);

    for (let i = 0; i < this.ashCount; i += 1) {
      const index = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.random() * 4.6;

      this.ashPositions[index] = Math.cos(theta) * radius;
      this.ashPositions[index + 1] = THREE.MathUtils.randFloat(-0.4, 2.8);
      this.ashPositions[index + 2] = Math.sin(theta) * radius;
      this.ashPhase[i] = Math.random() * Math.PI * 2;
    }

    const ashGeometry = new THREE.BufferGeometry();
    ashGeometry.setAttribute('position', new THREE.BufferAttribute(this.ashPositions, 3));
    this.ash = new THREE.Points(
      ashGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.ash);

    for (let i = 0; i < this.plumeCount; i += 1) {
      this.plumePhase[i] = Math.random() * Math.PI * 2;
    }

    const plumeGeometry = new THREE.BufferGeometry();
    plumeGeometry.setAttribute('position', new THREE.BufferAttribute(this.plumePositions, 3));
    this.plumes = new THREE.LineSegments(
      plumeGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.plumes);

    this.scene.fog = new THREE.FogExp2(0x000000, 0.28);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const pressure = this.getSettingValue('pressure');
    const fracture = this.getSettingValue('fracture');
    const mist = this.getSettingValue('mist');

    const frequencies = audio.getFrequencyData();
    const volume = audio.getVolume();
    const sub = audio.getAverageInRange(20, 80) / 255;
    const bass = audio.getBass();
    const lowMid = audio.getAverageInRange(180, 620) / 255;
    const mid = audio.getAverageInRange(320, 2400) / 255;
    const presence = audio.getAverageInRange(2200, 6000) / 255;
    const treble = audio.getTreble();
    const air = audio.getAverageInRange(6000, 14000) / 255;

    for (let ringIndex = 0; ringIndex < this.ringCount; ringIndex += 1) {
      const positions = this.ringPositionArrays[ringIndex];
      const radiusBase = this.ringOffsets[ringIndex] + bass * 1.8 * pressure;
      const band = this.ringBandMap[ringIndex];
      const bandEnergy = audio.getAverageInRange(band.min, band.max) / 255;

      for (let i = 0; i < this.ringSegments; i += 1) {
        const p = i / this.ringSegments;
        const angle = p * Math.PI * 2;
        const ripple =
          Math.sin(angle * (3 + ringIndex * 1.8) + elapsed * (1.4 + bandEnergy * 4.2)) *
            (0.08 + preset.ringWarp * 0.16 + bandEnergy * 0.3) +
          Math.cos(angle * (7 + ringIndex * 2.4) - elapsed * (1.7 + treble * 3.2)) * (0.04 + air * 0.1);
        const lift =
          Math.sin(angle * (2 + ringIndex) + elapsed * 1.1) * (0.03 + preset.shift * 0.14 + lowMid * 0.22) * pressure;

        const index = i * 3;
        positions[index] = Math.cos(angle) * (radiusBase + ripple);
        positions[index + 1] = lift;
        positions[index + 2] = Math.sin(angle) * (radiusBase + ripple);
      }

      this.rings[ringIndex].geometry.attributes.position.needsUpdate = true;
      this.rings[ringIndex].material.opacity = THREE.MathUtils.clamp(0.08 + bandEnergy * 0.44 + volume * 0.18, 0.06, 0.78);
      this.rings[ringIndex].rotation.z = Math.sin(elapsed * 0.22 + ringIndex * 0.5) * 0.2;
    }

    for (let crackIndex = 0; crackIndex < this.crackCount; crackIndex += 1) {
      const positions = this.crackPositions[crackIndex];
      const seed = this.crackSeed[crackIndex];

      let x = Math.sin(seed + elapsed * 0.4) * 0.12;
      let y = 0;
      let z = Math.cos(seed + elapsed * 0.5) * 0.12;

      for (let i = 0; i < this.crackSegments; i += 1) {
        const p = i / (this.crackSegments - 1);
        const freq = frequencies[(i * 5 + crackIndex * 13) % frequencies.length] / 255;

        const drift =
          Math.sin(seed + p * 10 + elapsed * (1 + preset.shift * 0.9)) * (0.06 + lowMid * 0.18) * fracture;
        const jag = Math.cos(seed * 1.6 - p * 14 + elapsed * (1.3 + treble * 2.6)) * (0.04 + preset.crackle * 0.16) * fracture;
        const forward = 0.06 + p * (0.1 + bass * 0.18 + freq * 0.24);

        x += Math.cos(seed + p * 3.8) * forward + drift;
        z += Math.sin(seed + p * 4.2) * forward + jag;
        y = Math.sin(elapsed * 3.2 + p * 16 + seed) * (0.02 + presence * 0.08);

        const index = i * 3;
        positions[index] = x;
        positions[index + 1] = y;
        positions[index + 2] = z;
      }

      this.cracks[crackIndex].geometry.attributes.position.needsUpdate = true;
      this.cracks[crackIndex].material.opacity = THREE.MathUtils.clamp(
        0.08 + mid * 0.26 + treble * 0.24 - crackIndex * 0.003,
        0.05,
        0.66
      );
      this.cracks[crackIndex].rotation.y = Math.sin(elapsed * 0.15 + seed) * 0.08;
    }

    for (let i = 0; i < this.pillarCount; i += 1) {
      const phase = this.pillarPhase[i];
      const p = i / this.pillarCount;
      const angle = p * Math.PI * 2 + elapsed * (0.16 + lowMid * 0.4);
      const radius = 0.8 + (i % 7) * 0.5 + Math.sin(phase + elapsed * 0.7) * 0.2;
      const height =
        (0.08 + bass * 1.8 * pressure + Math.sin(elapsed * 5 + phase) * 0.2) *
        (0.6 + preset.ridge * 0.8 + (i % 5) * 0.06);

      const index = i * 6;
      this.pillarPositions[index] = Math.cos(angle) * radius;
      this.pillarPositions[index + 1] = -0.08;
      this.pillarPositions[index + 2] = Math.sin(angle) * radius;
      this.pillarPositions[index + 3] = Math.cos(angle) * radius;
      this.pillarPositions[index + 4] = height;
      this.pillarPositions[index + 5] = Math.sin(angle) * radius;
    }
    this.pillars.geometry.attributes.position.needsUpdate = true;
    this.pillars.material.opacity = THREE.MathUtils.clamp(0.1 + bass * 0.48 + presence * 0.18, 0.08, 0.86);

    for (let i = 0; i < this.ashCount; i += 1) {
      const index = i * 3;
      const phase = this.ashPhase[i];

      this.ashPositions[index] += Math.sin(elapsed * 1.2 + phase) * (0.002 + mid * 0.008) * mist;
      this.ashPositions[index + 2] += Math.cos(elapsed * 1.4 + phase) * (0.002 + lowMid * 0.008) * mist;
      this.ashPositions[index + 1] += dt * (0.3 + presence * 1.8 + preset.plume) * mist;

      if (this.ashPositions[index + 1] > 3.2 + (i % 11) * 0.05) {
        this.ashPositions[index + 1] = -0.3;
      }

      const radius = Math.sqrt(this.ashPositions[index] * this.ashPositions[index] + this.ashPositions[index + 2] * this.ashPositions[index + 2]);
      if (radius > 5.2) {
        this.ashPositions[index] *= 0.84;
        this.ashPositions[index + 2] *= 0.84;
      }
    }
    this.ash.geometry.attributes.position.needsUpdate = true;
    this.ash.material.size += (preset.pointSize * mist + air * 0.014 - this.ash.material.size) * 0.2;
    this.ash.material.opacity = THREE.MathUtils.clamp(0.08 + treble * 0.28 + volume * 0.22, 0.06, 0.62);

    for (let i = 0; i < this.plumeCount; i += 1) {
      const phase = this.plumePhase[i];
      const p = i / this.plumeCount;
      const theta = p * Math.PI * 2;
      const base = 0.4 + bass * 1.5 + Math.sin(elapsed * 2 + phase) * 0.2;
      const top = base + 0.12 + treble * 0.5;

      const x = Math.cos(theta) * (0.4 + p * 2 + Math.sin(elapsed + phase) * 0.12);
      const z = Math.sin(theta) * (0.4 + p * 2 + Math.cos(elapsed * 0.8 + phase) * 0.12);

      const index = i * 6;
      this.plumePositions[index] = x;
      this.plumePositions[index + 1] = base * 0.1;
      this.plumePositions[index + 2] = z;
      this.plumePositions[index + 3] = x + Math.sin(elapsed * 3 + phase) * 0.05;
      this.plumePositions[index + 4] = top * preset.plume;
      this.plumePositions[index + 5] = z + Math.cos(elapsed * 2.4 + phase) * 0.05;
    }
    this.plumes.geometry.attributes.position.needsUpdate = true;
    this.plumes.material.opacity = THREE.MathUtils.clamp(0.08 + treble * 0.36 + air * 0.22, 0.06, 0.74);

    this.scene.rotation.y = Math.sin(elapsed * 0.13) * 0.08;
    this.scene.rotation.x = Math.cos(elapsed * 0.11) * 0.05;
  }
}
