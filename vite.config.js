import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
    headers: {
      // Enable SharedArrayBuffer for WebCodecs
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
  build: {
    rollupOptions: {
        input: {
main: resolve(__dirname, 'index.html'),
            'best-player': resolve(__dirname, 'src/best-player/index.html'),
            'async-queue': resolve(__dirname, 'src/async-queue/index.html'),
            'custom-promise': resolve(__dirname, 'src/Promise/index.html'),
            '3dcss': resolve(__dirname, 'src/3dcss/index.html'),
        }
    }
  },
  optimizeDeps: {
    exclude: [] // Don't pre-bundle our custom modules
  }
});