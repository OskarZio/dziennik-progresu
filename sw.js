// Offline support: app files are served network-first so updates show up right away,
// with the cached copy as the fallback when the gym has no signal.
const CACHE = "dp-v6";
const SHELL = ["./", "index.html", "app.js", "config.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Supabase API and storage calls always go to the network.
  if (url.hostname.endsWith("supabase.co")) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && (url.origin === location.origin || url.hostname.includes("jsdelivr") || url.hostname.includes("gstatic") || url.hostname.includes("googleapis"))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});
