import { defineConfig } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Emits sw.js with a precache list of everything in the build, so the game
// installs as a PWA and runs offline.
function serviceWorker() {
  const walk = (dir, base = '') => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f), `${base}${f}/`) : [`${base}${f}`]));
  return {
    name: 'snackpot-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = [...new Set(['./', ...Object.keys(bundle), ...walk('public')])].filter((f) => f !== 'sw.js' && f !== 'index.html');
      const version = Date.now().toString(36);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const CACHE = 'snackpot-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req.mode === 'navigate' ? './' : req, { ignoreSearch: req.mode === 'navigate', ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
`,
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  server: { host: true },
});
