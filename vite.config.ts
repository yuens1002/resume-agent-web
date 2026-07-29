import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: client on 5000, the Hono proxy server on 8787; forward the server-owned routes to
// it so they resolve the same way they will in production (one origin). The server-rendered
// pages read `./dist/index.html`, so `npm run build` must have run at least once for
// /projects, /observations and friends to render in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    proxy: {
      '/api': 'http://localhost:8787',
      '/projects': 'http://localhost:8787',
      '/observations': 'http://localhost:8787',
      '/sitemap.xml': 'http://localhost:8787',
      '/robots.txt': 'http://localhost:8787',
      '/llms.txt': 'http://localhost:8787',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
