import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        bridge: resolve(__dirname, 'bridge.html')
      }
    }
  }
});
