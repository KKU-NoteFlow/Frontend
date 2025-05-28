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
    host: true,
    port: 5174,
    strictPort: true,
    open: true, // 자동 브라우저 열기 비활성화
  }
})
