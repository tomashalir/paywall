import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class HorizonScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Mycelium',
      presets: [
        {
          name: 'Hyphae Bloom',
          curl: 0.76,
          drift: 0.92,
          speed: 0.8,
          flicker: 0.36,
          haze: 0.7,
          rainSpeed: 0.88,
          horizonBend: 0.72,
          rootSpread: 0.84
        },
        {
          name: 'Fracture Colony',
          curl: 1.22,
          drift: 1.24,
          speed: 1.1,
          flicker: 0.58,
          haze: 0.52,
          rainSpeed: 1.24,
          horizonBend: 1.1,
          rootSpread: 1.24
        },
        {
          name: 'Dormant Web',
          curl: 0.48,
          drift: 0.58,
          speed: 0.56,
          flicker: 0.2,
          haze: 0.95,
          rainSpeed: 0.52,
          horizonBend: 0.46,
          rootSpread: 0.62
        },
        {
          name: 'Acid Canopy',
          curl: 1.36,
          drift: 1.1,
          speed: 1.28,
          flicker: 0.66,
          haze: 0.6,
          rainSpeed: 1.42,
          horizonBend: 1.22,
          rootSpread: 1.4
        },
        {
          name: 'Frozen Rootline',
          curl: 0.42,
          drift: 0.48,
          speed: 0.48,
          flicker: 0.14,
          haze: 1.08,
          rainSpeed: 0.42,
          horizonBend: 0.34,
          rootSpread: 0.54
        }
      ],
      settings: [
        {
          id: 'curl',
          label: 'Curl',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'drift',
          label: 'Drift',
          min: 0.4,
          max: 2.2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'haze',
          label: 'Haze',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        }
      ]
    });

    this.branchCount = 26;
    this.segmentCount = 82;
    this.branches = [];
    this.branchSeed = new Float32Array(this.branchCount);
    this.branchDirection = new Float32Array(this.branchCount);

    this.tipPositions = new Float32Array(this.branchCount * 3);
    this.tips = null;

    this.mistCount = 2400;
    this.mistPositions = new Float32Array(this.mistCount * 3);
    this.mistPhase = new Float32Array(this.mistCount);
    this.mist = null;

    this.horizonSegments = 220;
    this.horizonPositions = new Float32Array(this.horizonSegments * 3);
    this.horizonLine = null;

    this.rainCount = 420;
    this.rainPositions = new Float32Array(this.rainCount * 6);
    this.rainPhase = new Float32Array(this.rainCount);
    this.rainDepth = new Float32Array(this.rainCount);
    this.rain = null;
  }

  init(params) {
    super.init(params);

    for (let i = 0; i < this.branchCount; i += 1) {
      const positions = new Float32Array(this.segmentCount * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending
        })
      );
      this.scene.add(line);
      this.branches.push({ positions, line });
      this.branchSeed[i] = Math.random() * Math.PI * 2;
      this.branchDirection[i] = Math.random() > 0.5 ? 1 : -1;
    }

    const tipGeometry = new THREE.BufferGeometry();
    tipGeometry.setAttribute('position', new THREE.BufferAttribute(this.tipPositions, 3));
    this.tips = new THREE.Points(
      tipGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.062,
        transparent: true,
        opacity: 0.74,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.tips);

    for (let i = 0; i < this.mistCount; i += 1) {
      const index = i * 3;
      this.mistPositions[index] = (Math.random() - 0.5) * 7.4;
      this.mistPositions[index + 1] = (Math.random() - 0.5) * 5.4;
      this.mistPositions[index + 2] = (Math.random() - 0.5) * 6.5;
      this.mistPhase[i] = Math.random() * Math.PI * 2;
    }
    const mistGeometry = new THREE.BufferGeometry();
    mistGeometry.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));
    this.mist = new THREE.Points(
      mistGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.022,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.mist);

    const horizonGeometry = new THREE.BufferGeometry();
    horizonGeometry.setAttribute('position', new THREE.BufferAttribute(this.horizonPositions, 3));
    this.horizonLine = new THREE.Line(
      horizonGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.horizonLine);

    for (let i = 0; i < this.rainCount; i += 1) {
      this.rainPhase[i] = Math.random() * Math.PI * 2;
      this.rainDepth[i] = (Math.random() - 0.5) * 6.8;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rain = new THREE.LineSegments(
      rainGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.rain);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const curlSetting = this.getSettingValue('curl');
    const driftSetting = this.getSettingValue('drift');
    const hazeSetting = this.getSettingValue('haze');

    const frequencies = audio.getFrequencyData();
    const volume = audio.getVolume();
    const sub = audio.getAverageInRange(20, 80) / 255;
    const bass = audio.getBass();
    const lowMid = audio.getAverageInRange(180, 620) / 255;
    const mid = audio.getAverageInRange(280, 2400) / 255;
    const presence = audio.getAverageInRange(2200, 6000) / 255;
    const treble = audio.getTreble();
    const air = audio.getAverageInRange(6000, 14000) / 255;

    for (let branchIndex = 0; branchIndex < this.branchCount; branchIndex += 1) {
      const branch = this.branches[branchIndex];
      const seed = this.branchSeed[branchIndex];
      const direction = this.branchDirection[branchIndex];
      let x = Math.sin(elapsed * 0.64 + seed) * 0.16;
      let y = Math.cos(elapsed * 0.52 + seed * 0.7) * 0.1;
      let z = Math.sin(elapsed * 0.45 + seed * 1.4) * 0.14;

      for (let i = 0; i < this.segmentCount; i += 1) {
        const index = i * 3;
        const p = i / (this.segmentCount - 1);
        const freq = frequencies[(i * 3 + branchIndex * 11) % frequencies.length] / 255;

        const bend =
          Math.sin(seed + p * 8.3 + elapsed * (0.9 + preset.speed * 0.8)) *
          preset.curl *
          curlSetting *
          preset.rootSpread;
        const twist =
          Math.cos(seed * 1.5 - p * 10.9 + elapsed * (1.2 + air * 2.2)) *
          preset.curl *
          curlSetting *
          0.78;
        const lift =
          (p - 0.28) *
          direction *
          preset.drift *
          driftSetting *
          (0.018 + bass * 0.05 + sub * 0.02);

        x += Math.cos(seed + p * 4.1) * 0.026 + bend * 0.02 + freq * 0.03;
        y += Math.sin(seed * 0.8 + p * 5.5) * 0.02 + lift + (freq - 0.5) * 0.03;
        z += Math.sin(seed * 1.2 + p * 6.2) * 0.024 + twist * 0.018;

        const scale = 0.7 + p * 1.45;
        const tremor = Math.sin(elapsed * 6 + p * 15 + seed) * preset.flicker * (treble + presence * 0.6) * 0.06;

        branch.positions[index] = x * scale + tremor;
        branch.positions[index + 1] = y * scale * 1.35 + tremor * 0.5;
        branch.positions[index + 2] = z * scale + Math.cos(elapsed * 4.8 + p * 13.1 + seed) * air * 0.08;
      }

      branch.line.geometry.attributes.position.needsUpdate = true;
      branch.line.material.opacity = THREE.MathUtils.clamp(
        0.18 + volume * 0.32 + treble * 0.26 - branchIndex * 0.004,
        0.09,
        0.92
      );
      branch.line.rotation.y = Math.sin(elapsed * 0.13 + seed) * 0.09;

      const tipIndex = (this.segmentCount - 1) * 3;
      this.tipPositions[branchIndex * 3] = branch.positions[tipIndex];
      this.tipPositions[branchIndex * 3 + 1] = branch.positions[tipIndex + 1];
      this.tipPositions[branchIndex * 3 + 2] = branch.positions[tipIndex + 2];
    }
    this.tips.geometry.attributes.position.needsUpdate = true;
    this.tips.material.opacity = THREE.MathUtils.clamp(0.28 + bass * 0.54 + treble * 0.2, 0.14, 1);
    this.tips.material.size = 0.052 + bass * 0.06 + presence * 0.022;

    for (let i = 0; i < this.mistCount; i += 1) {
      const index = i * 3;
      const phase = this.mistPhase[i];
      const theta = phase + elapsed * (0.08 + air * 0.22);
      const radius = 2.6 + bass * 2 + Math.sin(elapsed * 0.3 + phase) * 0.58;
      const tx = Math.cos(theta) * (radius + Math.sin(phase * 2.3) * 0.5);
      const ty = Math.sin(theta * 0.55 + phase) * 2.7;
      const tz = Math.sin(theta) * radius * 0.7;
      const pull = 0.01 + preset.haze * hazeSetting * 0.024;

      this.mistPositions[index] += (tx - this.mistPositions[index]) * pull;
      this.mistPositions[index + 1] += (ty - this.mistPositions[index + 1]) * pull;
      this.mistPositions[index + 2] += (tz - this.mistPositions[index + 2]) * pull;
    }
    this.mist.geometry.attributes.position.needsUpdate = true;
    this.mist.material.opacity = THREE.MathUtils.clamp(
      0.06 + lowMid * 0.1 + mid * 0.16 + preset.haze * hazeSetting * 0.08,
      0.06,
      0.34
    );

    for (let i = 0; i < this.horizonSegments; i += 1) {
      const p = i / (this.horizonSegments - 1);
      const x = THREE.MathUtils.lerp(-6.4, 6.4, p);
      const bend =
        Math.sin(x * 0.8 + elapsed * (1.1 + bass * 2)) * (0.06 + preset.horizonBend * 0.22) +
        Math.cos(x * 2.1 - elapsed * (1.8 + lowMid * 3)) * (0.03 + presence * 0.12);
      const index = i * 3;
      this.horizonPositions[index] = x;
      this.horizonPositions[index + 1] = -2.2 + bend;
      this.horizonPositions[index + 2] = Math.sin(elapsed * 0.9 + p * 14) * (0.08 + sub * 0.22);
    }
    this.horizonLine.geometry.attributes.position.needsUpdate = true;
    this.horizonLine.material.opacity = THREE.MathUtils.clamp(0.16 + bass * 0.34 + lowMid * 0.22, 0.1, 0.86);

    for (let i = 0; i < this.rainCount; i += 1) {
      const p = i / this.rainCount;
      const x = THREE.MathUtils.lerp(-6, 6, p);
      const phase = this.rainPhase[i];
      const yTop = 4.8 - ((elapsed * (1.6 + preset.rainSpeed * 1.8 + treble * 4.2) + phase * 2.3) % 9.6);
      const yBottom = yTop - (0.16 + treble * 0.75 + air * 0.44);
      const z = this.rainDepth[i] + Math.sin(elapsed * 3.2 + phase) * (0.08 + air * 0.2);

      const index = i * 6;
      this.rainPositions[index] = x;
      this.rainPositions[index + 1] = yTop;
      this.rainPositions[index + 2] = z;
      this.rainPositions[index + 3] = x + Math.sin(phase + elapsed * 1.2) * 0.02;
      this.rainPositions[index + 4] = yBottom;
      this.rainPositions[index + 5] = z;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    this.rain.material.opacity = THREE.MathUtils.clamp(0.08 + treble * 0.38 + air * 0.22, 0.08, 0.72);

    this.scene.rotation.x = Math.sin(elapsed * 0.2) * 0.06;
    this.scene.rotation.y = Math.cos(elapsed * 0.17) * 0.05;
  }
}
