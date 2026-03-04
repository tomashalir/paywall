import './styles.css';

import { AudioEngine } from './core/AudioEngine';
import { VisualizerApp } from './core/VisualizerApp';

const MAX_AUDIO_FILE_SIZE_BYTES = 180 * 1024 * 1024;
const AUDIO_EXTENSION_PATTERN = /\.(mp3|wav|ogg|m4a|aac|flac|aiff|aif)$/i;

const canvas = document.querySelector('#webgl-canvas');

const uploadBtn = document.querySelector('#upload-btn');
const audioInput = document.querySelector('#audio-input');
const playBtn = document.querySelector('#play-btn');
const pauseBtn = document.querySelector('#pause-btn');
const trackLabel = document.querySelector('#track-label');
const playStateLabel = document.querySelector('#play-state');
const timeLabel = document.querySelector('#time-label');
const sceneLabel = document.querySelector('#scene-label');
const sceneButtons = [...document.querySelectorAll('.scene-btn')];
const presetLabel = document.querySelector('#preset-label');
const presetPrevBtn = document.querySelector('#preset-prev-btn');
const presetNextBtn = document.querySelector('#preset-next-btn');
const toggleTunerBtn = document.querySelector('#toggle-tuner-btn');
const resetSceneSettingsBtn = document.querySelector('#reset-scene-settings-btn');
const resetOverlaySettingsBtn = document.querySelector('#reset-overlay-settings-btn');
const resetPresetBtn = document.querySelector('#reset-preset-btn');
const savePresetBtn = document.querySelector('#save-preset-btn');
const copyExactPresetBtn = document.querySelector('#copy-exact-preset-btn');
const copyPresetBtn = document.querySelector('#copy-preset-btn');
const copyScenePresetsBtn = document.querySelector('#copy-scene-presets-btn');
const tunerPanel = document.querySelector('#tuner-panel');
const overlaySettingsGrid = document.querySelector('#overlay-settings-grid');
const sceneSettingsGrid = document.querySelector('#scene-settings-grid');
const presetParamsGrid = document.querySelector('#preset-params-grid');
const liveAdjustHud = document.querySelector('#live-adjust-hud');
const statusBanner = document.querySelector('#status-banner');
const dropOverlay = document.querySelector('#drop-overlay');
const advancedControlButtons = [...document.querySelectorAll('.advanced-control')];

const audioEngine = new AudioEngine();
const app = new VisualizerApp(canvas, audioEngine);
const uiState = {
  isTunerVisible: false,
  isLoadingTrack: false,
  liveHudTimeoutId: 0,
  statusTimeoutId: 0,
  dragDepth: 0
};

function setPlayStateText() {
  if (uiState.isLoadingTrack) {
    playStateLabel.textContent = 'Loading...';
    return;
  }

  if (!audioEngine.hasTrack()) {
    playStateLabel.textContent = 'Stopped';
    return;
  }

  playStateLabel.textContent = audioEngine.isPlaying() ? 'Playing' : 'Paused';
}

function setTrackText(name) {
  trackLabel.textContent = name || 'Audio loaded';
}

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function setTimeText() {
  if (!timeLabel) {
    return;
  }

  if (!audioEngine.hasTrack()) {
    timeLabel.textContent = '00:00 / 00:00';
    return;
  }

  const current = audioEngine.audio.currentTime;
  const duration = audioEngine.audio.duration;
  const durationText = Number.isFinite(duration) && duration > 0 ? formatClock(duration) : '--:--';
  timeLabel.textContent = `${formatClock(current)} / ${durationText}`;
}

function setStatus(text, tone = 'info', autoHideMs = 0) {
  if (!statusBanner) {
    return;
  }

  statusBanner.textContent = text;
  statusBanner.classList.toggle('is-success', tone === 'success');
  statusBanner.classList.toggle('is-error', tone === 'error');

  window.clearTimeout(uiState.statusTimeoutId);
  if (autoHideMs <= 0) {
    return;
  }

  uiState.statusTimeoutId = window.setTimeout(() => {
    statusBanner.textContent = 'Ready';
    statusBanner.classList.remove('is-success', 'is-error');
  }, autoHideMs);
}

function setDropOverlay(isVisible) {
  if (!dropOverlay) {
    return;
  }

  dropOverlay.classList.toggle('is-active', isVisible);
  dropOverlay.setAttribute('aria-hidden', String(!isVisible));
}

function dragContainsFiles(dataTransfer) {
  const types = dataTransfer?.types;
  if (!types) {
    return false;
  }

  return Array.from(types).includes('Files');
}

function setControlsState() {
  const hasTrack = audioEngine.hasTrack();
  const isPlaying = audioEngine.isPlaying();

  uploadBtn.disabled = uiState.isLoadingTrack;
  audioInput.disabled = uiState.isLoadingTrack;
  playBtn.disabled = uiState.isLoadingTrack || !hasTrack || isPlaying;
  pauseBtn.disabled = uiState.isLoadingTrack || !hasTrack || !isPlaying;
  uploadBtn.textContent = uiState.isLoadingTrack ? 'Loading...' : 'Upload MP3/WAV';
}

function setLoadingState(isLoading) {
  uiState.isLoadingTrack = isLoading;
  setPlayStateText();
  setControlsState();
}

function validateAudioFile(file) {
  if (!file) {
    return 'No file selected.';
  }

  if (file.size <= 0) {
    return 'This file is empty.';
  }

  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    return 'File is too large. Please use a file under 180 MB.';
  }

  const hasAudioMime = typeof file.type === 'string' && file.type.startsWith('audio/');
  const hasValidExtension = AUDIO_EXTENSION_PATTERN.test(file.name || '');

  if (!hasAudioMime && !hasValidExtension) {
    return 'Unsupported file format. Use MP3, WAV, OGG, M4A, AAC, FLAC, or AIFF.';
  }

  return null;
}

function setSceneUI(index) {
  sceneButtons.forEach((button) => {
    const isActive = Number(button.dataset.sceneIndex) === index;
    button.classList.toggle('is-active', isActive);
  });

  sceneLabel.textContent = `Scene ${index + 1} / ${app.getSceneCount()} · ${app.getActiveSceneName()}`;
}

function setPresetUI() {
  presetLabel.textContent = `Preset ${app.getActivePresetIndex() + 1} / ${app.getActivePresetCount()} · ${app.getActivePresetName()}`;
}

function getPrecision(step) {
  if (!Number.isFinite(step) || step <= 0) {
    return 2;
  }

  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return Math.min(4, decimals);
}

function formatValue(value, step = 0.01) {
  if (!Number.isFinite(value)) {
    return '--';
  }

  return value.toFixed(getPrecision(step));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getFillPercent(value, min, max) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) {
    return 50;
  }
  return ((value - min) / span) * 100;
}

function isModified(value, defaultValue, step) {
  const threshold = Math.max(0.000001, Math.abs(step) * 0.5);
  return Math.abs(value - defaultValue) > threshold;
}

function showLiveAdjust(label, value, step, groupLabel, displayValue = null) {
  if (!liveAdjustHud) {
    return;
  }

  const valueText = displayValue ?? formatValue(value, step);
  liveAdjustHud.textContent = `${groupLabel}: ${label} ${valueText}`;
  liveAdjustHud.classList.add('is-visible');

  window.clearTimeout(uiState.liveHudTimeoutId);
  uiState.liveHudTimeoutId = window.setTimeout(() => {
    liveAdjustHud.classList.remove('is-visible');
  }, 900);
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function createEmptyState(text) {
  const empty = document.createElement('div');
  empty.className = 'tuner-empty';
  empty.textContent = text;
  return empty;
}

function createSliderRow(definition, onInput, groupLabel) {
  const min = Number.isFinite(definition.min) ? definition.min : 0;
  const max = Number.isFinite(definition.max) ? definition.max : 1;
  const step = Number.isFinite(definition.step) && definition.step > 0 ? definition.step : 0.01;
  const defaultValue = Number.isFinite(definition.defaultValue)
    ? clamp(definition.defaultValue, min, max)
    : clamp(definition.value, min, max);
  let currentValue = clamp(Number.isFinite(definition.value) ? definition.value : defaultValue, min, max);

  const row = document.createElement('div');
  row.className = 'tuner-row';

  const header = document.createElement('div');
  header.className = 'tuner-row-header';

  const label = document.createElement('span');
  label.className = 'tuner-name';
  label.textContent = definition.label;

  const value = document.createElement('span');
  value.className = 'tuner-value';
  value.textContent = formatValue(currentValue, step);

  header.append(label, value);

  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'tuner-slider-wrap';

  const minLabel = document.createElement('span');
  minLabel.className = 'tuner-bound';
  minLabel.textContent = formatValue(min, step);

  const slider = document.createElement('input');
  slider.className = 'tuner-slider';
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(currentValue);

  const maxLabel = document.createElement('span');
  maxLabel.className = 'tuner-bound';
  maxLabel.textContent = formatValue(max, step);

  sliderWrap.append(minLabel, slider, maxLabel);

  const footer = document.createElement('div');
  footer.className = 'tuner-row-footer';

  const numberInput = document.createElement('input');
  numberInput.className = 'tuner-number';
  numberInput.type = 'number';
  numberInput.min = String(min);
  numberInput.max = String(max);
  numberInput.step = String(step);
  numberInput.value = formatValue(currentValue, step);

  const delta = document.createElement('span');
  delta.className = 'tuner-delta';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'tuner-reset';
  resetBtn.type = 'button';
  resetBtn.textContent = 'Reset';

  footer.append(numberInput, delta, resetBtn);

  const syncVisualState = (nextValue) => {
    currentValue = clamp(nextValue, min, max);
    slider.value = String(currentValue);
    numberInput.value = formatValue(currentValue, step);
    value.textContent = formatValue(currentValue, step);
    slider.style.setProperty('--fill-percent', `${getFillPercent(currentValue, min, max)}%`);

    if (isModified(currentValue, defaultValue, step)) {
      row.classList.add('is-modified');
      resetBtn.disabled = false;
      const offset = currentValue - defaultValue;
      delta.textContent = `Delta ${offset >= 0 ? '+' : ''}${formatValue(offset, step)}`;
    } else {
      row.classList.remove('is-modified');
      resetBtn.disabled = true;
      delta.textContent = 'Default';
    }
  };

  const applyValue = (candidateValue) => {
    if (!Number.isFinite(candidateValue)) {
      syncVisualState(currentValue);
      return;
    }

    const nextValue = clamp(candidateValue, min, max);
    onInput(nextValue);
    syncVisualState(nextValue);
    showLiveAdjust(definition.label, nextValue, step, groupLabel);
  };

  slider.addEventListener('input', () => {
    applyValue(Number.parseFloat(slider.value));
  });

  numberInput.addEventListener('change', () => {
    applyValue(Number.parseFloat(numberInput.value));
  });

  resetBtn.addEventListener('click', () => {
    applyValue(defaultValue);
  });

  syncVisualState(currentValue);
  row.append(header, sliderWrap, footer);
  return row;
}

function createToggleRow(definition, onInput, groupLabel) {
  const defaultValue = Boolean(definition.defaultValue);
  let currentValue = Boolean(definition.value);

  const row = document.createElement('div');
  row.className = 'tuner-row tuner-toggle-row';

  const header = document.createElement('div');
  header.className = 'tuner-row-header';

  const label = document.createElement('span');
  label.className = 'tuner-name';
  label.textContent = definition.label;

  const value = document.createElement('span');
  value.className = 'tuner-value';

  header.append(label, value);

  const toggleWrap = document.createElement('label');
  toggleWrap.className = 'tuner-toggle-wrap';

  const toggle = document.createElement('input');
  toggle.className = 'tuner-toggle';
  toggle.type = 'checkbox';

  const toggleState = document.createElement('span');
  toggleState.className = 'tuner-toggle-state';

  toggleWrap.append(toggle, toggleState);

  const footer = document.createElement('div');
  footer.className = 'tuner-row-footer';

  const delta = document.createElement('span');
  delta.className = 'tuner-delta';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'tuner-reset';
  resetBtn.type = 'button';
  resetBtn.textContent = 'Reset';

  footer.append(delta, resetBtn);

  const syncVisualState = (nextValue) => {
    currentValue = Boolean(nextValue);
    toggle.checked = currentValue;
    const stateText = currentValue ? 'On' : 'Off';
    value.textContent = stateText;
    toggleState.textContent = stateText;

    if (currentValue !== defaultValue) {
      row.classList.add('is-modified');
      resetBtn.disabled = false;
      delta.textContent = `Default ${defaultValue ? 'On' : 'Off'}`;
    } else {
      row.classList.remove('is-modified');
      resetBtn.disabled = true;
      delta.textContent = 'Default';
    }
  };

  const applyValue = (candidateValue) => {
    const nextValue = Boolean(candidateValue);
    onInput(nextValue);
    syncVisualState(nextValue);
    showLiveAdjust(definition.label, nextValue ? 1 : 0, 1, groupLabel, nextValue ? 'On' : 'Off');
  };

  toggle.addEventListener('change', () => {
    applyValue(toggle.checked);
  });

  resetBtn.addEventListener('click', () => {
    applyValue(defaultValue);
  });

  syncVisualState(currentValue);
  row.append(header, toggleWrap, footer);
  return row;
}

function renderOverlaySettings() {
  clearElement(overlaySettingsGrid);
  const settings = app.getOverlaySettings();

  if (settings.length === 0) {
    overlaySettingsGrid.append(createEmptyState('No overlay settings.'));
    return;
  }

  settings.forEach((setting) => {
    const row =
      setting.type === 'boolean'
        ? createToggleRow(
            setting,
            (nextValue) => {
              app.setOverlaySetting(setting.id, nextValue);
            },
            'Overlay'
          )
        : createSliderRow(
            setting,
            (nextValue) => {
              app.setOverlaySetting(setting.id, nextValue);
            },
            'Overlay'
          );
    overlaySettingsGrid.append(row);
  });
}

function renderSceneSettings() {
  clearElement(sceneSettingsGrid);
  const settings = app.getActiveSceneSettings();

  if (settings.length === 0) {
    sceneSettingsGrid.append(createEmptyState('No scene-level settings.'));
    return;
  }

  settings.forEach((setting) => {
    const row = createSliderRow(setting, (nextValue) => {
      app.setActiveSceneSetting(setting.id, nextValue);
    }, 'Scene');
    sceneSettingsGrid.append(row);
  });
}

function renderPresetParameters() {
  clearElement(presetParamsGrid);
  const parameters = app.getActivePresetParameters();

  if (parameters.length === 0) {
    presetParamsGrid.append(createEmptyState('No preset parameters.'));
    return;
  }

  parameters.forEach((parameter) => {
    const row = createSliderRow(parameter, (nextValue) => {
      app.setActivePresetParameter(parameter.id, nextValue);
    }, 'Preset');
    presetParamsGrid.append(row);
  });
}

function renderTuner() {
  if (!uiState.isTunerVisible) {
    return;
  }

  renderOverlaySettings();
  renderSceneSettings();
  renderPresetParameters();
}

function setTunerVisibility(isVisible) {
  uiState.isTunerVisible = isVisible;
  tunerPanel.classList.toggle('is-hidden', !isVisible);
  toggleTunerBtn.textContent = isVisible ? 'Hide Advanced Controls' : 'Show Advanced Controls';
  advancedControlButtons.forEach((button) => {
    button.classList.toggle('is-hidden', !isVisible);
  });
  if (isVisible) {
    renderTuner();
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  const didCopy = document.execCommand('copy');
  textarea.remove();

  if (!didCopy) {
    throw new Error('Copy failed');
  }
}

async function copyWithFeedback(button, valueFactory, successText) {
  const originalText = button.textContent;

  try {
    await copyText(valueFactory());
    button.textContent = successText;
    setStatus('Copied to clipboard.', 'success', 1200);
  } catch {
    button.textContent = 'Copy failed';
    setStatus('Could not copy to clipboard.', 'error');
  }

  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1200);
}

function showButtonFeedback(button, text) {
  const originalText = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1200);
}

function toValueMap(definitions) {
  return definitions.reduce((acc, definition) => {
    if (definition && typeof definition.id === 'string') {
      acc[definition.id] = definition.value;
    }
    return acc;
  }, {});
}

function buildActiveTuningSnapshot() {
  return {
    schema: 'scanbass.tuning.v1',
    exportedAt: new Date().toISOString(),
    scene: {
      index: app.getActiveSceneIndex(),
      name: app.getActiveSceneName(),
      settings: toValueMap(app.getActiveSceneSettings())
    },
    overlay: {
      settings: toValueMap(app.getOverlaySettings())
    },
    preset: {
      index: app.getActivePresetIndex(),
      name: app.getActivePresetName(),
      values: app.getActivePreset()
    }
  };
}

function buildSceneTuningSnapshot() {
  return {
    schema: 'scanbass.scene.v1',
    exportedAt: new Date().toISOString(),
    scene: {
      index: app.getActiveSceneIndex(),
      name: app.getActiveSceneName(),
      settings: toValueMap(app.getActiveSceneSettings()),
      activePresetIndex: app.getActivePresetIndex(),
      presets: app.getActiveScenePresets()
    },
    overlay: {
      settings: toValueMap(app.getOverlaySettings())
    }
  };
}

function buildExactPresetSnapshot() {
  const activePreset = app.getActivePreset() ?? {};
  return {
    ...activePreset,
    name: activePreset.name ?? app.getActivePresetName(),
    sceneSettings: toValueMap(app.getActiveSceneSettings())
  };
}

function refreshAllUI() {
  setSceneUI(app.getActiveSceneIndex());
  setPresetUI();
  renderTuner();
}

async function handleFile(file) {
  const validationError = validateAudioFile(file);
  if (validationError) {
    setStatus(validationError, 'error');
    return;
  }

  setLoadingState(true);
  setStatus(`Loading "${file.name}"...`);

  try {
    await audioEngine.loadFile(file);
    setTrackText(file.name);
    await audioEngine.play();
    setPlayStateText();
    setTimeText();
    setStatus(`Loaded ${file.name}`, 'success', 2000);
  } catch (error) {
    setPlayStateText();
    setStatus(error.message || 'Could not load this audio file.', 'error');
  } finally {
    setLoadingState(false);
  }
}

function pickFirstAudioFile(fileList) {
  for (const candidate of fileList) {
    if (!candidate) {
      continue;
    }

    if (candidate.type.startsWith('audio/') || AUDIO_EXTENSION_PATTERN.test(candidate.name || '')) {
      return candidate;
    }
  }

  return null;
}

uploadBtn.addEventListener('click', () => {
  audioInput.click();
});

audioInput.addEventListener('change', async (event) => {
  const [file] = [...(event.target.files ?? [])];
  await handleFile(file);
  audioInput.value = '';
});

playBtn.addEventListener('click', async () => {
  if (uiState.isLoadingTrack) {
    return;
  }

  try {
    await audioEngine.play();
    setPlayStateText();
    setControlsState();
    setStatus('Playback started.', 'success', 1200);
  } catch {
    setPlayStateText();
    setControlsState();
    setStatus('Load an audio file first.', 'error');
  }
});

pauseBtn.addEventListener('click', () => {
  audioEngine.pause();
  setPlayStateText();
  setControlsState();
  setStatus('Playback paused.', 'success', 1200);
});

sceneButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const index = button.dataset.sceneIndex;
    if (index == null) {
      return;
    }

    const next = Number(index);
    if (!Number.isInteger(next)) {
      return;
    }

    app.setScene(next);
    refreshAllUI();
  });
});

presetPrevBtn.addEventListener('click', () => {
  app.previousPreset();
  setPresetUI();
  renderSceneSettings();
  renderPresetParameters();
});

presetNextBtn.addEventListener('click', () => {
  app.nextPreset();
  setPresetUI();
  renderSceneSettings();
  renderPresetParameters();
});

toggleTunerBtn.addEventListener('click', () => {
  setTunerVisibility(!uiState.isTunerVisible);
});

resetSceneSettingsBtn.addEventListener('click', () => {
  app.resetActiveSceneSettings();
  renderSceneSettings();
});

resetOverlaySettingsBtn.addEventListener('click', () => {
  app.resetOverlaySettings();
  renderOverlaySettings();
});

resetPresetBtn.addEventListener('click', () => {
  app.resetActivePreset();
  setPresetUI();
  renderSceneSettings();
  renderPresetParameters();
});

savePresetBtn.addEventListener('click', () => {
  const didSave = app.saveActivePreset();
  showButtonFeedback(savePresetBtn, didSave ? 'Preset saved for scene' : 'Save failed');
  setStatus(didSave ? 'Preset saved for this scene.' : 'Could not save preset.', didSave ? 'success' : 'error', 1800);
});

copyExactPresetBtn.addEventListener('click', async () => {
  await copyWithFeedback(
    copyExactPresetBtn,
    () => JSON.stringify(buildExactPresetSnapshot(), null, 2),
    'Exact preset copied'
  );
});

copyPresetBtn.addEventListener('click', async () => {
  await copyWithFeedback(
    copyPresetBtn,
    () => JSON.stringify(buildActiveTuningSnapshot(), null, 2),
    'Live tuning copied'
  );
});

copyScenePresetsBtn.addEventListener('click', async () => {
  await copyWithFeedback(
    copyScenePresetsBtn,
    () => JSON.stringify(buildSceneTuningSnapshot(), null, 2),
    'Scene tuning copied'
  );
});

window.addEventListener('keydown', (event) => {
  const target = event.target;
  if (
    target instanceof HTMLInputElement &&
    (target.type === 'range' || target.type === 'text' || target.type === 'number' || target.type === 'checkbox')
  ) {
    return;
  }

  const keyNumber = Number.parseInt(event.key, 10);
  if (Number.isInteger(keyNumber) && keyNumber >= 1 && keyNumber <= app.getSceneCount()) {
    const index = keyNumber - 1;
    app.setScene(index);
    refreshAllUI();
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    app.nextScene();
    refreshAllUI();
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    app.previousScene();
    refreshAllUI();
  }

  if (event.key === 'ArrowUp' || event.key === ']') {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
    }
    app.nextPreset();
    setPresetUI();
    renderSceneSettings();
    renderPresetParameters();
  }

  if (event.key === 'ArrowDown' || event.key === '[') {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
    }
    app.previousPreset();
    setPresetUI();
    renderSceneSettings();
    renderPresetParameters();
  }
});

window.addEventListener('dragenter', (event) => {
  if (!dragContainsFiles(event.dataTransfer)) {
    return;
  }

  uiState.dragDepth += 1;
  setDropOverlay(true);
});

window.addEventListener('dragleave', (event) => {
  if (!dragContainsFiles(event.dataTransfer)) {
    return;
  }

  uiState.dragDepth = Math.max(0, uiState.dragDepth - 1);
  if (uiState.dragDepth === 0) {
    setDropOverlay(false);
  }
});

window.addEventListener('dragover', (event) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
});

window.addEventListener('drop', async (event) => {
  event.preventDefault();
  uiState.dragDepth = 0;
  setDropOverlay(false);

  const file = pickFirstAudioFile([...(event.dataTransfer?.files ?? [])]);
  await handleFile(file);
});

audioEngine.audio.addEventListener('ended', () => {
  setPlayStateText();
  setControlsState();
  setTimeText();
});

audioEngine.audio.addEventListener('pause', () => {
  setPlayStateText();
  setControlsState();
  setTimeText();
});

audioEngine.audio.addEventListener('play', () => {
  setPlayStateText();
  setControlsState();
});

audioEngine.audio.addEventListener('timeupdate', () => {
  setTimeText();
});

audioEngine.audio.addEventListener('loadedmetadata', () => {
  setTimeText();
});

setSceneUI(0);
setPresetUI();
setPlayStateText();
setTimeText();
setControlsState();
setStatus('Ready. Upload an audio file to begin.');
setTunerVisibility(false);
app.start();

window.addEventListener('beforeunload', () => {
  app.dispose();
  audioEngine.dispose();
});
