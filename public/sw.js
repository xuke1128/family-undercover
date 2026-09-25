/*
 * 家庭卧底派对 · 离线缓存 Service Worker
 * 策略（v0.3.1 起）：
 *   - 页面外壳（导航/HTML）：网络优先——有网先拿最新版，失败回退缓存，离线可玩不受影响；
 *   - 带 hash 的构建产物与其他同源静态资源：cache-first（内容变则文件名变，安全）；
 *   - CACHE_NAME 随版本递增，activate 时清理全部旧缓存。
 * 注意：每次发版必须更新 CACHE_NAME 的版本号，否则老用户拿不到新版（v0.3.0 的教训）。
 */

const CACHE_NAME = 'family-undercover-v0.3.1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './index.html'])),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 外壳：网络优先，保证发版后老用户能拿到新版；断网时回退缓存（保离线）
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request, { ignoreSearch: true })
            .then((cached) => cached || caches.match('./index.html')),
        ),
    );
    return;
  }

  // 静态资源：cache-first（构建产物带 hash，内容变则文件名变）
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => Response.error());
    }),
  );
});
