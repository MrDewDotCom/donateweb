import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // vite preview ใช้เสิร์ฟ frontend ที่ build แล้ว ให้ Cloudflare Tunnel ชี้มาที่พอร์ตนี้
  preview: {
    port: 4173,
    strictPort: true,
    allowedHosts: ['donate.misterdew.com'],
    // security headers สำหรับหน้าเว็บที่เปิดผ่าน Cloudflare Tunnel
    headers: {
      // ห้ามเว็บอื่นเอาหน้าเราไปฝังใน iframe (กัน clickjacking หน้าแอดมิน)
      // SAMEORIGIN: พรีวิว widget ในหน้าแอดมิน (โดเมนเดียวกัน) ยังใช้ได้
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
})
