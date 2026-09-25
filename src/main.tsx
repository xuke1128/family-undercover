import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('找不到 #root 挂载点');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 断网可玩（PRD §5）：生产环境注册离线缓存 Service Worker（访问过一次后完全离线）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 新版 SW 接管（skipWaiting+claim）后自动刷新一次，让老访客当次就能看到新版本
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('./sw.js').catch((err: unknown) => {
      // 离线缓存失败不影响游玩（仅失去二次访问的离线能力），留痕即可
      console.warn('[家庭卧底派对] Service Worker 注册失败：', err);
    });
  });
}
