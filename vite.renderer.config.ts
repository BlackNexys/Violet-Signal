import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'cli',
  base: './',
  publicDir: false,
  build: {
    outDir: '../dist-cli',
    emptyOutDir: false,
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'cli/renderer.html'),
    },
  },
})
