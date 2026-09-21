/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './'：构建产物为相对路径，可部署到任意静态托管的仓库子路径（如 GitHub Pages）
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // jsdom 需要同源 url 才会启用 localStorage（战绩持久化测试依赖）
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
