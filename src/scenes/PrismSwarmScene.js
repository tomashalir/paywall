import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class PrismSwarmScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Prism Swarm',
      presets: [
        {
          name: 'Shiver Orbit',
          orbit: 0.78,
          cohesion: 0.74,
          turbulence: 0.68,
          pulse: 0.72,
          trailWarp: 0.8,
          prismScale: 0.82
        },
        {
          name: 'Shatter Flock',
          orbit: 1.24,
          cohesion: 0.5,
          turbulence: 1.2,
          pulse: 1.16,
          trailWarp: 1.26,
          prismScale: 1.1
        },
        {
          name: 'Cold Drift',
          orbit: 0.56,
          cohesion: 1.12,
          turbulence: 0.42,
          pulse: 0.52,
          trailWarp: 0.54,
          prismScale: 0.68
        },
        {
          name: 'Swarm Reactor',
          orbit: 1.08,
          cohesion: 0.82,
          turbulence: 0.96,
          pulse: 1.28,
          trailWarp: 1.1,
          prismScale: 0.98
        },
        {
          name: 'Crystal Wake',
          orbit: 0.9,
          cohesion: 0.9,
          turbulence: 0.72,
          pulse: 0.84,
          trailWarp: 0.92,
          prismScale: 0.88
        }
      ],
      settings: [
        {
          id: 'swirl',
          label: 'Swirl',
          min: 0.4,
          max: 2.2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'cluster',
          label: 'Cluster',
          min: 0.4,
          max: 2.3,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'scale',
          label: 'Scale',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        }
      ]
    });

    this.prismCount = 520;
    this.prismPositions = new Float32Array(this.prismCount * 3);
    this.prismVelocity = new Float32Array(this.prismCount * 3);
    this.prismPhase = new Float32Array(this.prismCount);
    this.prismScale = new Float32Array(this.prismCount);

    this.mesh = null;
    this.dummy = new THREE.Object3D();

    this.trailCount = 340;
    this.trailPositions = new Float32Array(this.trailCount * 6);
    this.trailPhase = new Float32Array(this.trailCount);
    this.trails = null;

    this.coreCount = 2200;
    this.corePositions = new Float32Array(this.coreCount * 3);
    this.corePhase = new Float32Array(this.coreCount);
    this.core = null;
  }

  init(params) {
    super.init(params);

    const prismGeometry = new THREE.OctahedronGeometry(0.08, 0);
    const prismMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.InstancedMesh(prismGeometry, prismMaterial, this.prismCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.prismCount; i += 1) {
      const index = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 0.7 + Math.random() * 4.6;

      this.prismPositions[index] = Math.sin(phi) * Math.cos(theta) * radius;
      this.prismPositions[index + 1] = Math.cos(phi) * radius;
      this.prismPositions[index + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      this.prismVelocity[index] = (Math.random() - 0.5) * 0.02;
      this.prismVelocity[index + 1] = (Math.random() - 0.5) * 0.02;
      this.prismVelocity[index + 2] = (Math.random() - 0.5) * 0.02;

      this.prismPhase[i] = Math.random() * Math.PI * 2;
      this.prismScale[i] = 0.7 + Math.random() * 0.8;

      this.dummy.position.set(this.prismPositions[index], this.prismPositions[index + 1], this.prismPositions[index + 2]);
      this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.dummy.scale.setScalar(this.prismScale[i]);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.mesh);

    for (let i = 0; i < this.trailCount; i += 1) {
      this.trailPhase[i] = Math.random() * Math.PI * 2;
    }

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trails = new THREE.LineSegments(
      trailGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.trails);

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

      this.corePositions[index] = x * 0.9;
      this.corePositions[index + 1] = y * 0.9;
      this.corePositions[index + 2] = z * 0.9;
      this.corePhase[i] = Math.random() * Math.PI * 2;
    }

    const coreGeometry = new THREE.BufferGeometry();
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(this.corePositions, 3));
    this.core = new THREE.Points(
      coreGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.018,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.core);

    this.scene.fog = new THREE.FogExp2(0x000000, 0.2);
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const swirlSetting = this.getSettingValue('swirl');
    const clusterSetting = this.getSettingValue('cluster');
    const scaleSetting = this.getSettingValue('scale');

    const frequencies = audio.getFrequencyData();
    const volume = audio.getVolume();
    const sub = audio.getAverageInRange(20, 80) / 255;
    const bass = audio.getBass();
    const lowMid = audio.getAverageInRange(180, 620) / 255;
    const mid = audio.getAverageInRange(320, 2400) / 255;
    const presence = audio.getAverageInRange(2200, 6000) / 255;
    const treble = audio.getTreble();
    const air = audio.getAverageInRange(6000, 14000) / 255;

    const orbitStrength = (0.32 + bass * 1.8 + mid * 0.8) * preset.orbit * swirlSetting;
    const cohesion = (0.008 + sub * 0.04 + bass * 0.03) * preset.cohesion * clusterSetting;
    const jitter = (0.001 + treble * 0.006) * preset.turbulence * swirlSetting;

    for (let i = 0; i < this.prismCount; i += 1) {
      const index = i * 3;
      const phase = this.prismPhase[i];

      const x = this.prismPositions[index];
      const y = this.prismPositions[index + 1];
      const z = this.prismPositions[index + 2];
      const radius = Math.sqrt(x * x + y * y + z * z) + 0.0001;

      this.prismVelocity[index] += ((-z / radius) * orbitStrength + Math.sin(elapsed * 2.6 + phase) * jitter) * dt * 4.8;
      this.prismVelocity[index + 1] += (Math.cos(elapsed * 1.7 + phase * 1.3) * jitter - y * cohesion) * dt * 4.8;
      this.prismVelocity[index + 2] += ((x / radius) * orbitStrength + Math.cos(elapsed * 2.2 + phase) * jitter) * dt * 4.8;

      this.prismVelocity[index] -= x * cohesion;
      this.prismVelocity[index + 1] -= y * cohesion;
      this.prismVelocity[index + 2] -= z * cohesion;

      this.prismVelocity[index] *= 0.988;
      this.prismVelocity[index + 1] *= 0.988;
      this.prismVelocity[index + 2] *= 0.988;

      this.prismPositions[index] += this.prismVelocity[index] * (1 + lowMid * 1.4);
      this.prismPositions[index + 1] += this.prismVelocity[index + 1] * (1 + presence * 1.2);
      this.prismPositions[index + 2] += this.prismVelocity[index + 2] * (1 + lowMid * 1.4);

      const newRadius = Math.sqrt(
        this.prismPositions[index] * this.prismPositions[index] +
          this.prismPositions[index + 1] * this.prismPositions[index + 1] +
          this.prismPositions[index + 2] * this.prismPositions[index + 2]
      );

      if (newRadius > 6.4 || newRadius < 0.4) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const spawnRadius = 0.8 + Math.random() * 4.7;

        this.prismPositions[index] = Math.sin(phi) * Math.cos(theta) * spawnRadius;
        this.prismPositions[index + 1] = Math.cos(phi) * spawnRadius;
        this.prismPositions[index + 2] = Math.sin(phi) * Math.sin(theta) * spawnRadius;

        this.prismVelocity[index] = 0;
        this.prismVelocity[index + 1] = 0;
        this.prismVelocity[index + 2] = 0;
      }

      const freq = frequencies[(i * 3) % frequencies.length] / 255;
      const scale = (0.28 + this.prismScale[i] * 0.42 + freq * preset.pulse * 0.52 + bass * 0.3) * preset.prismScale * scaleSetting;

      this.dummy.position.set(this.prismPositions[index], this.prismPositions[index + 1], this.prismPositions[index + 2]);
      this.dummy.rotation.set(
        elapsed * (0.8 + freq * 2 + phase * 0.1),
        elapsed * (0.6 + bass * 2.2 + phase * 0.2),
        elapsed * (0.7 + treble * 2.6 + phase * 0.15)
      );
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.material.opacity = THREE.MathUtils.clamp(0.14 + volume * 0.36 + treble * 0.24, 0.1, 0.84);

    for (let i = 0; i < this.trailCount; i += 1) {
      const prismA = (i * 7) % this.prismCount;
      const prismB = (prismA + 23 + (i % 11) * 3) % this.prismCount;

      const aIndex = prismA * 3;
      const bIndex = prismB * 3;
      const index = i * 6;
      const phase = this.trailPhase[i];

      const warp = (0.04 + air * 0.22) * preset.trailWarp;

      this.trailPositions[index] = this.prismPositions[aIndex] + Math.sin(elapsed * 4 + phase) * warp;
      this.trailPositions[index + 1] = this.prismPositions[aIndex + 1] + Math.cos(elapsed * 3.5 + phase) * warp;
      this.trailPositions[index + 2] = this.prismPositions[aIndex + 2] + Math.sin(elapsed * 3.8 + phase) * warp;

      this.trailPositions[index + 3] = this.prismPositions[bIndex] - Math.cos(elapsed * 4.4 + phase) * warp;
      this.trailPositions[index + 4] = this.prismPositions[bIndex + 1] - Math.sin(elapsed * 3.9 + phase) * warp;
      this.trailPositions[index + 5] = this.prismPositions[bIndex + 2] - Math.cos(elapsed * 3.7 + phase) * warp;
    }
    this.trails.geometry.attributes.position.needsUpdate = true;
    this.trails.material.opacity = THREE.MathUtils.clamp(0.08 + mid * 0.26 + air * 0.22, 0.06, 0.58);

    for (let i = 0; i < this.coreCount; i += 1) {
      const index = i * 3;
      const phase = this.corePhase[i];
      const pulse = 1 + Math.sin(elapsed * (2.4 + bass * 2.8) + phase) * (0.04 + preset.pulse * 0.11);

      this.corePositions[index] *= pulse;
      this.corePositions[index + 1] *= pulse;
      this.corePositions[index + 2] *= pulse;

      this.corePositions[index] += Math.sin(elapsed * 3.1 + phase) * (0.0008 + treble * 0.0024);
      this.corePositions[index + 1] += Math.cos(elapsed * 2.8 + phase * 1.4) * (0.0008 + presence * 0.002);
      this.corePositions[index + 2] += Math.sin(elapsed * 3.5 + phase * 1.8) * (0.0008 + air * 0.0022);

      const r = Math.sqrt(
        this.corePositions[index] * this.corePositions[index] +
          this.corePositions[index + 1] * this.corePositions[index + 1] +
          this.corePositions[index + 2] * this.corePositions[index + 2]
      );

      if (r > 1.6) {
        this.corePositions[index] *= 0.65;
        this.corePositions[index + 1] *= 0.65;
        this.corePositions[index + 2] *= 0.65;
      }
    }
    this.core.geometry.attributes.position.needsUpdate = true;
    this.core.material.size = 0.012 + bass * 0.02 + presence * 0.012;
    this.core.material.opacity = THREE.MathUtils.clamp(0.08 + bass * 0.34 + air * 0.18, 0.06, 0.68);

    this.scene.rotation.y = Math.sin(elapsed * 0.16) * 0.12;
    this.scene.rotation.x = Math.cos(elapsed * 0.14) * 0.08;
  }
}
