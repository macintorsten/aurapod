
import { defineConfig } from 'vite';

export default defineConfig({
  // Set base to './' so the app works in GitHub Pages subfolders
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 3000,
  }
});
