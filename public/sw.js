// Service Worker for Notaris Putri PWA & Web Push Notification

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// 1. Workbox Precache Manifest Injection
precacheAndRoute(self.__WB_MANIFEST || []);

// 2. Runtime Caching Rules
// Google Fonts Cache
registerRoute(
  /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// API routes: NetworkOnly (always fetch from network, never cache)
registerRoute(
  /^\/api\/.*/,
  new NetworkOnly()
);

// SPA Navigation Fallback to /index.html except /api/
try {
  const handler = createHandlerBoundToURL('/index.html');
  const navigationRoute = new NavigationRoute(handler, {
    denylist: [/^\/api\//],
  });
  registerRoute(navigationRoute);
} catch (e) {
  console.warn('[SW] NavigationRoute registration warning:', e);
}

// 3. Service Worker Lifecycle Handlers
// Handle SKIP_WAITING message sent when user clicks "Muat Ulang" (updateServiceWorker(true))
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately upon activation
  event.waitUntil(self.clients.claim());
});

// 4. Service Worker Push Handler
self.addEventListener('push', (event) => {
  let data = {
    title: '💬 Komentar baru',
    body: 'Ada pembaruan pada proyek Anda.',
    url: '/',
    projectId: '',
    commentId: ''
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.warn('[SW] Non-JSON push payload received:', event.data.text());
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    data: {
      url: data.url || (data.projectId ? `/proyek/${data.projectId}${data.commentId ? `?comment=${data.commentId}` : ''}` : '/'),
      projectId: data.projectId || '',
      commentId: data.commentId || ''
    },
    vibrate: [100, 50, 100],
    tag: data.commentId ? `comment-${data.commentId}` : `proj-${data.projectId || Date.now()}`,
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '💬 Notifikasi Komentar', notificationOptions)
  );
});

// 5. Service Worker Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/';
  const targetUrl = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(async (clientList) => {
      // Check if there is already a window/tab open with the app origin
      for (const client of clientList) {
        if ('focus' in client && client.url && client.url.includes(self.location.origin)) {
          try {
            if ('navigate' in client) {
              await client.navigate(targetUrl);
            }
            return await client.focus();
          } catch (navErr) {
            console.warn('[SW] Client navigation error:', navErr);
          }
        }
      }

      // If no window is open or focusing failed, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
