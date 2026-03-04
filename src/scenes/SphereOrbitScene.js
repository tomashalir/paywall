import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class SphereOrbitScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Embryo',
      presets: [
        {
          name: 'Cell Pulse',
          membranePulse: 0.28,
          ripple: 0.16,
          jitter: 0.11,
          shear: 0.12,
          filamentLength: 0.75,
          pointSize: 0.03,
          nucleusGain: 0.78,
          ringSpread: 0.68,
          shellPulse: 0.56,
          filamentJitter: 0.9
        },
        {
          name: 'Irritated Membrane',
          membranePulse: 0.42,
          ripple: 0.26,
          jitter: 0.19,
          shear: 0.2,
          filamentLength: 1.08,
          pointSize: 0.034,
          nucleusGain: 1.16,
          ringSpread: 1.1,
          shellPulse: 1.02,
          filamentJitter: 1.35
        },
        {
          name: 'Soft Organism',
          membranePulse: 0.2,
          ripple: 0.11,
          jitter: 0.07,
          shear: 0.08,
          filamentLength: 0.58,
          pointSize: 0.027,
          nucleusGain: 0.62,
          ringSpread: 0.5,
          shellPulse: 0.42,
          filamentJitter: 0.7
        },
        {
          name: 'Spore Surge',
          membranePulse: 0.34,
          ripple: 0.31,
          jitter: 0.16,
          shear: 0.24,
          filamentLength: 1.22,
          pointSize: 0.032,
          nucleusGain: 1.04,
          ringSpread: 1.26,
          shellPulse: 0.9,
          filamentJitter: 1.55
        },
        {
          name: 'Cryo Core',
          membranePulse: 0.16,
          ripple: 0.1,
          jitter: 0.05,
          shear: 0.06,
          filamentLength: 0.5,
          pointSize: 0.025,
          nucleusGain: 0.54,
          ringSpread: 0.46,
          shellPulse: 0.34,
          filamentJitter: 0.55
        },
        {
          name: 'Cell Pulse Locked',
          membranePulse: 0.109,
          ripple: 0.1,
          jitter: 0,
          shear: 0.18,
          filamentLength: 0.068,
          pointSize: 0.0366,
          nucleusGain: 0.78,
          ringSpread: 0.035,
          shellPulse: 0.275,
          filamentJitter: 0,
          sceneSettings: {
            motion: 0.79,
            particleSize: 1.13,
            filamentLength: 0.5,
            reactivity: 1.38,
            membraneOpacity: 0.54,
            nucleusPulse: 0.58,
            ringSpreadScale: 0.25,
            shellPulseScale: 0.69,
            showMembrane: 1,
            showNucleus: 1,
            showFilaments: 1,
            showRings: 1,
            showShell: 0
          }
        },
        {
          name: 'Cell Pulse Locked',
          membranePulse: 0.275,
          ripple: 0.1,
          jitter: 0,
          shear: 0.18,
          filamentLength: 0.068,
          pointSize: 0.0366,
          nucleusGain: 0.78,
          ringSpread: 0.035,
          shellPulse: 0.275,
          filamentJitter: 0,
          sceneSettings: {
            motion: 0.79,
            particleSize: 1.13,
            filamentLength: 0.5,
            reactivity: 1.38,
            membraneOpacity: 0.54,
            nucleusPulse: 0.58,
            ringSpreadScale: 0.25,
            shellPulseScale: 0.69,
            showMembrane: 1,
            showNucleus: 1,
            showFilaments: 1,
            showRings: 1,
            showShell: 0
          }
        }
      ],
      settings: [
        {
          id: 'motion',
          label: 'Motion',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'particleSize',
          label: 'Particle Size',
          min: 0.6,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'filamentLength',
          label: 'Filament Length',
          min: 0.5,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'reactivity',
          label: 'Reactivity',
          min: 0.3,
          max: 2.4,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'membraneOpacity',
          label: 'Membrane Opacity',
          min: 0,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'nucleusPulse',
          label: 'Nucleus Pulse',
          min: 0,
          max: 2.2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'ringSpreadScale',
          label: 'Ring Spread',
          min: 0,
          max: 2.5,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'shellPulseScale',
          label: 'Shell Pulse',
          min: 0,
          max: 2.2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'showMembrane',
          label: 'Show Membrane (0/1)',
          min: 0,
          max: 1,
          step: 1,
          defaultValue: 1
        },
        {
          id: 'showNucleus',
          label: 'Show Nucleus (0/1)',
          min: 0,
          max: 1,
          step: 1,
          defaultValue: 1
        },
        {
          id: 'showFilaments',
          label: 'Show Filaments (0/1)',
          min: 0,
          max: 1,
          step: 1,
          defaultValue: 1
        },
        {
          id: 'showRings',
          label: 'Show Rings (0/1)',
          min: 0,
          max: 1,
          step: 1,
          defaultValue: 1
        },
        {
          id: 'showShell',
          label: 'Show Shell (0/1)',
          min: 0,
          max: 1,
          step: 1,
          defaultValue: 1
        }
      ]
    });

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.pointCount = 9200;
    this.baseNormals = new Float32Array(this.pointCount * 3);
    this.baseRadius = new Float32Array(this.pointCount);
    this.phase = new Float32Array(this.pointCount);
    this.dynamicPositions = new Float32Array(this.pointCount * 3);

    this.nucleusCount = 2100;
    this.nucleusBase = new Float32Array(this.nucleusCount * 3);
    this.nucleusPositions = new Float32Array(this.nucleusCount * 3);

    this.filamentCount = 420;
    this.filamentSource = new Uint16Array(this.filamentCount);
    this.filamentPositions = new Float32Array(this.filamentCount * 6);

    this.ringCount = 3;
    this.ringSegments = 196;
    this.ringOffsets = [2.45, 2.95, 3.45];
    this.ringBands = [
      { min: 20, max: 120 },
      { min: 180, max: 1400 },
      { min: 2600, max: 12000 }
    ];
    this.rings = [];
    this.ringPositionArrays = [];

    this.shell = null;

    this.points = null;
    this.nucleus = null;
    this.filaments = null;
  }

  init(params) {
    super.init(params);

    const pointGeometry = new THREE.BufferGeometry();
    const axis = new THREE.Vector3();
    for (let i = 0; i < this.pointCount; i += 1) {
      axis.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      const radius = 2 + (Math.random() - 0.5) * 0.6 + Math.random() * 0.35;
      const index = i * 3;
      this.baseNormals[index] = axis.x;
      this.baseNormals[index + 1] = axis.y;
      this.baseNormals[index + 2] = axis.z;
      this.baseRadius[i] = radius;
      this.phase[i] = Math.random() * Math.PI * 2;

      this.dynamicPositions[index] = axis.x * radius;
      this.dynamicPositions[index + 1] = axis.y * radius;
      this.dynamicPositions[index + 2] = axis.z * radius;
    }

    pointGeometry.setAttribute('position', new THREE.BufferAttribute(this.dynamicPositions, 3));

    this.points = new THREE.Points(
      pointGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.03,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.root.add(this.points);

    const nucleusGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < this.nucleusCount; i += 1) {
      let x = 0;
      let y = 0;
      let z = 0;
      while (x * x + y * y + z * z > 1 || (x === 0 && y === 0 && z === 0)) {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
      }
      const index = i * 3;
      this.nucleusBase[index] = x;
      this.nucleusBase[index + 1] = y;
      this.nucleusBase[index + 2] = z;
      this.nucleusPositions[index] = x * 0.8;
      this.nucleusPositions[index + 1] = y * 0.8;
      this.nucleusPositions[index + 2] = z * 0.8;
    }
    nucleusGeometry.setAttribute('position', new THREE.BufferAttribute(this.nucleusPositions, 3));
    this.nucleus = new THREE.Points(
      nucleusGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.022,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.root.add(this.nucleus);

    const filamentGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < this.filamentCount; i += 1) {
      this.filamentSource[i] = Math.floor(Math.random() * this.pointCount);
      const sourceIndex = this.filamentSource[i] * 3;
      const index = i * 6;
      this.filamentPositions[index] = this.dynamicPositions[sourceIndex];
      this.filamentPositions[index + 1] = this.dynamicPositions[sourceIndex + 1];
      this.filamentPositions[index + 2] = this.dynamicPositions[sourceIndex + 2];
      this.filamentPositions[index + 3] = this.dynamicPositions[sourceIndex] * 1.15;
      this.filamentPositions[index + 4] = this.dynamicPositions[sourceIndex + 1] * 1.15;
      this.filamentPositions[index + 5] = this.dynamicPositions[sourceIndex + 2] * 1.15;
    }
    filamentGeometry.setAttribute('position', new THREE.BufferAttribute(this.filamentPositions, 3));
    this.filaments = new THREE.LineSegments(
      filamentGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending
      })
    );
    this.root.add(this.filaments);

    for (let ringIndex = 0; ringIndex < this.ringCount; ringIndex += 1) {
      const array = new Float32Array(this.ringSegments * 3);
      this.ringPositionArrays.push(array);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(array, 3));
      const ring = new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending
        })
      );
      this.rings.push(ring);
      this.root.add(ring);
    }

    this.shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.25, 4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending
      })
    );
    this.root.add(this.shell);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const motion = this.getSettingValue('motion');
    const particleSize = this.getSettingValue('particleSize');
    const filamentLengthScale = this.getSettingValue('filamentLength');
    const reactivity = this.getSettingValue('reactivity');
    const membraneOpacityScale = this.getSettingValue('membraneOpacity');
    const nucleusPulseScale = this.getSettingValue('nucleusPulse');
    const ringSpreadScale = this.getSettingValue('ringSpreadScale');
    const shellPulseScale = this.getSettingValue('shellPulseScale');

    const showMembrane = this.getSettingValue('showMembrane') >= 0.5;
    const showNucleus = this.getSettingValue('showNucleus') >= 0.5;
    const showFilaments = this.getSettingValue('showFilaments') >= 0.5;
    const showRings = this.getSettingValue('showRings') >= 0.5;
    const showShell = this.getSettingValue('showShell') >= 0.5;

    const volume = THREE.MathUtils.clamp(audio.getVolume() * reactivity, 0, 2.4);
    const sub = THREE.MathUtils.clamp((audio.getAverageInRange(20, 80) / 255) * reactivity, 0, 2.4);
    const bass = THREE.MathUtils.clamp(audio.getBass() * reactivity, 0, 2.4);
    const lowMid = THREE.MathUtils.clamp((audio.getAverageInRange(150, 540) / 255) * reactivity, 0, 2.4);
    const mid = THREE.MathUtils.clamp((audio.getAverageInRange(500, 2200) / 255) * reactivity, 0, 2.4);
    const presence = THREE.MathUtils.clamp((audio.getAverageInRange(2200, 6000) / 255) * reactivity, 0, 2.4);
    const treble = THREE.MathUtils.clamp(audio.getTreble() * reactivity, 0, 2.4);
    const air = THREE.MathUtils.clamp((audio.getAverageInRange(6000, 14000) / 255) * reactivity, 0, 2.4);

    this.points.visible = showMembrane;
    this.nucleus.visible = showNucleus;
    this.filaments.visible = showFilaments;
    this.shell.visible = showShell;
    this.rings.forEach((ring) => {
      ring.visible = showRings;
    });

    this.root.rotation.y += dt * (0.08 + bass * 0.32) * motion;
    this.root.rotation.x = Math.sin(elapsed * 0.24 * motion) * (0.13 + mid * 0.2) * motion;
    this.root.rotation.z = Math.cos(elapsed * 0.19 * motion) * (0.05 + lowMid * 0.13) * motion;

    for (let i = 0; i < this.pointCount; i += 1) {
      const index = i * 3;
      const nx = this.baseNormals[index];
      const ny = this.baseNormals[index + 1];
      const nz = this.baseNormals[index + 2];
      const phase = this.phase[i];

      const breathe = 1 + bass * preset.membranePulse * motion + Math.sin(elapsed * 2.2 * motion + phase) * 0.08;
      const ripple =
        Math.sin(elapsed * (5 + mid * 7) * motion + phase * 2.4) * preset.ripple * (0.25 + mid * 0.75) * motion;
      const jitter =
        Math.cos(elapsed * (8 + presence * 10) * motion + phase * 3.2) * preset.jitter * (0.2 + air) * motion;
      const shearA = Math.sin(elapsed * 1.3 * motion + phase * 1.4) * preset.shear * (0.35 + lowMid) * motion;
      const shearB = Math.cos(elapsed * 1.7 * motion + phase * 1.9) * preset.shear * (0.25 + sub) * motion;

      const radius = this.baseRadius[i] * breathe + ripple + jitter * 0.4;

      this.dynamicPositions[index] = nx * radius + ny * shearA - nz * shearB;
      this.dynamicPositions[index + 1] = ny * radius + nz * shearA + nx * shearB;
      this.dynamicPositions[index + 2] = nz * radius + nx * shearA - ny * shearB;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.size += (preset.pointSize * particleSize + air * 0.017 - this.points.material.size) * 0.15;
    this.points.material.opacity = THREE.MathUtils.clamp(
      (0.55 + volume * 0.32 + presence * 0.12) * membraneOpacityScale,
      0,
      1
    );

    for (let i = 0; i < this.nucleusCount; i += 1) {
      const index = i * 3;
      const bx = this.nucleusBase[index];
      const by = this.nucleusBase[index + 1];
      const bz = this.nucleusBase[index + 2];
      const pulse =
        0.56 +
        bass * preset.nucleusGain * motion * nucleusPulseScale +
        Math.sin(elapsed * 4.2 * motion + i * 0.11) * (0.05 + presence * 0.08);
      const drift = Math.sin(elapsed * 2.3 * motion + i * 0.17) * 0.05 * air;

      this.nucleusPositions[index] = bx * pulse + drift;
      this.nucleusPositions[index + 1] = by * pulse + Math.cos(elapsed * 2 + i * 0.08) * 0.04 * mid;
      this.nucleusPositions[index + 2] = bz * pulse - drift;
    }
    this.nucleus.geometry.attributes.position.needsUpdate = true;
    this.nucleus.material.opacity = THREE.MathUtils.clamp(0.28 + bass * 0.46 + air * 0.18, 0.18, 0.94);

    for (let i = 0; i < this.filamentCount; i += 1) {
      const sourceIndex = this.filamentSource[i] * 3;
      const px = this.dynamicPositions[sourceIndex];
      const py = this.dynamicPositions[sourceIndex + 1];
      const pz = this.dynamicPositions[sourceIndex + 2];

      const mag = Math.sqrt(px * px + py * py + pz * pz) + 0.0001;
      const nx = px / mag;
      const ny = py / mag;
      const nz = pz / mag;

      const length =
        preset.filamentLength *
        filamentLengthScale *
        (0.65 + bass * 1.8 + presence * 0.5 + Math.sin(elapsed * 5.4 + i * 0.37) * 0.22);
      const twitch = (0.03 + air * 0.12) * preset.filamentJitter * Math.sin(elapsed * 11 + i * 0.91);

      const index = i * 6;
      this.filamentPositions[index] = px;
      this.filamentPositions[index + 1] = py;
      this.filamentPositions[index + 2] = pz;
      this.filamentPositions[index + 3] = px + nx * length + ny * twitch;
      this.filamentPositions[index + 4] = py + ny * length + nz * twitch;
      this.filamentPositions[index + 5] = pz + nz * length + nx * twitch;
    }
    this.filaments.geometry.attributes.position.needsUpdate = true;
    this.filaments.material.opacity = THREE.MathUtils.clamp(0.14 + bass * 0.36 + air * 0.2, 0.08, 0.72);

    for (let ringIndex = 0; ringIndex < this.ringCount; ringIndex += 1) {
      const ringPositions = this.ringPositionArrays[ringIndex];
      const band = this.ringBands[ringIndex];
      const bandEnergy = THREE.MathUtils.clamp((audio.getAverageInRange(band.min, band.max) / 255) * reactivity, 0, 2.4);
      const baseRadius = this.ringOffsets[ringIndex] + bandEnergy * preset.ringSpread * ringSpreadScale;

      for (let segment = 0; segment < this.ringSegments; segment += 1) {
        const p = segment / this.ringSegments;
        const angle = p * Math.PI * 2;
        const wobble =
          Math.sin(angle * (3 + ringIndex * 2) + elapsed * (1.4 + bandEnergy * 4)) * (0.05 + bandEnergy * 0.25) +
          Math.cos(angle * (5 + ringIndex * 3) - elapsed * (1.1 + air * 3)) * (0.02 + treble * 0.12);
        const index = segment * 3;

        ringPositions[index] = Math.cos(angle) * (baseRadius + wobble);
        ringPositions[index + 1] = Math.sin(elapsed * (0.6 + ringIndex * 0.4) + angle * 2) * (0.12 + bandEnergy * 0.45);
        ringPositions[index + 2] = Math.sin(angle) * (baseRadius + wobble);
      }

      this.rings[ringIndex].geometry.attributes.position.needsUpdate = true;
      this.rings[ringIndex].material.opacity = THREE.MathUtils.clamp(0.12 + bandEnergy * 0.52 + air * 0.1, 0.08, 0.78);
      this.rings[ringIndex].rotation.x = Math.sin(elapsed * 0.5 + ringIndex) * (0.16 + lowMid * 0.2);
      this.rings[ringIndex].rotation.y = Math.cos(elapsed * 0.42 + ringIndex * 0.7) * (0.16 + mid * 0.24);
    }

    const shellScale = 0.95 + sub * preset.shellPulse * 0.8 * shellPulseScale + Math.sin(elapsed * (2 + bass * 4)) * 0.05;
    this.shell.scale.setScalar(shellScale);
    this.shell.material.opacity = THREE.MathUtils.clamp(
      (0.04 + lowMid * 0.18 + presence * 0.12) * (0.3 + shellPulseScale * 0.7),
      0.03,
      0.5
    );
    this.shell.rotation.y += dt * (0.16 + mid * 0.8) * motion;
    this.shell.rotation.x += dt * (0.08 + treble * 0.6) * motion;
  }
}
