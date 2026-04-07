import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // @react-pdf/renderer has issues with Vite pre-bundling
    exclude: ['@react-pdf/renderer'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@react-pdf/renderer')) return 'pdf'
        },
      },
    },
  },
})
