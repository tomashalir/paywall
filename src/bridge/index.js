import './styles.css';

import { BridgeVisualizerApp } from './BridgeVisualizerApp.js';

function createBackendLogger() {
  const backend = window.__JUCE__?.backend;
  if (!backend || typeof backend.emitEvent !== 'function') {
    return () => {};
  }

  return (level, message, context = null) => {
    try {
      backend.emitEvent('scanbassLog', {
        level,
        message,
        context,
        href: window.location.href,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[ScanBassBridge] Failed to send backend log', error);
    }
  };
}

const backendLog = createBackendLogger();
window.__scanbassBackendLog = backendLog;

window.addEventListener('error', (event) => {
  backendLog('error', 'window.error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack ?? null
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  backendLog('error', 'window.unhandledrejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : null
  });
});

function showFatalError(error) {
  console.error('[ScanBassBridge] Fatal init error', error);
  backendLog('error', 'Bridge initialization failed', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null
  });

  const root = document.querySelector('#bridge-root') ?? document.body;
  const message = document.createElement('pre');
  message.style.margin = '0';
  message.style.padding = '16px';
  message.style.color = '#ffd6d6';
  message.style.fontFamily = 'monospace';
  message.style.whiteSpace = 'pre-wrap';
  message.style.background = '#2c0d0d';
  message.textContent = `Bridge initialization failed:\n${error instanceof Error ? error.message : String(error)}`;

  root.innerHTML = '';
  root.appendChild(message);
}

try {
  backendLog('info', 'Bridge bootstrap started');

  const canvas = document.querySelector('#scanbass-canvas');
  if (!canvas) {
    throw new Error('Bridge canvas not found.');
  }

  const visualizerApp = new BridgeVisualizerApp(canvas);
  backendLog('info', 'Bridge visualizer initialized');

  window.ScanBassBridge = {
    onAudioFrame(frame) {
      visualizerApp.onAudioFrame(frame);
    },

    onConfig(config) {
      visualizerApp.onConfig(config);
    }
  };

  window.addEventListener('beforeunload', () => {
    backendLog('info', 'Bridge beforeunload');
    visualizerApp.dispose();
    delete window.__scanbassBackendLog;
  });

  backendLog('info', 'ScanBassBridge API registered');
} catch (error) {
  showFatalError(error);
}
