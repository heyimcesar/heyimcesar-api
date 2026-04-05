import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/oura': 'http://localhost:3000',
      '/mtg-sets': 'http://localhost:3000',
      '/spotify': 'http://localhost:3000',
      '/strava': 'http://localhost:3000',
    }
  }
})