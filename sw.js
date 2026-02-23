const CACHE_NAME = 'ramadan-2026-v3';
const BASE_PATH = '/ramadan-calendar-2026';

// Cache করার ফাইলগুলো
const STATIC_CACHE = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Amiri:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install — সব ফাইল cache করো
self.addEventListener('install', event => {
  self.skipWaiting(); // নতুন SW তাৎক্ষণিক activate হবে
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_CACHE).catch(err => {
        console.log('Cache addAll error (non-critical):', err);
      });
    })
  );
});

// Activate — পুরনো cache মুছে দাও
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // সব open tab এ নতুন SW নিয়ন্ত্রণ নেবে
  );
});

// Fetch — Cache first, তারপর network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // শুধু GET request handle করো
  if (event.request.method !== 'GET') return;

  // Google Analytics / gtag bypass করো (cache করবো না)
  if (url.hostname.includes('google-analytics') || 
      url.hostname.includes('googletagmanager')) {
    return;
  }

  // Navigation request (পেজ লোড) — সবসময় index.html দাও
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE_PATH + '/index.html')
        .then(cached => {
          if (cached) return cached;
          return fetch(BASE_PATH + '/index.html')
            .catch(() => caches.match(BASE_PATH + '/'));
        })
    );
    return;
  }

  // অন্য সব request — Cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Valid response হলে cache এ রাখো
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match(BASE_PATH + '/index.html');
        }
      });
    })
  );
});
