import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { grainShader } from '../shaders/grainShader';
import { SphereOrbitScene } from '../scenes/SphereOrbitScene';
import { GranularBleedWaveformScene } from '../scenes/GranularBleedWaveformScene';
import { LatticeScene } from '../scenes/LatticeScene';

export class VisualizerApp {
  constructor(canvas, audioEngine) {
    this.canvas = canvas;
    this.audioEngine = audioEngine;

    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
    this.camera.position.set(0, 0, 9);

    this.scenes = [
      new SphereOrbitScene(),
      new GranularBleedWaveformScene(),
      new LatticeScene()
    ];

    this.activeSceneIndex = 0;

    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.grainPass = null;
    this.resizeObserver = null;
    this.overlaySettingDefinitions = [
      {
        id: 'overlayEnabled',
        label: 'Overlay FX',
        type: 'boolean',
        defaultValue: true
      },
      {
        id: 'grainEnabled',
        label: 'Film Grain',
        type: 'boolean',
        defaultValue: true
      },
      {
        id: 'scanlinesEnabled',
        label: 'Signal Lines',
        type: 'boolean',
        defaultValue: false
      },
      {
        id: 'grainIntensity',
        label: 'Grain Amount',
        type: 'number',
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 1.61
      },
      {
        id: 'scanlineIntensity',
        label: 'Signal Line Amount',
        type: 'number',
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 1.07
      }
    ];
    this.overlaySettings = this.overlaySettingDefinitions.reduce((acc, definition) => {
      acc[definition.id] = definition.defaultValue;
      return acc;
    }, {});

    this.resize();
    this.createComposer();

    const { width, height } = this.getCanvasSize();
    this.scenes.forEach((scene) => {
      scene.init({
        camera: this.camera,
        width,
        height
      });
    });

    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvas);
    }
  }

  handleResize = () => {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.resize();
  };

  getCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    return { width, height };
  }

  resize() {
    const { width, height } = this.getCanvasSize();

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.composer) {
      this.composer.setSize(width, height);
    }

    this.scenes.forEach((scene) => scene.resize(width, height));
  }

  createComposer() {
    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(this.scenes[this.activeSceneIndex].getScene(), this.camera);
    this.composer.addPass(this.renderPass);

    const { width, height } = this.getCanvasSize();
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.75, 0.6, 0.2);
    this.composer.addPass(this.bloomPass);

    this.grainPass = new ShaderPass(grainShader);
    this.composer.addPass(this.grainPass);
  }

  setScene(index) {
    const nextIndex = THREE.MathUtils.euclideanModulo(index, this.scenes.length);
    this.activeSceneIndex = nextIndex;
    this.renderPass.scene = this.scenes[this.activeSceneIndex].getScene();
  }

  nextScene() {
    this.setScene(this.activeSceneIndex + 1);
  }

  previousScene() {
    this.setScene(this.activeSceneIndex - 1);
  }

  getSceneCount() {
    return this.scenes.length;
  }

  getActiveSceneIndex() {
    return this.activeSceneIndex;
  }

  getActiveScene() {
    return this.scenes[this.activeSceneIndex];
  }

  getActiveSceneName() {
    return this.getActiveScene().getSceneName();
  }

  setPreset(index) {
    this.getActiveScene().setPreset(index);
  }

  nextPreset() {
    this.getActiveScene().nextPreset();
  }

  previousPreset() {
    this.getActiveScene().previousPreset();
  }

  getActivePresetIndex() {
    return this.getActiveScene().getActivePresetIndex();
  }

  getActivePresetCount() {
    return this.getActiveScene().getPresetCount();
  }

  getActivePresetName() {
    return this.getActiveScene().getActivePresetName();
  }

  getActivePreset() {
    const activePreset = this.getActiveScene().getActivePreset();
    return activePreset ? { ...activePreset } : null;
  }

  getActivePresetParameters() {
    return this.getActiveScene().getActivePresetParameters();
  }

  setActivePresetParameter(parameterId, value) {
    this.getActiveScene().setActivePresetParameter(parameterId, value);
  }

  resetActivePreset() {
    this.getActiveScene().resetActivePreset();
  }

  saveActivePreset() {
    return this.getActiveScene().saveActivePreset();
  }

  getActiveScenePresets() {
    return this.getActiveScene().getPresets();
  }

  getActiveSceneSettings() {
    return this.getActiveScene().getSettings();
  }

  setActiveSceneSetting(settingId, value) {
    this.getActiveScene().setSetting(settingId, value);
  }

  resetActiveSceneSettings() {
    this.getActiveScene().resetSettings();
  }

  getOverlaySettings() {
    return this.overlaySettingDefinitions.map((definition) => ({
      ...definition,
      value: this.overlaySettings[definition.id]
    }));
  }

  setOverlaySetting(settingId, value) {
    const definition = this.overlaySettingDefinitions.find((entry) => entry.id === settingId);
    if (!definition) {
      return;
    }

    if (definition.type === 'boolean') {
      this.overlaySettings[definition.id] = Boolean(value);
      return;
    }

    const min = Number.isFinite(definition.min) ? definition.min : 0;
    const max = Number.isFinite(definition.max) ? definition.max : 1;
    const nextValue = Number.isFinite(value) ? value : definition.defaultValue;
    this.overlaySettings[definition.id] = THREE.MathUtils.clamp(nextValue, min, max);
  }

  resetOverlaySettings() {
    this.overlaySettingDefinitions.forEach((definition) => {
      this.overlaySettings[definition.id] = definition.defaultValue;
    });
  }

  animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    const dt = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;

    this.audioEngine.update();

    const activeScene = this.scenes[this.activeSceneIndex];
    activeScene.update(this.audioEngine, dt, elapsed, {
      renderer: this.renderer,
      camera: this.camera
    });

    if (this.bloomPass) {
      if (activeScene.getSceneName() === 'Liquid Mercury') {
        this.bloomPass.strength = 0.32;
        this.bloomPass.radius = 0.5;
        this.bloomPass.threshold = 0.42;
      } else {
        this.bloomPass.strength = 0.75;
        this.bloomPass.radius = 0.6;
        this.bloomPass.threshold = 0.2;
      }
    }

    if (this.grainPass) {
      const overlayEnabled = Boolean(this.overlaySettings.overlayEnabled);
      const grainEnabled = Boolean(this.overlaySettings.grainEnabled);
      const scanlinesEnabled = Boolean(this.overlaySettings.scanlinesEnabled);
      const grainIntensity = Number(this.overlaySettings.grainIntensity) || 0;
      const scanlineIntensity = Number(this.overlaySettings.scanlineIntensity) || 0;

      this.grainPass.enabled = overlayEnabled;
      this.grainPass.uniforms.time.value = elapsed;

      const noiseBase = 0.065 + this.audioEngine.getTreble() * 0.07;
      const scanlineBase = 0.08 + this.audioEngine.getBass() * 0.12;

      this.grainPass.uniforms.noiseIntensity.value = overlayEnabled && grainEnabled ? noiseBase * grainIntensity : 0;
      this.grainPass.uniforms.scanlineIntensity.value =
        overlayEnabled && scanlinesEnabled ? scanlineBase * scanlineIntensity : 0;
    }

    this.composer.render();
  };

  start() {
    this.clock.start();
    this.animate();
  }

  stop() {
    cancelAnimationFrame(this.frameId);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.scenes.forEach((scene) => scene.dispose());
    if (typeof this.composer.dispose === 'function') {
      this.composer.dispose();
    }
    this.renderer.dispose();
  }
}
