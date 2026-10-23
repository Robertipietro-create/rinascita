/* =========================================================
   sw.js — service worker: il gioco funziona anche offline.
   Al primo avvio scarica tutto; poi risponde dalla cache e
   intanto aggiorna in sottofondo (stale-while-revalidate).
   Cambiando VERSION si forza l'aggiornamento della cache.
   ========================================================= */
const VERSION = 'rinascita-v1';
const FILES = [
    './',
    './css/style.css',
    './icons/icon-180.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './index.html',
    './js/audio/audio.js',
    './js/core/engine.js',
    './js/core/util.js',
    './js/game/objects.js',
    './js/game/people.js',
    './js/game/room.js',
    './js/game/story.js',
    './js/game/surface.js',
    './js/game/tools.js',
    './js/levels/salotto.js',
    './js/main.js',
    './js/phases/build.js',
    './js/phases/cleaning.js',
    './js/phases/clearing.js',
    './js/phases/decor.js',
    './js/phases/discovery.js',
    './js/phases/repair.js',
    './js/phases/reveal.js',
    './js/render/iso.js',
    './js/render/particles.js',
    './js/render/scene.js',
    './js/render/textures.js',
    './js/save/save.js',
    './js/ui/icons.js',
    './js/ui/ui.js',
    './manifest.webmanifest',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
