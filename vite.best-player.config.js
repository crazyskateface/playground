import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './src/best-player',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/best-player',
    target: 'esnext',
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'best-player': resolve(__dirname, 'src/best-player/index.html')
      }
    }
  },
  server: {
    port: 3001,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
});