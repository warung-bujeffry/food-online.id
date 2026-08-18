const CACHE_NAME = '3W-v1';

// Daftar aset lokal yang wajib di-cache saat install
const assets = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Event Install: Simpan aset utama ke cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();
});

// 2. Event Activate: Bersihkan cache versi lama secara otomatis
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Event Fetch: Strategy Network-First dengan Fallback Cache
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Lewati Service Worker total untuk API Google (Google Script, Drive, UserContent, dll)
  if (url.includes('script.google.com') || url.includes('googleusercontent.com') || url.includes('google.com')) {
    return e.respondWith(fetch(e.request));
  }

  // Hanya tangani request dengan method GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Simpan ke cache jika response sukses (status 200 atau 0 untuk opaque response dari CDN)
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Jika jaringan mati/offline, gunakan cache lokal
        return caches.match(e.request);
      })
  );
});
