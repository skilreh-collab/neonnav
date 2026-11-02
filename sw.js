// NeonNav Service Worker – macht die App installierbar und offline startfähig
const VERSION = 'neonnav-v10';
const TILE_CACHE = 'neonnav-tiles-v1';
const MAX_TILES = 2500;

const SHELL = ['./', './index.html', './cars.js', './i18n.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const CDN = [
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://cdn.tailwindcss.com'
];
// Live-Daten nie aus dem Cache: Routing, Suche, Blitzer, Spritpreise, KI
const LIVE_HOSTS = ['routing.openstreetmap.de', 'router.project-osrm.org', 'nominatim.openstreetmap.org',
                    'overpass-api.de', 'overpass.kumi.systems', 'maps.mail.ru', 'overpass.private.coffee',
                    'creativecommons.tankerkoenig.de', 'generativelanguage.googleapis.com', 'api.open-meteo.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(SHELL);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== TILE_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trimTiles() {
  const c = await caches.open(TILE_CACHE);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (LIVE_HOSTS.includes(url.hostname)) return; // direkt ans Netz

  // App-Seite: zuerst Netz (Updates), sonst Cache
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }

  // Kartenkacheln, Stil, Schriften: aus dem Cache, im Hintergrund aktualisieren
  if (/cartocdn\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(caches.open(TILE_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { c.put(req, r.clone()); if (Math.random() < .05) trimTiles(); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // App-Dateien & Bibliotheken: Cache zuerst
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
