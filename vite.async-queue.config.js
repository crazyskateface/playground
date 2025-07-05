import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './src/async-queue',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/async-queue',
    target: 'esnext',
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'async-queue': resolve(__dirname, 'src/async-queue/index.html')
      }
    }
  },
  server: {
    port: 3002
  }
});