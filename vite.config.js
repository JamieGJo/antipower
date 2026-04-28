import { defineConfig } from 'vite';

export default defineConfig({
  base: '/antipower/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // keep data files out of inlined assets
  },
});
