// Офлайн-помощник «Табеля» (Android).
// Свои файлы — «сначала сеть»: с интернетом всегда свежая версия, без интернета — последняя сохранённая.
// Чужие файлы (шрифты, библиотека Excel, распознавание текста) — «сначала сохранённое»: после первого
// использования работают без сети. Смены и настройки здесь не хранятся — только файлы приложения.
const CACHE = 'tabel-v22-1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    // чужие файлы: сохранённая копия, иначе сеть (и сохраняем на будущее)
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }
  // проверка обновлений должна честно увидеть «нет сети» — мимо кэша
  if (url.searchParams.has('check')) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        // страница сохраняется под одним адресом — без служебных меток ?v=…
        caches.open(CACHE).then(c => c.put(isPage ? './index.html' : url.pathname, copy));
      }
      return res;
    }).catch(() =>
      (isPage ? caches.match('./index.html') : caches.match(req, { ignoreSearch: true }))
        .then(hit => hit || Response.error())
    )
  );
});
