import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8090,
    proxy: {
      '/api': {
        target: 'http://localhost:8080/',
        changeOrigin: true,
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, '../backend/src/lib/api.ts')
    }
  }
});
