import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './src/Promise',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/Promise',
    target: 'esnext',
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'Promise': resolve(__dirname, 'src/Promise/index.html')
      }
    }
  },
  server: {
    port: 3003
  }
});