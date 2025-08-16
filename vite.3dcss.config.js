import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './src/3dcss',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/3dcss',
    target: 'esnext',
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        '3dcss': resolve(__dirname, 'src/3dcss/index.html')
      }
    }
  },
  server: {
    port: 3028, // Random port to avoid conflicts
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
});