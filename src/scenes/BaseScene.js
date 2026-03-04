import * as THREE from 'three';

const PRESET_STORAGE_KEY = 'scanbass.scene-presets.v1';

export class BaseScene {
  constructor({ sceneName = 'Scene', presets = [], settings = [] } = {}) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = null;
    this.width = 1;
    this.height = 1;
    this.sceneName = sceneName;
    this.sceneStorageId = String(this.sceneName).trim().toLowerCase().replace(/\s+/g, '-');
    this.initialPresets = presets.map((preset) => BaseScene.clonePreset(preset));
    this.presets = presets.map((preset) => BaseScene.clonePreset(preset));
    this.activePresetIndex = 0;
    const baseSettingDefinitions = [
      {
        id: 'zoom',
        label: 'Zoom',
        min: 0.5,
        max: 1.8,
        step: 0.01,
        defaultValue: 1
      }
    ];
    const mergedSettingDefinitions = [...baseSettingDefinitions, ...settings];
    this.settingDefinitions = mergedSettingDefinitions.reduce((acc, definition) => {
      const nextDefinition = {
        id: definition.id,
        label: definition.label ?? definition.id,
        min: definition.min ?? 0,
        max: definition.max ?? 2,
        step: definition.step ?? 0.01,
        defaultValue: definition.defaultValue ?? 1
      };
      const existingIndex = acc.findIndex((candidate) => candidate.id === nextDefinition.id);
      if (existingIndex >= 0) {
        acc[existingIndex] = nextDefinition;
      } else {
        acc.push(nextDefinition);
      }
      return acc;
    }, []);
    this.settings = this.settingDefinitions.reduce((acc, definition) => {
      acc[definition.id] = definition.defaultValue;
      return acc;
    }, {});

    this.loadPersistedPresets();
  }

  init({ camera, width, height }) {
    this.camera = camera;
    this.width = width;
    this.height = height;
    this.applyActivePresetSceneSettings();
    this.applyCameraZoom();
  }

  update() {}

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  onAudioFrame() {}

  getScene() {
    return this.scene;
  }

  getSceneName() {
    return this.sceneName;
  }

  getPresetCount() {
    return Math.max(1, this.presets.length);
  }

  getActivePresetIndex() {
    return this.activePresetIndex;
  }

  getActivePreset() {
    if (this.presets.length === 0) {
      return null;
    }
    return this.presets[this.activePresetIndex];
  }

  getActivePresetName() {
    const active = this.getActivePreset();
    return active?.name ?? 'Default';
  }

  getPresets() {
    return this.presets.map((preset) => BaseScene.clonePreset(preset));
  }

  setPreset(index) {
    const count = this.getPresetCount();
    this.activePresetIndex = THREE.MathUtils.euclideanModulo(index, count);
    this.applyActivePresetSceneSettings();
  }

  nextPreset() {
    this.setPreset(this.activePresetIndex + 1);
  }

  previousPreset() {
    this.setPreset(this.activePresetIndex - 1);
  }

  getActivePresetParameters() {
    const activePreset = this.getActivePreset();
    if (!activePreset) {
      return [];
    }

    return Object.entries(activePreset)
      .filter(([key, value]) => key !== 'name' && Number.isFinite(value))
      .map(([id, value]) => {
        const sourceValues = this.initialPresets
          .map((preset) => preset[id])
          .filter((candidate) => Number.isFinite(candidate));

        const sourceMin = sourceValues.length > 0 ? Math.min(...sourceValues) : value;
        const sourceMax = sourceValues.length > 0 ? Math.max(...sourceValues) : value;
        const spread = Math.max(0.001, sourceMax - sourceMin);
        const min = Math.max(0, sourceMin - spread * 0.6);
        const max = Math.max(min + spread * 1.4, sourceMax + spread * 0.8);
        const defaultValue = this.initialPresets[this.activePresetIndex]?.[id] ?? value;

        return {
          id,
          label: BaseScene.formatLabel(id),
          min,
          max,
          step: BaseScene.getStepSize(max),
          value,
          defaultValue
        };
      });
  }

  setActivePresetParameter(parameterId, value) {
    const activePreset = this.getActivePreset();
    if (!activePreset || parameterId === 'name' || !Number.isFinite(value)) {
      return;
    }

    const parameterDefinition = this.getActivePresetParameters().find((parameter) => parameter.id === parameterId);
    if (!parameterDefinition) {
      return;
    }

    activePreset[parameterId] = THREE.MathUtils.clamp(value, parameterDefinition.min, parameterDefinition.max);
  }

  resetActivePreset() {
    if (this.presets.length === 0) {
      return;
    }

    this.presets[this.activePresetIndex] = BaseScene.clonePreset(this.initialPresets[this.activePresetIndex]);
    this.applyActivePresetSceneSettings();
  }

  saveActivePreset() {
    const activePreset = this.getActivePreset();
    if (!activePreset) {
      return false;
    }

    const nextPreset = BaseScene.clonePreset({
      ...activePreset,
      sceneSettings: this.getSceneSettingsSnapshot()
    });

    this.presets[this.activePresetIndex] = nextPreset;
    this.initialPresets[this.activePresetIndex] = BaseScene.clonePreset(nextPreset);
    this.persistPresets();
    return true;
  }

  applyActivePresetSceneSettings() {
    const activePreset = this.getActivePreset();
    const sceneSettings = activePreset?.sceneSettings;
    if (!sceneSettings || typeof sceneSettings !== 'object') {
      return;
    }

    Object.entries(sceneSettings).forEach(([settingId, value]) => {
      this.setSetting(settingId, value);
    });
  }

  static formatLabel(value) {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  static getStepSize(maxValue) {
    if (maxValue >= 8) {
      return 0.05;
    }

    if (maxValue >= 2) {
      return 0.01;
    }

    if (maxValue >= 0.25) {
      return 0.005;
    }

    return 0.001;
  }

  getSettingDefinitions() {
    return this.settingDefinitions;
  }

  getSettingValue(settingId) {
    return this.settings[settingId] ?? 1;
  }

  getSettings() {
    return this.settingDefinitions.map((definition) => ({
      ...definition,
      value: this.getSettingValue(definition.id)
    }));
  }

  setSetting(settingId, value) {
    const definition = this.settingDefinitions.find((candidate) => candidate.id === settingId);
    if (!definition || !Number.isFinite(value)) {
      return;
    }
    this.settings[settingId] = THREE.MathUtils.clamp(value, definition.min, definition.max);
    if (settingId === 'zoom') {
      this.applyCameraZoom();
    }
  }

  resetSettings() {
    this.settingDefinitions.forEach((definition) => {
      this.settings[definition.id] = definition.defaultValue;
    });
    this.applyCameraZoom();
  }

  applyCameraZoom() {
    if (!this.camera) {
      return;
    }

    this.camera.zoom = this.getSettingValue('zoom');
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.scene.traverse((node) => {
      if (node.geometry) {
        node.geometry.dispose();
      }
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material.dispose());
        } else {
          node.material.dispose();
        }
      }
    });
  }

  getSceneSettingsSnapshot() {
    return this.settingDefinitions.reduce((acc, definition) => {
      acc[definition.id] = this.getSettingValue(definition.id);
      return acc;
    }, {});
  }

  loadPersistedPresets() {
    const persistedPresets = BaseScene.readPersistedPresets(this.sceneStorageId);
    if (!persistedPresets || persistedPresets.length === 0) {
      return;
    }

    this.presets = this.presets.map((preset, index) => {
      const basePreset = BaseScene.clonePreset(preset);
      const savedPreset = BaseScene.clonePreset(persistedPresets[index]);
      if (Object.keys(savedPreset).length === 0) {
        return basePreset;
      }

      const nextPreset = {
        ...basePreset,
        ...savedPreset
      };
      const sceneSettings =
        BaseScene.cloneSceneSettings(savedPreset.sceneSettings) ?? BaseScene.cloneSceneSettings(basePreset.sceneSettings);

      if (sceneSettings) {
        nextPreset.sceneSettings = sceneSettings;
      } else {
        delete nextPreset.sceneSettings;
      }

      return nextPreset;
    });

    this.initialPresets = this.presets.map((preset) => BaseScene.clonePreset(preset));
  }

  persistPresets() {
    BaseScene.writePersistedPresets(
      this.sceneStorageId,
      this.sceneName,
      this.presets.map((preset) => BaseScene.clonePreset(preset))
    );
  }

  static cloneSceneSettings(sceneSettings) {
    if (!sceneSettings || typeof sceneSettings !== 'object') {
      return null;
    }

    const nextSettings = Object.entries(sceneSettings).reduce((acc, [key, value]) => {
      if (Number.isFinite(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});

    return Object.keys(nextSettings).length > 0 ? nextSettings : null;
  }

  static clonePreset(preset) {
    if (!preset || typeof preset !== 'object') {
      return {};
    }

    const nextPreset = Object.entries(preset).reduce((acc, [key, value]) => {
      if (key === 'name' && typeof value === 'string') {
        acc.name = value;
        return acc;
      }

      if (key === 'sceneSettings') {
        const sceneSettings = BaseScene.cloneSceneSettings(value);
        if (sceneSettings) {
          acc.sceneSettings = sceneSettings;
        }
        return acc;
      }

      if (Number.isFinite(value)) {
        acc[key] = value;
      }

      return acc;
    }, {});

    if (typeof preset.name === 'string' && typeof nextPreset.name !== 'string') {
      nextPreset.name = preset.name;
    }

    return nextPreset;
  }

  static readPersistedPresets(sceneStorageId) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const entry = parsed?.scenes?.[sceneStorageId];
      return Array.isArray(entry?.presets) ? entry.presets : null;
    } catch {
      return null;
    }
  }

  static writePersistedPresets(sceneStorageId, sceneName, presets) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      const parsed =
        raw && typeof raw === 'string'
          ? JSON.parse(raw)
          : {
              version: 1,
              scenes: {}
            };

      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      if (!parsed.scenes || typeof parsed.scenes !== 'object') {
        parsed.scenes = {};
      }

      parsed.scenes[sceneStorageId] = {
        sceneName,
        presets,
        savedAt: new Date().toISOString()
      };

      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Ignore storage failures (private mode/quota), preserve in-memory save only.
    }
  }
}
