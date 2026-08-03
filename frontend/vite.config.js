import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/login': 'http://localhost:5000',
      '/callback': 'http://localhost:5000',
      '/logout': 'http://localhost:5000'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
