import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    rollupOptions: {
      // The App Store app (apple/) only ships the visualizer page, not the VST bridge renderer.
      input:
        mode === 'apple'
          ? { app: resolve(__dirname, 'index.html') }
          : {
              app: resolve(__dirname, 'index.html'),
              bridge: resolve(__dirname, 'bridge.html')
            }
    }
  }
}));
