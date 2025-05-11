import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src', // 경로 설정 (선택)
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true,
  }
})
