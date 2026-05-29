import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: client on 5173, the Hono proxy server on 8787; forward /api to it so the
// résumé proxy resolves the same way it will in production (one origin).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
