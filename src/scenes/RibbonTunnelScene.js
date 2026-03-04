import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class RibbonTunnelScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Ribbon Tunnel',
      presets: [
        {
          name: 'Pulse Corridor',
          width: 0.78,
          twist: 0.72,
          depth: 1,
          drift: 0.66,
          gateWarp: 0.72,
          pointSize: 0.02
        },
        {
          name: 'Fracture Drive',
          width: 1.14,
          twist: 1.28,
          depth: 1.34,
          drift: 1.08,
          gateWarp: 1.26,
          pointSize: 0.024
        },
        {
          name: 'Quiet Transit',
          width: 0.58,
          twist: 0.5,
          depth: 0.72,
          drift: 0.44,
          gateWarp: 0.52,
          pointSize: 0.017
        },
        {
          name: 'Slipstream Melt',
          width: 0.96,
          twist: 1.02,
          depth: 1.18,
          drift: 1.2,
          gateWarp: 1.12,
          pointSize: 0.022
        },
        {
          name: 'Needle Corridor',
          width: 0.88,
          twist: 0.92,
          depth: 0.9,
          drift: 0.74,
          gateWarp: 0.88,
          pointSize: 0.021
        }
      ],
      settings: [
        {
          id: 'tunnelSpeed',
          label: 'Tunnel Speed',
          min: 0.4,
          max: 2.4,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'warp',
          label: 'Warp',
          min: 0.4,
          max: 2.2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'density',
          label: 'Density',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        }
      ]
    });

    this.ribbonCount = 12;
    this.ribbonSegments = 180;
    this.ribbonOffsets = new Float32Array(this.ribbonCount);
    this.ribbonSeeds = new Float32Array(this.ribbonCount);
    this.ribbonDepthOffsets = new Float32Array(this.ribbonCount);
    this.ribbons = [];

    this.gateCount = 7;
    this.gateSegments = 96;
    this.gatePositions = [];
    this.gateDepth = new Float32Array(this.gateCount);
    this.gates = [];

    this.dustCount = 3600;
    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustPhase = new Float32Array(this.dustCount);
    this.dust = null;

    this.sparkCount = 460;
    this.sparkPositions = new Float32Array(this.sparkCount * 6);
    this.sparkPhase = new Float32Array(this.sparkCount);
    this.sparks = null;
  }

  init(params) {
    super.init(params);

    for (let ribbonIndex = 0; ribbonIndex < this.ribbonCount; ribbonIndex += 1) {
      const positions = new Float32Array(this.ribbonSegments * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending
        })
      );

      this.ribbonOffsets[ribbonIndex] = (ribbonIndex / this.ribbonCount) * Math.PI * 2;
      this.ribbonSeeds[ribbonIndex] = Math.random() * Math.PI * 2;
      this.ribbonDepthOffsets[ribbonIndex] = (Math.random() - 0.5) * 3;
      this.ribbons.push({ line, positions });
      this.scene.add(line);
    }

    for (let gateIndex = 0; gateIndex < this.gateCount; gateIndex += 1) {
      const positions = new Float32Array(this.gateSegments * 3);
      this.gatePositions.push(positions);
      this.gateDepth[gateIndex] = THREE.MathUtils.lerp(-18, 7, gateIndex / this.gateCount);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const gate = new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending
        })
      );
      this.gates.push(gate);
      this.scene.add(gate);
    }

    for (let i = 0; i < this.dustCount; i += 1) {
      const index = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 4.8;
      this.dustPositions[index] = Math.cos(theta) * radius;
      this.dustPositions[index + 1] = Math.sin(theta) * radius;
      this.dustPositions[index + 2] = THREE.MathUtils.randFloat(-18, 8);
      this.dustPhase[i] = Math.random() * Math.PI * 2;
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    this.dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.dust);

    for (let i = 0; i < this.sparkCount; i += 1) {
      this.sparkPhase[i] = Math.random() * Math.PI * 2;
    }

    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    this.sparks = new THREE.LineSegments(
      sparkGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.sparks);

    this.scene.fog = new THREE.FogExp2(0x000000, 0.2);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const tunnelSpeed = this.getSettingValue('tunnelSpeed');
    const warp = this.getSettingValue('warp');
    const density = this.getSettingValue('density');

    const frequencies = audio.getFrequencyData();
    const volume = audio.getVolume();
    const sub = audio.getAverageInRange(20, 80) / 255;
    const bass = audio.getBass();
    const lowMid = audio.getAverageInRange(180, 620) / 255;
    const mid = audio.getAverageInRange(320, 2400) / 255;
    const presence = audio.getAverageInRange(2200, 6000) / 255;
    const treble = audio.getTreble();
    const air = audio.getAverageInRange(6000, 14000) / 255;

    const speed = (2.4 + bass * 8.2 + mid * 4.2) * preset.depth * tunnelSpeed;
    const width = (1.4 + bass * 2.8) * preset.width * warp;

    for (let ribbonIndex = 0; ribbonIndex < this.ribbons.length; ribbonIndex += 1) {
      const ribbon = this.ribbons[ribbonIndex];
      const offset = this.ribbonOffsets[ribbonIndex];
      const seed = this.ribbonSeeds[ribbonIndex];
      const depthOffset = this.ribbonDepthOffsets[ribbonIndex];

      for (let i = 0; i < this.ribbonSegments; i += 1) {
        const index = i * 3;
        const p = i / (this.ribbonSegments - 1);
        const z = THREE.MathUtils.lerp(7.8, -18, p) + ((elapsed * speed + depthOffset * 2.2) % 26);
        const lane = Math.sin(p * 8.2 + elapsed * (0.5 + lowMid) + offset) * 0.8;

        const swirlA =
          Math.sin(p * (10 + preset.twist * 4.6) + elapsed * (1.6 + mid * 2.4) + seed) * width * 0.46;
        const swirlB =
          Math.cos(p * (12 + preset.twist * 6.2) - elapsed * (1.9 + treble * 3.4) + offset * 1.4) *
          width *
          0.38;
        const freq = frequencies[(i * 2 + ribbonIndex * 23) % frequencies.length] / 255;
        const tremor = Math.sin(elapsed * 7.2 + p * 22 + seed) * (0.05 + freq * 0.3) * preset.drift;

        ribbon.positions[index] = Math.cos(offset) * (swirlA + 1.2 + lane) + Math.sin(seed + p * 9) * 0.18 + tremor;
        ribbon.positions[index + 1] = Math.sin(offset) * (swirlB + 1 + lane * 0.6) + Math.cos(seed + p * 8) * 0.16 - tremor;
        ribbon.positions[index + 2] = z;
      }

      ribbon.line.geometry.attributes.position.needsUpdate = true;
      ribbon.line.material.opacity = THREE.MathUtils.clamp(0.14 + volume * 0.42 + air * 0.2 - ribbonIndex * 0.01, 0.08, 0.76);
      ribbon.line.rotation.z = Math.sin(elapsed * 0.22 + offset) * 0.12;
    }

    for (let gateIndex = 0; gateIndex < this.gateCount; gateIndex += 1) {
      const positions = this.gatePositions[gateIndex];
      this.gateDepth[gateIndex] += dt * speed * 0.72;
      if (this.gateDepth[gateIndex] > 8) {
        this.gateDepth[gateIndex] -= 26;
      }

      const gateRadius = 1.8 + gateIndex * 0.28 + bass * 1.2;
      const gateWarp = (0.24 + presence * 0.72) * preset.gateWarp * warp;

      for (let i = 0; i < this.gateSegments; i += 1) {
        const p = i / this.gateSegments;
        const angle = p * Math.PI * 2;
        const wobble =
          Math.sin(angle * (3 + gateIndex) + elapsed * (1.2 + mid * 2.3)) * gateWarp +
          Math.cos(angle * (7 + gateIndex * 2) - elapsed * (1.5 + treble * 3.2)) * gateWarp * 0.44;
        const index = i * 3;

        positions[index] = Math.cos(angle) * (gateRadius + wobble);
        positions[index + 1] = Math.sin(angle) * (gateRadius * 0.74 + wobble * 0.84);
        positions[index + 2] = this.gateDepth[gateIndex];
      }

      this.gates[gateIndex].geometry.attributes.position.needsUpdate = true;
      this.gates[gateIndex].material.opacity = THREE.MathUtils.clamp(
        0.08 + bass * 0.24 + presence * 0.32 - gateIndex * 0.014,
        0.04,
        0.64
      );
    }

    for (let i = 0; i < this.dustCount; i += 1) {
      const index = i * 3;
      const phase = this.dustPhase[i];
      const radius = Math.sqrt(
        this.dustPositions[index] * this.dustPositions[index] + this.dustPositions[index + 1] * this.dustPositions[index + 1]
      );
      const orbit = 0.006 + mid * 0.03;

      this.dustPositions[index] += Math.cos(elapsed * 1.2 + phase) * orbit;
      this.dustPositions[index + 1] += Math.sin(elapsed * 1.4 + phase) * orbit;
      this.dustPositions[index + 2] += dt * speed * (0.85 + (i % 7) * 0.06) * density;

      if (this.dustPositions[index + 2] > 8) {
        this.dustPositions[index + 2] -= 26;
      }

      if (radius > 6.2) {
        this.dustPositions[index] *= 0.85;
        this.dustPositions[index + 1] *= 0.85;
      }
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dust.material.size += (preset.pointSize * density + air * 0.018 - this.dust.material.size) * 0.2;
    this.dust.material.opacity = THREE.MathUtils.clamp(0.08 + treble * 0.32 + volume * 0.24, 0.06, 0.64);

    for (let i = 0; i < this.sparkCount; i += 1) {
      const p = i / this.sparkCount;
      const phase = this.sparkPhase[i];
      const z = ((elapsed * speed * 0.35 + i * 0.11) % 26) - 18;
      const lane = Math.sin(p * Math.PI * 2 + elapsed * 0.9 + phase) * (1.2 + bass * 2.2);
      const rise = Math.cos(p * 9 + elapsed * 2.2 + phase) * (0.3 + presence * 0.8);
      const length = 0.1 + air * 0.6;

      const index = i * 6;
      this.sparkPositions[index] = lane;
      this.sparkPositions[index + 1] = rise;
      this.sparkPositions[index + 2] = z;
      this.sparkPositions[index + 3] = lane + Math.sin(elapsed * 8 + phase) * 0.03;
      this.sparkPositions[index + 4] = rise + Math.cos(elapsed * 7 + phase) * 0.03;
      this.sparkPositions[index + 5] = z - length;
    }
    this.sparks.geometry.attributes.position.needsUpdate = true;
    this.sparks.material.opacity = THREE.MathUtils.clamp(0.1 + treble * 0.44 + air * 0.2, 0.08, 0.86);

    this.scene.rotation.z = Math.sin(elapsed * 0.08) * 0.08;
    this.scene.rotation.y = Math.cos(elapsed * 0.11) * 0.06;
  }
}
