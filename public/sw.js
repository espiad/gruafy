/* Service worker de gruafy: habilita instalación PWA y notificaciones push.
   El envío real de push (servidor → dispositivo) requiere VAPID + backend; acá
   queda el receptor listo para cuando se conecte esa parte. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'gruafy', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'gruafy';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/isologo.png',
      badge: '/icon.svg',
      data: { url: data.url || '/' },
      vibrate: [180, 90, 180],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
