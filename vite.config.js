import { defineConfig } from 'vite';

export default defineConfig({
  // Use './' so the build is hostable at any GitHub Pages subpath.
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // keep data files out of inlined assets
  },
});
