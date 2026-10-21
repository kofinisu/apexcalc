const VERSION = 'apexcalc-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/base.css', './css/layout.css', './css/topbar.css',
  './css/sidebar.css', './css/workspace.css', './css/solver.css',
  './css/matrix.css', './css/help.css', './css/themes/dark.css',
  './css/themes/light.css', './css/themes/high-contrast.css',
  './js/app.js',
  './js/core/complex.js', './js/core/matrix.js',
  './js/core/tokenizer.js', './js/core/parser.js',
  './js/core/evaluator.js', './js/core/builtins.js',
  './js/core/solver.js', './js/core/symbolic.js',
  './js/core/regression.js', './js/core/stats.js',
  './js/core/units.js', './js/core/latex.js', './js/core/polynomial.js',
  './js/engines/graph-2d.js', './js/engines/complex-plane.js',
  './js/engines/webgl-3d.js',
  './js/ui/sidebar.js', './js/ui/topbar.js', './js/ui/solver-panel.js',
  './js/ui/matrix-panel.js', './js/ui/keyboard.js', './js/ui/history.js',
  './js/ui/theme.js', './js/ui/command-palette.js', './js/ui/slider.js',
  './js/ui/table-of-values.js', './js/ui/toast.js', './js/ui/a11y.js',
  './js/state/store.js', './js/state/persistence.js', './js/state/share-link.js',
  './js/state/helpers.js',
  './js/pwa/register.js', './js/pwa/update-banner.js',
  './assets/icons/icon-192.svg', './assets/icons/icon-512.svg', './assets/icons/maskable-512.svg',
  './assets/icons/apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(u => cache.add(u).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
    const clients = await self.clients.matchAll();
    clients.forEach(c => c.postMessage({ type: 'SW_READY' }));
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(event.request);
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(event.request, res.clone()).catch(() => {});
      }
      return res;
    } catch {
      return (await cache.match(event.request, { ignoreSearch: true })) || Response.error();
    }
  })());
});