import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // 상대 경로를 사용하여 어떤 도메인 환경에서도 자산을 안전하게 불러옵니다.
});
