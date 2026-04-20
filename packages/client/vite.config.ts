import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@gungi/engine': path.resolve(__dirname, '../engine/src/engine.ts'),
    },
  },
  server: {
    port: 5173,
    // Bind on all interfaces so LAN devices and ngrok tunnels can reach the dev server.
    host: true,
    // Allow ngrok-style rotating hostnames (and any LAN host) to load the app.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
