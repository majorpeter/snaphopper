import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8090
  },
  resolve: {
    alias: {
      '@api': path.resolve(__dirname, '../backend/src/lib/api.ts')
    }
  }
});
