import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class VerticalFlowScene extends BaseScene {
  constructor() {
    super({
      sceneName: 'Vessel',
      presets: [
        {
          name: 'Capillary Drift',
          fallSpeed: 0.9,
          turbulence: 0.62,
          cohesion: 0.86,
          spiral: 0.55,
          membrane: 0.78,
          pointSize: 0.03,
          jetWidth: 0.9,
          jetTremor: 0.7,
          dropletSpread: 0.82
        },
        {
          name: 'Pressure Artery',
          fallSpeed: 0.74,
          turbulence: 0.34,
          cohesion: 1.16,
          spiral: 0.3,
          membrane: 1.08,
          pointSize: 0.037,
          jetWidth: 0.66,
          jetTremor: 0.54,
          dropletSpread: 0.62
        },
        {
          name: 'Frayed Plasma',
          fallSpeed: 1.18,
          turbulence: 1.15,
          cohesion: 0.42,
          spiral: 1.22,
          membrane: 0.56,
          pointSize: 0.026,
          jetWidth: 1.2,
          jetTremor: 1.28,
          dropletSpread: 1.22
        },
        {
          name: 'Vortex Torrent',
          fallSpeed: 1.3,
          turbulence: 1,
          cohesion: 0.56,
          spiral: 1.45,
          membrane: 0.68,
          pointSize: 0.028,
          jetWidth: 1.32,
          jetTremor: 1.46,
          dropletSpread: 1.14
        },
        {
          name: 'Sediment Veil',
          fallSpeed: 0.62,
          turbulence: 0.28,
          cohesion: 1.26,
          spiral: 0.28,
          membrane: 1.2,
          pointSize: 0.034,
          jetWidth: 0.58,
          jetTremor: 0.42,
          dropletSpread: 0.56
        }
      ],
      settings: [
        {
          id: 'flowSpeed',
          label: 'Flow Speed',
          min: 0.4,
          max: 2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'turbulence',
          label: 'Turbulence',
          min: 0.3,
          max: 2.2,
          step: 0.01,
          defaultValue: 1
        },
        {
          id: 'membrane',
          label: 'Membrane',
          min: 0.3,
          max: 2,
          step: 0.01,
          defaultValue: 1
        }
      ]
    });

    this.count = 14000;
    this.rangeY = 11;
    this.spreadX = 6.4;
    this.spreadZ = 3.2;

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);

    this.dropletCount = 2200;
    this.dropletPositions = new Float32Array(this.dropletCount * 3);
    this.dropletPhase = new Float32Array(this.dropletCount);

    this.jetCount = 2;
    this.jetSegments = 120;
    this.jetPositionArrays = [];
    this.jets = [];

    this.points = null;
    this.droplets = null;
    this.membrane = null;
    this.membraneBase = null;
    this.spine = null;
    this.spinePositions = null;
    this.spineCount = 140;
  }

  init(params) {
    super.init(params);

    for (let i = 0; i < this.count; i += 1) {
      const index = i * 3;
      this.positions[index] = (Math.random() - 0.5) * this.spreadX;
      this.positions[index + 1] = (Math.random() - 0.5) * this.rangeY;
      this.positions[index + 2] = (Math.random() - 0.5) * this.spreadZ;

      this.velocities[i] = 0.45 + Math.random() * 0.8;
      this.phase[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.035,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.points);

    for (let i = 0; i < this.dropletCount; i += 1) {
      const index = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 2.8;
      this.dropletPositions[index] = Math.cos(theta) * radius;
      this.dropletPositions[index + 1] = (Math.random() - 0.5) * this.rangeY;
      this.dropletPositions[index + 2] = Math.sin(theta) * radius;
      this.dropletPhase[i] = Math.random() * Math.PI * 2;
    }

    const dropletGeometry = new THREE.BufferGeometry();
    dropletGeometry.setAttribute('position', new THREE.BufferAttribute(this.dropletPositions, 3));
    this.droplets = new THREE.Points(
      dropletGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.droplets);

    const fog = new THREE.FogExp2(0x000000, 0.31);
    this.scene.fog = fog;

    const membraneGeometry = new THREE.PlaneGeometry(5.8, 10, 52, 120);
    this.membraneBase = new Float32Array(membraneGeometry.attributes.position.array.length);
    this.membraneBase.set(membraneGeometry.attributes.position.array);

    this.membrane = new THREE.Mesh(
      membraneGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
    );
    this.membrane.position.z = -0.6;
    this.scene.add(this.membrane);

    this.spinePositions = new Float32Array(this.spineCount * 3);
    const spineGeometry = new THREE.BufferGeometry();
    spineGeometry.setAttribute('position', new THREE.BufferAttribute(this.spinePositions, 3));
    this.spine = new THREE.Line(
      spineGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.spine);

    for (let jetIndex = 0; jetIndex < this.jetCount; jetIndex += 1) {
      const array = new Float32Array(this.jetSegments * 3);
      this.jetPositionArrays.push(array);
      const jetGeometry = new THREE.BufferGeometry();
      jetGeometry.setAttribute('position', new THREE.BufferAttribute(array, 3));
      const jet = new THREE.Line(
        jetGeometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.24,
          blending: THREE.AdditiveBlending
        })
      );
      this.jets.push(jet);
      this.scene.add(jet);
    }
  }

  update(audio, dt, elapsed) {
    const preset = this.getActivePreset() ?? this.presets[0];
    const flowSpeedSetting = this.getSettingValue('flowSpeed');
    const turbulenceSetting = this.getSettingValue('turbulence');
    const membraneSetting = this.getSettingValue('membrane');

    const volume = audio.getVolume();
    const sub = audio.getAverageInRange(20, 80) / 255;
    const bass = audio.getBass();
    const lowMid = audio.getAverageInRange(160, 640) / 255;
    const mid = audio.getAverageInRange(320, 2400) / 255;
    const presence = audio.getAverageInRange(2200, 6000) / 255;
    const treble = audio.getTreble();
    const air = audio.getAverageInRange(6000, 14000) / 255;

    const speedMultiplier = (0.7 + volume * 5.2) * preset.fallSpeed * flowSpeedSetting;
    const turbulence = (0.14 + treble * 2) * preset.turbulence * turbulenceSetting;
    const cohesion = (0.5 + bass * 1.6) * preset.cohesion;
    const spiral = (0.08 + mid * 0.9) * preset.spiral;

    for (let i = 0; i < this.count; i += 1) {
      const index = i * 3;
      const x = this.positions[index];
      const y = this.positions[index + 1];
      const z = this.positions[index + 2];
      const phase = this.phase[i];

      this.positions[index + 1] -= this.velocities[i] * dt * speedMultiplier * 4.5;

      const centerX = Math.sin(y * 0.46 + elapsed * 0.9 + phase * 0.8) * (0.5 + mid * 0.8);
      const centerZ = Math.cos(y * 0.35 - elapsed * 0.8 + phase * 1.1) * (0.24 + air * 0.9);
      const flowX =
        Math.sin(elapsed * (1.2 + mid * 1.4) + y * 1.15 + phase) * turbulence +
        -z * spiral * 0.32;
      const flowZ =
        Math.cos(elapsed * (1.6 + treble * 1.9) + x * 1.6 + phase * 1.3) * turbulence * 0.85 +
        x * spiral * 0.28;

      this.positions[index] += (flowX + (centerX - x) * cohesion * 0.08) * dt * 4.2;
      this.positions[index + 2] += (flowZ + (centerZ - z) * cohesion * 0.08) * dt * 4.2;

      if (this.positions[index + 1] < -this.rangeY * 0.5) {
        this.positions[index + 1] = this.rangeY * 0.5;
        this.positions[index] = centerX + (Math.random() - 0.5) * this.spreadX * 0.25;
        this.positions[index + 2] = centerZ + (Math.random() - 0.5) * this.spreadZ * 0.5;
      }

      if (this.positions[index] < -this.spreadX * 0.5) {
        this.positions[index] += this.spreadX;
      } else if (this.positions[index] > this.spreadX * 0.5) {
        this.positions[index] -= this.spreadX;
      }

      if (this.positions[index + 2] < -this.spreadZ * 0.5) {
        this.positions[index + 2] += this.spreadZ;
      } else if (this.positions[index + 2] > this.spreadZ * 0.5) {
        this.positions[index + 2] -= this.spreadZ;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.size += (preset.pointSize * flowSpeedSetting + air * 0.016 - this.points.material.size) * 0.2;
    this.points.material.opacity = THREE.MathUtils.clamp(0.48 + volume * 0.32 + treble * 0.24, 0.24, 0.96);
    this.points.rotation.y = Math.sin(elapsed * 0.18) * (0.12 + mid * 0.32);
    this.points.rotation.x = Math.cos(elapsed * 0.14) * (0.02 + treble * 0.08);

    const membraneArray = this.membrane.geometry.attributes.position.array;
    for (let i = 0; i < membraneArray.length; i += 3) {
      const bx = this.membraneBase[i];
      const by = this.membraneBase[i + 1];

      const waveA =
        Math.sin(by * 1.3 + elapsed * (1.5 + bass * 2.1) + bx * 1.8) *
        (0.2 + preset.membrane * 0.24) *
        membraneSetting;
      const waveB =
        Math.cos(by * 2.8 - elapsed * (2.2 + treble * 4.4) + bx * 0.8) *
        (0.08 + preset.membrane * 0.13) *
        membraneSetting;

      membraneArray[i] = bx + waveA;
      membraneArray[i + 1] =
        by +
        Math.sin(elapsed * 0.8 + bx * 2.2 + by * 0.9) *
          preset.membrane *
          membraneSetting *
          0.09 *
          (mid + lowMid * 0.6);
      membraneArray[i + 2] = waveB;
    }
    this.membrane.geometry.attributes.position.needsUpdate = true;
    this.membrane.material.opacity = THREE.MathUtils.clamp(0.03 + bass * 0.1 + volume * 0.08, 0.02, 0.22);
    this.membrane.rotation.y = Math.sin(elapsed * 0.24) * 0.18 + mid * 0.08;
    this.membrane.scale.x = 1 + bass * 0.34 * membraneSetting;

    for (let i = 0; i < this.spineCount; i += 1) {
      const p = i / (this.spineCount - 1);
      const index = i * 3;
      const y = THREE.MathUtils.lerp(-4.8, 4.8, p);
      this.spinePositions[index] =
        Math.sin(elapsed * (1.5 + treble * 1.7) + p * 9.8) * (0.28 + bass * 0.7 * preset.spiral) +
        Math.sin(elapsed * 0.3 + p * 21.3) * 0.06;
      this.spinePositions[index + 1] = y;
      this.spinePositions[index + 2] =
        Math.cos(elapsed * (1.3 + mid * 1.5) - p * 8.4) * (0.18 + air * 0.42) +
        Math.sin(elapsed * 0.5 + p * 14.1) * 0.05;
    }
    this.spine.geometry.attributes.position.needsUpdate = true;
    this.spine.material.opacity = THREE.MathUtils.clamp(0.18 + bass * 0.32 + treble * 0.2, 0.12, 0.88);

    for (let jetIndex = 0; jetIndex < this.jetCount; jetIndex += 1) {
      const jetArray = this.jetPositionArrays[jetIndex];
      const side = jetIndex === 0 ? -1 : 1;
      const band = jetIndex === 0 ? sub + bass : presence + treble;

      for (let i = 0; i < this.jetSegments; i += 1) {
        const p = i / (this.jetSegments - 1);
        const y = THREE.MathUtils.lerp(5.1, -5.1, p);
        const xBase = side * (1.2 + preset.jetWidth * 1.5 + bass * 0.9);
        const xWave =
          Math.sin(elapsed * (1.4 + band * 2.6) + p * 10.3 + side * 0.7) *
          (0.2 + preset.jetTremor * 0.38 + lowMid * 0.42);
        const zWave =
          Math.cos(elapsed * (2 + treble * 3.2) - p * 12.4 + side * 0.9) *
          (0.12 + preset.jetTremor * 0.26 + air * 0.35);
        const pulse = Math.sin(elapsed * 7.2 + p * 28 + side) * (0.02 + band * 0.1);

        const index = i * 3;
        jetArray[index] = xBase + xWave + pulse;
        jetArray[index + 1] = y;
        jetArray[index + 2] = zWave;
      }

      this.jets[jetIndex].geometry.attributes.position.needsUpdate = true;
      this.jets[jetIndex].material.opacity = THREE.MathUtils.clamp(0.12 + band * 0.44 + air * 0.12, 0.08, 0.82);
    }

    for (let i = 0; i < this.dropletCount; i += 1) {
      const index = i * 3;
      const phase = this.dropletPhase[i];
      const targetTheta = elapsed * (0.4 + mid * 1.4) + phase;
      const targetRadius =
        (1 + preset.dropletSpread * 1.7 + Math.sin(phase * 2.1 + elapsed * 0.6) * 0.4) *
        (0.7 + sub * 0.9 + air * 0.4);

      const tx = Math.cos(targetTheta) * targetRadius;
      const tz = Math.sin(targetTheta) * targetRadius;
      const ty = Math.sin(phase * 0.7 + elapsed * (1.1 + presence * 2.4)) * 4.4;

      const pull = 0.02 + (treble + air) * 0.045;
      this.dropletPositions[index] += (tx - this.dropletPositions[index]) * pull;
      this.dropletPositions[index + 1] += (ty - this.dropletPositions[index + 1]) * pull;
      this.dropletPositions[index + 2] += (tz - this.dropletPositions[index + 2]) * pull;
    }
    this.droplets.geometry.attributes.position.needsUpdate = true;
    this.droplets.material.size = 0.014 + air * 0.018;
    this.droplets.material.opacity = THREE.MathUtils.clamp(0.08 + presence * 0.28 + treble * 0.2, 0.06, 0.56);
  }
}
