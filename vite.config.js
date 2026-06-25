import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Proxy target for the API. Deliberately NOT process.env.PORT — some dev/preview
// harnesses inject PORT for the web server itself, which would point /api at this
// server (an infinite proxy loop). Use a dedicated var with a fixed default.
const API_PORT = process.env.API_PORT || 3001

// In dev, the React app runs on :5173 and the API on :3001.
// We proxy /api -> the local express server so fetch('/api/...') just works.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Take control immediately and drop stale precaches so a new deploy
        // surfaces on the next reload instead of after several.
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // Don't serve the SPA shell for API paths (they hit serverless functions).
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'FillFinder',
        short_name: 'FillFinder',
        description:
          'Find pharmacy availability for short-supply prescriptions and track your refills.',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
