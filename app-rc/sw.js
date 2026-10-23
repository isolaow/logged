/* Logged service worker: app shell network-first (so git push updates land), static + posters cache-first. Never caches the API. */
var V = 'logged-rc-1792738641', SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', function (e) { self.skipWaiting(); e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL).catch(function () {}); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V && k.indexOf('logged-rc-') === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url); if (e.request.method !== 'GET' || /script\.google(usercontent)?\.com|youtube|ntfy/.test(u.host)) return;
  if (e.request.mode === 'navigate' || u.pathname.endsWith('/index.html') || u.pathname.endsWith('/app/')) {
    e.respondWith(fetch(e.request).then(function (r) { var c = r.clone(); caches.open(V).then(function (x) { x.put('index.html', c); }); return r; }).catch(function () { return caches.match('index.html'); })); return; }
  e.respondWith(caches.match(e.request).then(function (hit) { var net = fetch(e.request).then(function (r) { if (r && (r.ok || r.type === 'opaque')) { var c = r.clone(); caches.open(V + '-rt').then(function (x) { x.put(e.request, c); }); } return r; }).catch(function () { return hit; }); return hit || net; }));
});
