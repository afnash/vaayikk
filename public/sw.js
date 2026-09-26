const PREFIX = 'folio-offline-';
let activeCache;
async function cacheName() {
  if (activeCache) return activeCache;
  const keys = await caches.keys();
  activeCache = keys.filter(key => key.startsWith(PREFIX)).at(-1);
  return activeCache;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/offline-assets.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline asset manifest unavailable');
    const { version, assets } = await response.json();
    activeCache = PREFIX + version;
    const cache = await caches.open(activeCache);
    // Limit concurrent requests on mobile connections.
    for (let i = 0; i < assets.length; i += 12) await cache.addAll(assets.slice(i, i + 12));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const name = await cacheName();
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== name) await caches.delete(key);
    await self.clients.claim();
    for (const client of await self.clients.matchAll()) client.postMessage({ type: 'OFFLINE_READY' });
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const name = await cacheName();
    const cache = name ? await caches.open(name) : null;
    if (request.mode === 'navigate') {
      try { return await fetch(request); } catch { return (await cache?.match('/')) || Response.error(); }
    }
    return (await cache?.match(request)) || fetch(request);
  })());
});
