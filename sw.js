/* FitPro Service Worker v2.0 */
var CACHE_NAME = 'fitpro-v2';
var OFFLINE_URL = '/fitpro/';

var ASSETS_TO_CACHE = [
  '/fitpro/',
  '/fitpro/index.html',
  '/fitpro/manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap'
];

/* Install — cache essential assets */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE).catch(function(err) {
        console.warn('FitPro SW: Some assets failed to cache', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* Activate — clean up old caches */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* Fetch — serve from cache, fall back to network */
self.addEventListener('fetch', function(event) {
  /* Skip non-GET and chrome-extension requests */
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      return fetch(event.request.clone()).then(function(response) {
        /* Only cache valid same-origin or CDN responses */
        if (!response || response.status !== 200) return response;
        var url = event.request.url;
        if (
          url.includes('/fitpro/') ||
          url.includes('fonts.googleapis.com') ||
          url.includes('fonts.gstatic.com')
        ) {
          var cloned = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, cloned);
          });
        }
        return response;
      }).catch(function() {
        /* Offline fallback for navigation requests */
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

/* Background sync placeholder */
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-workouts') {
    /* Future: sync workout data to server */
    console.log('FitPro: background sync triggered');
  }
});

/* Push notification handler */
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  var title = data.title || 'FitPro Reminder';
  var body = data.body || "Time to train! Today's workout is waiting. 💪";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/fitpro/icons/icon-192.png',
      badge: '/fitpro/icons/icon-96.png',
      tag: 'fitpro-reminder',
      vibrate: [200, 100, 200]
    })
  );
});
