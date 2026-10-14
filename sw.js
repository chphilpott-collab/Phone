// Keeps the app shell on the phone so Moneys opens instantly, even offline.
// Your money data never passes through here: it comes straight from your sheet.
const CACHE = 'moneys-v13';
const SHELL = ['./', './index.html', './icon-180.png', './manifest.json'];
const PAIR = 'moneys-pair'; // the app's connection details, so a push can ask the sheet what's new

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== PAIR).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});

// Push notifications. Pushes carry no data, so wake up, ask the sheet what's new, and show it.
self.addEventListener('push', (e) => { e.waitUntil(showNew()); });

async function showNew() {
  let items = [];
  const c = await caches.open(PAIR);
  try {
    const pr = await c.match('pair'); const p = pr ? await pr.json() : null;
    const sr = await c.match('seen'); const seen = sr ? await sr.text() : '';
    if (p && p.u && p.k) {
      const res = await fetch(p.u, { method: 'POST', body: JSON.stringify({ key: p.k, action: 'pushInbox', after: seen }), redirect: 'follow' });
      const j = await res.json();
      if (j.ok) items = j.items || [];
    }
    if (items.length) await c.put('seen', new Response(items[items.length - 1].id));
  } catch (err) { /* fall through to a plain notification */ }
  if (!items.length) {
    // Nothing new: several alerts from one run were all shown by the first push. iPhone still
    // wants a notification for every push, so re-show the latest one in place, without a new alert.
    const lr = await c.match('last'); const last = lr ? await lr.json() : null;
    if (last) return self.registration.showNotification(last.title, { body: last.body, tag: last.id });
    return self.registration.showNotification('Moneys', { body: 'Something new. Tap to open.', tag: 'moneys' });
  }
  await c.put('last', new Response(JSON.stringify(items[items.length - 1])));
  return Promise.all(items.map((it) => self.registration.showNotification(it.title, { body: it.body, tag: it.id })));
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const w of list) if ('focus' in w) return w.focus();
    return self.clients.openWindow('./');
  }));
});
