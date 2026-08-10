import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          audio: ['tone'],
          editor: ['codemirror', '@codemirror/state', '@codemirror/view'],
          interface: ['react', 'react-dom', 'zustand', 'lucide-react'],
        },
      },
    },
  },
})
