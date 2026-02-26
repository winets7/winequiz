/// Service Worker для «Винная Викторина» PWA

const CACHE_NAME = 'winequiz-v1';

// Статические ресурсы для предварительного кеширования
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

// Установка — кешируем основные ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Активируем новый SW сразу, не дожидаясь закрытия вкладок
  self.skipWaiting();
});

// Активация — удаляем старые кеши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Берём контроль над всеми вкладками
  self.clients.claim();
});

// Стратегия: Network First для навигации, Cache First для статики
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Cache API поддерживает только http/https — не обрабатываем chrome-extension и др.
  if (!request.url.startsWith('http')) return;

  // Пропускаем не-GET запросы и запросы к API
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/')) return;
  if (request.url.includes('socket.io')) return;

  // Навигационные запросы — Network First с фолбэком на офлайн-страницу
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Кешируем успешные ответы
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Пробуем из кеша, потом офлайн-страницу
          return caches.match(request).then((cached) => {
            return cached || caches.match('/offline');
          });
        })
    );
    return;
  }

  // Статические ресурсы — Cache First
  if (
    request.url.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Остальное — Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});
