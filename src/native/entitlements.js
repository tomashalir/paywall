import { callNative, isNativeShell, onNativeEvent } from './nativeBridge';

// What the free tier of the App Store app includes. Everything else needs the
// one-time "Pro" in-app purchase. The website build is never gated.
export const FREE_SCENE_INDEXES = new Set([0]);
export const PRO_FEATURES = {
  advancedControls: true
};

export class Entitlements {
  constructor() {
    this.isGated = isNativeShell();
    this.isProUnlocked = !this.isGated;
    this.product = null;
    this.listeners = new Set();
    this.unsubscribeNative = null;
  }

  async init() {
    if (!this.isGated) {
      return;
    }

    this.unsubscribeNative = onNativeEvent((detail) => {
      if (detail.type === 'store.state') {
        this.applyState(detail.state);
      }
    });

    try {
      this.applyState(await callNative('store.getState'));
    } catch {
      // Store may be unreachable (offline, StoreKit outage). Stay on the free tier;
      // the paywall retries when it opens.
    }
  }

  applyState(state) {
    if (!state || typeof state !== 'object') {
      return;
    }

    const wasUnlocked = this.isProUnlocked;
    this.isProUnlocked = Boolean(state.isProUnlocked);
    if (state.product) {
      this.product = state.product;
    }

    this.listeners.forEach((listener) => listener(this, wasUnlocked));
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isSceneUnlocked(index) {
    return this.isProUnlocked || FREE_SCENE_INDEXES.has(index);
  }

  isFeatureUnlocked(feature) {
    return this.isProUnlocked || !PRO_FEATURES[feature];
  }

  async refresh() {
    if (!this.isGated) {
      return;
    }

    this.applyState(await callNative('store.getState'));
  }

  async purchase() {
    const result = await callNative('store.purchase');
    this.applyState(result);
    return result?.outcome ?? 'cancelled';
  }

  async restore() {
    this.applyState(await callNative('store.restore'));
    return this.isProUnlocked;
  }
}
