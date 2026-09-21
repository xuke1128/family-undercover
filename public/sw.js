/*
 * 家庭卧底派对 · 离线缓存 Service Worker
 * 策略：cache-first（先缓存后网络）——首次访问时缓存外壳与构建产物，
 * 之后（含断网）全部从缓存提供；导航请求回退到缓存的 index.html。
 * 说明：Web 平台无法在「从未访问过」的设备上离线打开，此为平台固有限制。
 */

const CACHE_NAME = 'family-undercover-v1';

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

  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // 同源成功响应写入缓存（构建产物带 hash，可安全长期缓存）
          if (response.ok && new URL(request.url).origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return Response.error();
        });
    }),
  );
});
