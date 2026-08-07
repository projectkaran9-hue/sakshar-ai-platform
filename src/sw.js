// ============================================================================
// SAKSHAR AI — Custom Service Worker
// Handles: Workbox precaching + Web Push Notifications + Push Click Actions
// Built with: VitePWA injectManifest strategy
// ============================================================================
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim }                             from 'workbox-core';
import { registerRoute }                            from 'workbox-routing';
import { CacheFirst, NetworkFirst }                 from 'workbox-strategies';
import { ExpirationPlugin }                         from 'workbox-expiration';
import { CacheableResponsePlugin }                  from 'workbox-cacheable-response';

// ── Take control of all open clients immediately ──────────────────────────
self.skipWaiting();
clientsClaim();

// ── Workbox precache manifest (injected by VitePWA at build time) ─────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Runtime: Google Fonts ─────────────────────────────────────────────────
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// ── Runtime: Supabase / API — network-first ───────────────────────────────
registerRoute(
  ({ url }) => (url.hostname.includes('supabase.co') && !url.hostname.includes('placeholder.supabase.co')) || url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 5 })
);

// ============================================================================
// PUSH NOTIFICATION HANDLER
// Receives push events from the backend, shows OS-level notification.
// ============================================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Sakshar AI',
      body: event.data.text() || 'You have a new notification.',
    };
  }

  const {
    title   = 'Sakshar AI',
    body    = '',
    icon    = '/pwa-192x192.png',
    badge   = '/favicon-32x32.png',
    tag     = 'sakshar-general',
    data    = { url: '/' },
    actions = [],
    image,
    vibrate = [100, 50, 100],
  } = payload;

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    data,
    actions,
    vibrate,
    requireInteraction: tag === 'streak_alert',   // streak alerts require tap
    silent: false,
    ...(image ? { image } : {}),
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// ============================================================================
// NOTIFICATION CLICK HANDLER
// Focus existing app window or open a new one.
// ============================================================================
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action       = event.action;
  const targetUrl    = (notification.data && notification.data.url) || '/';

  notification.close();

  if (action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing tab
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ============================================================================
// NOTIFICATION CLOSE — log analytics stub
// ============================================================================
self.addEventListener('notificationclose', (event) => {
  const tag = event.notification.tag;
  console.log(`[SW] Notification dismissed: ${tag}`);
});

// ============================================================================
// PUSH SUBSCRIPTION CHANGE
// Re-subscribe automatically if the push service rotates keys.
// ============================================================================
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then((newSubscription) => {
        return fetch('/api/push/subscribe', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ subscription: newSubscription }),
        }).catch((err) => console.warn('[SW] Push resubscription skipped:', err));
      })
  );
});
