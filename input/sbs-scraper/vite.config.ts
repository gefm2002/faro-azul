import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/vtex-api': {
        target: 'https://www.sbs.com.ar',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vtex-api/, ''),
      }
    }
  }
})
