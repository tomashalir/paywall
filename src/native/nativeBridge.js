// Messaging layer between the web app and the native Apple shell (apple/).
//
// The shell injects `window.__SCANBASS_NATIVE__ = { platform }` at document start and
// registers a `scanbass` script message handler that replies with a Promise
// (WKScriptMessageHandlerWithReply). Native → web events arrive as
// `scanbass:native` CustomEvents on `window`.
//
// Outside the shell (plain browser / website deploy) there is no bridge, so the web
// build keeps its original behavior. Append `?native=mock` to the URL to run the app
// against an in-memory mock store and preview the paywall in a desktop browser.

const NATIVE_EVENT = 'scanbass:native';

function getMockMode() {
  try {
    return new URLSearchParams(window.location.search).get('native') === 'mock';
  } catch {
    return false;
  }
}

function getNativeHandler() {
  return window.webkit?.messageHandlers?.scanbass ?? null;
}

function createMockBackend() {
  const STORAGE_KEY = 'scanbass.mock-pro-unlocked';
  const read = () => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  };
  const write = (value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Ignore storage failures in mock mode.
    }
  };
  const product = {
    id: 'mock.pro',
    displayName: 'Scanbass Pro',
    description: 'Unlock every scene and the advanced tuner.',
    displayPrice: '$4.99'
  };
  const state = () => ({ isProUnlocked: read(), product });
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  return async (action) => {
    await delay(350);
    switch (action) {
      case 'store.getState':
        return state();
      case 'store.purchase': {
        const confirmed = window.confirm(`[Mock store] Buy ${product.displayName} for ${product.displayPrice}?`);
        if (!confirmed) {
          return { ...state(), outcome: 'cancelled' };
        }
        write(true);
        return { ...state(), outcome: 'purchased' };
      }
      case 'store.restore':
        return state();
      case 'store.resetMock':
        write(false);
        return state();
      default:
        return null;
    }
  };
}

const mockBackend = !getNativeHandler() && getMockMode() ? createMockBackend() : null;

export function getNativePlatform() {
  if (mockBackend) {
    return 'mock';
  }

  if (!getNativeHandler()) {
    return null;
  }

  return window.__SCANBASS_NATIVE__?.platform ?? 'ios';
}

export function isNativeShell() {
  return getNativePlatform() !== null;
}

export async function callNative(action, payload = {}) {
  if (mockBackend) {
    return mockBackend(action, payload);
  }

  const handler = getNativeHandler();
  if (!handler) {
    throw new Error('Native bridge is not available.');
  }

  return handler.postMessage({ action, payload });
}

export function onNativeEvent(listener) {
  const wrapped = (event) => listener(event.detail ?? {});
  window.addEventListener(NATIVE_EVENT, wrapped);
  return () => window.removeEventListener(NATIVE_EVENT, wrapped);
}
