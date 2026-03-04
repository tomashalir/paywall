import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class LatticeScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Lattice',
      presets: [
        {
          name: 'Grid Current',
          relief: 0.76,
          drift: 0.5,
          pulse: 0.97,
          shear: 0.39,
          pointSize: 0.044,
          beaconGain: 1.11,
          columnWave: 0.47,
          sceneSettings: {
            gridWarp: 1.29,
            beamSpeed: 1.56,
            depth: 1.4,
            phaseScatter: 0.36,
            driftScale: 0.41,
            audioDrive: 1.68,
            stability: 1,
            rotationAmount: 0.19
          }
        },
        {
          name: 'Fracture Mesh',
          relief: 1.02,
          drift: 0.72,
          pulse: 1,
          shear: 0.56,
          pointSize: 0.037,
          beaconGain: 1.08,
          columnWave: 1.04
        },
        {
          name: 'Calm Matrix',
          relief: 0.54,
          drift: 0.36,
          pulse: 0.48,
          shear: 0.28,
          pointSize: 0.028,
          beaconGain: 0.58,
          columnWave: 0.58
        },
        {
          name: 'Resonance Cage',
          relief: 0.92,
          drift: 0.66,
          pulse: 0.94,
          shear: 0.52,
          pointSize: 0.035,
          beaconGain: 1.16,
          columnWave: 1.12
        },
        {
          name: 'Wireframe Sleep',
          relief: 0.44,
          drift: 0.28,
          pulse: 0.4,
          shear: 0.22,
          pointSize: 0.026,
          beaconGain: 0.48,
          columnWave: 0.48
        }
      ],
      settings: [
        {
          id: 'gridWarp',
          label: 'Surface Warp',
          min: 0.3,
          max: 1.6,
          step: 0.01,
          defaultValue: 0.92
        },
        {
          id: 'beamSpeed',
          label: 'Scan Beam Speed',
          min: 0.3,
          max: 1.8,
          step: 0.01,
          defaultValue: 0.92
        },
        {
          id: 'depth',
          label: 'Depth Spread',
          min: 0.35,
          max: 1.8,
          step: 0.01,
          defaultValue: 0.95
        },
        {
          id: 'phaseScatter',
          label: 'Phase Scatter',
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 0.36
        },
        {
          id: 'driftScale',
          label: 'Drift Amount',
          min: 0,
          max: 1.5,
          step: 0.01,
          defaultValue: 0.85
        },
        {
          id: 'audioDrive',
          label: 'Audio Reactivity',
          min: 0.4,
          max: 1.8,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'stability',
          label: 'Motion Stability',
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 0.72
        },
        {
          id: 'rotationAmount',
          label: 'Scene Rotation',
          min: 0,
          max: 1.4,
          step: 0.01,
          defaultValue: 0.7
        }
      ]
    });

    this.cols = 30;
    this.rows = 18;
    this.nodeCount = this.cols * this.rows;

    this.baseNodes = new Float32Array(this.nodeCount * 3);
    this.nodePositions = new Float32Array(this.nodeCount * 3);
    this.nodePhase = new Float32Array(this.nodeCount);

    this.linkFrom = [];
    this.linkTo = [];
    this.linkPositions = null;

    this.beaconIndices = [];
    this.beaconPositions = null;
    this.beacons = null;

    this.columnCount = 10;
    this.columnPositions = new Float32Array(this.columnCount * 6);
    this.columns = null;

    this.nodes = null;
    this.links = null;
    this.scanBeam = null;
    this.beamPositions = new Float32Array(6);

    this.presetParameterOverrides = {
      relief: { label: 'Warp Relief', min: 0.3, max: 1.4, step: 0.01 },
      drift: { label: 'Grid Drift', min: 0.2, max: 1.1, step: 0.01 },
      pulse: { label: 'Pulse Gain', min: 0.3, max: 1.3, step: 0.01 },
      shear: { label: 'Depth Shear', min: 0.16, max: 0.74, step: 0.01 },
      pointSize: { label: 'Node Size', min: 0.02, max: 0.05, step: 0.001 },
      beaconGain: { label: 'Beacon Gain', min: 0.35, max: 1.35, step: 0.01 },
      columnWave: { label: 'Column Wave', min: 0.35, max: 1.3, step: 0.01 }
    };
  }

  getActivePresetParameters() {
    return super.getActivePresetParameters().map((parameter) => {
      const override = this.presetParameterOverrides[parameter.id];
      if (!override) {
        return parameter;
      }

      const min = Number.isFinite(override.min) ? override.min : parameter.min;
      const max = Number.isFinite(override.max) ? override.max : parameter.max;
      const clampedMin = Math.min(min, max);
      const clampedMax = Math.max(min, max);

      return {
        ...parameter,
        label: override.label ?? parameter.label,
        min: clampedMin,
        max: clampedMax,
        step: Number.isFinite(override.step) ? override.step : parameter.step,
        value: THREE.MathUtils.clamp(parameter.value, clampedMin, clampedMax),
        defaultValue: THREE.MathUtils.clamp(parameter.defaultValue, clampedMin, clampedMax)
      };
    });
  }

  getDeterministicPhase(row, col) {
    const seed = Math.sin((row + 1) * 12.9898 + (col + 1) * 78.233) * 43758.5453123;
    const fraction = seed - Math.floor(seed);
    return fraction * Math.PI * 2;
  }

  init(params) {
    super.init(params);

    const width = 10;
    const height = 6.5;

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const nodeIndex = row * this.cols + col;
        const index = nodeIndex * 3;

        const x = THREE.MathUtils.lerp(-width * 0.5, width * 0.5, col / (this.cols - 1));
        const y = THREE.MathUtils.lerp(-height * 0.5, height * 0.5, row / (this.rows - 1));

        this.baseNodes[index] = x;
        this.baseNodes[index + 1] = y;
        this.baseNodes[index + 2] = 0;

        this.nodePositions[index] = x;
        this.nodePositions[index + 1] = y;
        this.nodePositions[index + 2] = 0;
        this.nodePhase[nodeIndex] = this.getDeterministicPhase(row, col);

        if (col < this.cols - 1) {
          this.linkFrom.push(nodeIndex);
          this.linkTo.push(nodeIndex + 1);
        }
        if (row < this.rows - 1) {
          this.linkFrom.push(nodeIndex);
          this.linkTo.push(nodeIndex + this.cols);
        }
      }
    }

    this.linkPositions = new Float32Array(this.linkFrom.length * 6);

    for (let row = 1; row < this.rows; row += 3) {
      for (let col = 1; col < this.cols; col += 4) {
        this.beaconIndices.push(row * this.cols + col);
      }
    }
    this.beaconPositions = new Float32Array(this.beaconIndices.length * 3);

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(this.nodePositions, 3));
    this.nodes = new THREE.Points(
      nodeGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.034,
        transparent: true,
        opacity: 0.74,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.nodes);

    const linkGeometry = new THREE.BufferGeometry();
    linkGeometry.setAttribute('position', new THREE.BufferAttribute(this.linkPositions, 3));
    this.links = new THREE.LineSegments(
      linkGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.links);

    const beamGeometry = new THREE.BufferGeometry();
    beamGeometry.setAttribute('position', new THREE.BufferAttribute(this.beamPositions, 3));
    this.scanBeam = new THREE.Line(
      beamGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.scanBeam);

    const beaconGeometry = new THREE.BufferGeometry();
    beaconGeometry.setAttribute('position', new THREE.BufferAttribute(this.beaconPositions, 3));
    this.beacons = new THREE.Points(
      beaconGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.beacons);

    const columnGeometry = new THREE.BufferGeometry();
    columnGeometry.setAttribute('position', new THREE.BufferAttribute(this.columnPositions, 3));
    this.columns = new THREE.LineSegments(
      columnGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.columns);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const gridWarp = this.getSettingValue('gridWarp');
    const beamSpeed = this.getSettingValue('beamSpeed');
    const depthSetting = this.getSettingValue('depth');
    const phaseScatter = this.getSettingValue('phaseScatter');
    const driftScale = this.getSettingValue('driftScale');
    const audioDrive = this.getSettingValue('audioDrive');
    const stability = this.getSettingValue('stability');
    const rotationAmount = this.getSettingValue('rotationAmount');
    const motionBlend = THREE.MathUtils.lerp(0.34, 0.08, stability);

    const frequencies = audio.getFrequencyData();
    const volume = THREE.MathUtils.clamp(audio.getVolume() * audioDrive, 0, 1.4);
    const sub = THREE.MathUtils.clamp((audio.getAverageInRange(20, 80) / 255) * audioDrive, 0, 1.4);
    const bass = THREE.MathUtils.clamp(audio.getBass() * audioDrive, 0, 1.4);
    const lowMid = THREE.MathUtils.clamp((audio.getAverageInRange(180, 620) / 255) * audioDrive, 0, 1.4);
    const mid = THREE.MathUtils.clamp((audio.getAverageInRange(320, 2600) / 255) * audioDrive, 0, 1.4);
    const presence = THREE.MathUtils.clamp((audio.getAverageInRange(2200, 6000) / 255) * audioDrive, 0, 1.4);
    const treble = THREE.MathUtils.clamp(audio.getTreble() * audioDrive, 0, 1.4);
    const air = THREE.MathUtils.clamp((audio.getAverageInRange(6000, 14000) / 255) * audioDrive, 0, 1.4);

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const nodeIndex = row * this.cols + col;
        const index = nodeIndex * 3;
        const phase = this.nodePhase[nodeIndex] * (0.25 + phaseScatter * 1.35);

        const u = col / (this.cols - 1);
        const v = row / (this.rows - 1);
        const freq = frequencies[(row * 7 + col * 5) % frequencies.length] / 255;

        const waveA =
          Math.sin(u * 11 + elapsed * (1.1 + bass * 2.2) + phase) * (0.18 + preset.relief * 0.42) * gridWarp;
        const waveB =
          Math.cos(v * 13 - elapsed * (1.5 + treble * 2.4) + phase * 0.8) * (0.14 + preset.relief * 0.35) * gridWarp;
        const waveC =
          Math.sin((u + v) * 8 + elapsed * (0.8 + mid * 1.6)) *
          (0.08 + freq * 0.38 * preset.pulse) *
          gridWarp;

        const xDrift = Math.sin(elapsed * 0.7 + v * 9 + phase) * preset.drift * driftScale * (0.03 + bass * 0.11);
        const yDrift = Math.cos(elapsed * 0.62 + u * 8 + phase * 1.2) * preset.drift * driftScale * (0.02 + mid * 0.08);

        const targetX = this.baseNodes[index] + xDrift;
        const targetY = this.baseNodes[index + 1] + yDrift;
        const targetZ = (waveA + waveB + waveC) * (0.7 + preset.shear) * depthSetting;

        this.nodePositions[index] += (targetX - this.nodePositions[index]) * motionBlend;
        this.nodePositions[index + 1] += (targetY - this.nodePositions[index + 1]) * motionBlend;
        this.nodePositions[index + 2] += (targetZ - this.nodePositions[index + 2]) * motionBlend;
      }
    }
    this.nodes.geometry.attributes.position.needsUpdate = true;

    for (let i = 0; i < this.linkFrom.length; i += 1) {
      const from = this.linkFrom[i] * 3;
      const to = this.linkTo[i] * 3;
      const linkIndex = i * 6;

      this.linkPositions[linkIndex] = this.nodePositions[from];
      this.linkPositions[linkIndex + 1] = this.nodePositions[from + 1];
      this.linkPositions[linkIndex + 2] = this.nodePositions[from + 2];
      this.linkPositions[linkIndex + 3] = this.nodePositions[to];
      this.linkPositions[linkIndex + 4] = this.nodePositions[to + 1];
      this.linkPositions[linkIndex + 5] = this.nodePositions[to + 2];
    }
    this.links.geometry.attributes.position.needsUpdate = true;

    const beamY = Math.sin(elapsed * beamSpeed * (0.55 + bass * 1.1)) * 3.1;
    const beamDepth = Math.cos(elapsed * beamSpeed * 2.2) * (0.15 + treble * 0.7) * depthSetting;
    this.beamPositions[0] = -5.4;
    this.beamPositions[1] = beamY;
    this.beamPositions[2] = beamDepth;
    this.beamPositions[3] = 5.4;
    this.beamPositions[4] = beamY;
    this.beamPositions[5] = -beamDepth;
    this.scanBeam.geometry.attributes.position.needsUpdate = true;

    for (let i = 0; i < this.beaconIndices.length; i += 1) {
      const nodeIndex = this.beaconIndices[i];
      const nodeOffset = nodeIndex * 3;
      const index = i * 3;
      const phase = this.nodePhase[nodeIndex] * (0.25 + phaseScatter * 1.35);
      const beaconBand = audio.getAverageInRange(80 + (i % 5) * 520, 280 + (i % 5) * 700) / 255;

      this.beaconPositions[index] = this.nodePositions[nodeOffset];
      this.beaconPositions[index + 1] =
        this.nodePositions[nodeOffset + 1] +
        Math.sin(elapsed * 4.2 + phase) * (0.04 + beaconBand * 0.2 * preset.beaconGain);
      this.beaconPositions[index + 2] =
        this.nodePositions[nodeOffset + 2] +
        Math.cos(elapsed * 3.7 + phase * 1.3) * (0.02 + presence * 0.12 * preset.beaconGain);
    }
    this.beacons.geometry.attributes.position.needsUpdate = true;
    this.beacons.material.size = 0.03 + bass * 0.04 + presence * 0.03 * preset.beaconGain;
    this.beacons.material.opacity = THREE.MathUtils.clamp(0.12 + bass * 0.34 + presence * 0.28, 0.1, 0.92);

    for (let i = 0; i < this.columnCount; i += 1) {
      const p = i / (this.columnCount - 1);
      const x = THREE.MathUtils.lerp(-4.8, 4.8, p);
      const sway =
        Math.sin(elapsed * (1.3 + lowMid * 1.8) + i * 0.9) * (0.12 + preset.columnWave * 0.26) +
        Math.cos(elapsed * (2.1 + treble * 2.8) - i * 0.5) * (0.06 + air * 0.24);
      const z = sway * depthSetting;
      const topY = 3.9 + Math.sin(elapsed * 1.8 + i * 0.7) * (0.12 + treble * 0.28);
      const bottomY = -3.9 + Math.cos(elapsed * 1.5 + i * 0.5) * (0.12 + sub * 0.24);

      const index = i * 6;
      this.columnPositions[index] = x;
      this.columnPositions[index + 1] = bottomY;
      this.columnPositions[index + 2] = z;
      this.columnPositions[index + 3] = x;
      this.columnPositions[index + 4] = topY;
      this.columnPositions[index + 5] = -z;
    }
    this.columns.geometry.attributes.position.needsUpdate = true;

    this.nodes.material.size += (preset.pointSize + air * 0.016 - this.nodes.material.size) * 0.2;
    this.nodes.material.opacity = THREE.MathUtils.clamp(0.28 + volume * 0.34 + treble * 0.22, 0.18, 0.96);
    this.links.material.opacity = THREE.MathUtils.clamp(0.12 + lowMid * 0.14 + mid * 0.26 + bass * 0.24, 0.08, 0.72);
    this.scanBeam.material.opacity = THREE.MathUtils.clamp(0.2 + bass * 0.45 + air * 0.18, 0.14, 0.94);
    this.columns.material.opacity = THREE.MathUtils.clamp(0.1 + treble * 0.32 + air * 0.24, 0.08, 0.82);

    this.scene.rotation.y = Math.sin(elapsed * 0.2) * 0.12 * rotationAmount;
    this.scene.rotation.x = Math.cos(elapsed * 0.15) * 0.08 * rotationAmount;
    this.scene.position.z = Math.sin(elapsed * 0.3) * 0.24 * rotationAmount;

    this.nodes.rotation.z += dt * (0.08 + treble * 0.12) * rotationAmount;
    this.links.rotation.z = this.nodes.rotation.z;
    this.scanBeam.rotation.z = this.nodes.rotation.z;
    this.columns.rotation.z = this.nodes.rotation.z;
    this.beacons.rotation.z = this.nodes.rotation.z;
  }
}
