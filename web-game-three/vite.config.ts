import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
    assetsInclude: ['**/*.glb', '**/*.hdr'], // 支持3D模型和纹理文件（可选，以后用）
  optimizeDeps: {
    include: ['babylonjs','cannon']
  },
  define: {
    global: 'globalThis',
  }
})
