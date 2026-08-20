// Service Worker for Notaris Putri PWA & Web Push Notification

self.addEventListener('install', (event) => {
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately
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

// 4. Service Worker Notification Click Handler
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
