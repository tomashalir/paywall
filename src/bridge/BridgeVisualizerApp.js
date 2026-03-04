import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { grainShader } from '../shaders/grainShader.js';
import { BridgeAudioState } from './BridgeAudioState.js';
import { SceneAdapter } from './SceneAdapter.js';
import { normalizeSceneId, sceneRegistry } from './sceneRegistry.js';

function backendLog(level, message, context = null) {
  const logger = window.__scanbassBackendLog;
  if (typeof logger === 'function') {
    logger(level, message, context);
  }
}

export class BridgeVisualizerApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.audioState = new BridgeAudioState();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
    this.camera.position.set(0, 0, 9);

    this.fallbackScene = new THREE.Scene();
    this.activeScene = null;
    this.activeSceneId = 'scene1';
    this.lastFrame = { rms: 0, peak: 0, fft: Array(64).fill(0) };
    this.sceneSwitchToken = 0;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.fallbackScene, this.camera);
    this.composer.addPass(this.renderPass);

    const { width, height } = this.getCanvasSize();
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.75, 0.6, 0.2);
    this.composer.addPass(this.bloomPass);

    this.grainPass = new ShaderPass(grainShader);
    this.composer.addPass(this.grainPass);

    this.resizeObserver = null;
    this.frameId = 0;

    this.handleResize = () => {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.resize();
    };

    this.resize();
    window.addEventListener('resize', this.handleResize);

    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvas);
    }

    this.switchScene('scene1');
    this.start();
  }

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
    this.composer.setSize(width, height);
    this.activeScene?.resize(width, height);
  }

  onAudioFrame(frame) {
    const nextFrame = {
      rms: Number.isFinite(frame?.rms) ? frame.rms : 0,
      peak: Number.isFinite(frame?.peak) ? frame.peak : 0,
      fft: Array.isArray(frame?.fft) ? frame.fft : []
    };

    this.lastFrame = nextFrame;
    this.audioState.ingest(nextFrame);
    this.activeScene?.onAudioFrame(nextFrame);
  }

  onConfig(config) {
    const nextSceneId = normalizeSceneId(config?.sceneId);
    this.switchScene(nextSceneId);
  }

  async switchScene(sceneId) {
    const nextSceneId = normalizeSceneId(sceneId);
    if (this.activeSceneId === nextSceneId && this.activeScene) {
      return;
    }

    const token = ++this.sceneSwitchToken;
    const factory = sceneRegistry[nextSceneId] ?? sceneRegistry.scene1;

    try {
      const scene = await factory();
      const adapter = new SceneAdapter(scene, this.audioState);
      const { width, height } = this.getCanvasSize();
      adapter.init({
        camera: this.camera,
        width,
        height
      });
      adapter.onAudioFrame(this.lastFrame);

      if (token !== this.sceneSwitchToken) {
        adapter.dispose();
        return;
      }

      if (this.activeScene) {
        this.activeScene.dispose();
      }

      this.activeScene = adapter;
      this.activeSceneId = nextSceneId;
      this.renderPass.scene = adapter.getSceneObject();
      backendLog('info', 'Scene switched', { sceneId: nextSceneId });
    } catch (error) {
      console.error('Unable to switch scene:', error);
      backendLog('error', 'Unable to switch scene', {
        sceneId: nextSceneId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      });
    }
  }

  animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    this.audioState.tick(dt);

    this.activeScene?.render(dt, elapsed, {
      renderer: this.renderer,
      camera: this.camera
    });

    if (this.bloomPass) {
      const activeSceneName = this.activeScene?.getSceneName?.() ?? '';
      if (activeSceneName === 'Liquid Mercury') {
        this.bloomPass.strength = 0.32;
        this.bloomPass.radius = 0.5;
        this.bloomPass.threshold = 0.42;
      } else {
        this.bloomPass.strength = 0.75;
        this.bloomPass.radius = 0.6;
        this.bloomPass.threshold = 0.2;
      }
    }

    this.grainPass.uniforms.time.value = elapsed;
    this.grainPass.uniforms.noiseIntensity.value = 0.06 + this.audioState.getTreble() * 0.08;
    this.grainPass.uniforms.scanlineIntensity.value = 0.08 + this.audioState.getBass() * 0.11;

    this.composer.render();
  };

  start() {
    if (this.frameId !== 0) {
      return;
    }

    this.clock.start();
    this.animate();
  }

  stop() {
    if (this.frameId === 0) {
      return;
    }

    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.activeScene) {
      this.activeScene.dispose();
      this.activeScene = null;
    }

    if (typeof this.composer.dispose === 'function') {
      this.composer.dispose();
    }

    this.renderer.dispose();
  }
}
