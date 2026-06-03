// FILE: frontend/public/sw.js
// OmniMedia Service Worker — Patch #9
//
// Estratégia de cache por tipo de recurso:
//   App Shell (HTML/CSS/JS)  → Cache First, atualiza em background (Stale-While-Revalidate)
//   Fontes Google            → Cache First, expira em 1 ano
//   Scripts de plugins       → Cache First, expira em 7 dias
//   API /api/*               → Network First com fallback de cache (dados frescos preferidos)
//   Imagens de conteúdo      → Cache First com limite de 100 entradas
//
// Versão: incrementar CACHE_VERSION ao fazer deploy para invalidar caches anteriores.

const CACHE_VERSION = "v1";
const SHELL_CACHE   = `omnimedia-shell-${CACHE_VERSION}`;
const FONTS_CACHE   = `omnimedia-fonts-${CACHE_VERSION}`;
const PLUGINS_CACHE = `omnimedia-plugins-${CACHE_VERSION}`;
const IMAGES_CACHE  = `omnimedia-images-${CACHE_VERSION}`;
const API_CACHE     = `omnimedia-api-${CACHE_VERSION}`;

const MAX_IMAGE_ENTRIES = 100;
const MAX_API_ENTRIES   = 50;

// Recursos do app shell que devem ser cacheados imediatamente no install
const PRECACHE_URLS = [
  "/",
  "/index.html",
];

// ── Install: precache do app shell ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpa caches de versões antigas ─────────────────────────────────
self.addEventListener("activate", (event) => {
  const currentCaches = new Set([
    SHELL_CACHE, FONTS_CACHE, PLUGINS_CACHE, IMAGES_CACHE, API_CACHE,
  ]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !currentCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: estratégia por tipo de recurso ─────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e chrome-extension://
  if (request.method !== "GET") return;
  if (!["http:", "https:"].includes(url.protocol)) return;

  // ── Fontes Google ────────────────────────────────────────────────────────
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(request, FONTS_CACHE));
    return;
  }

  // ── Scripts de plugins (/plugins/*.js) ───────────────────────────────────
  if (url.pathname.startsWith("/plugins/") && url.pathname.endsWith(".js")) {
    event.respondWith(cacheFirst(request, PLUGINS_CACHE, 7 * 24 * 60 * 60));
    return;
  }

  // ── API (/api/*) ─────────────────────────────────────────────────────────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE, MAX_API_ENTRIES));
    return;
  }

  // ── Imagens de conteúdo (picsum, CDNs externos) ──────────────────────────
  const isExternalImage =
    request.destination === "image" &&
    url.hostname !== location.hostname;

  if (isExternalImage) {
    event.respondWith(cacheFirst(request, IMAGES_CACHE, undefined, MAX_IMAGE_ENTRIES));
    return;
  }

  // ── App Shell (HTML, JS, CSS do build) ───────────────────────────────────
  if (url.hostname === location.hostname) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }
});

// ── Estratégias ───────────────────────────────────────────────────────────────

/**
 * Cache First: retorna do cache imediatamente; fallback para network.
 * @param {Request} request
 * @param {string} cacheName
 * @param {number} [maxAgeSeconds] - se fornecido, revalida em background se mais antigo
 * @param {number} [maxEntries]    - limita o número de entradas no cache
 */
async function cacheFirst(request, cacheName, maxAgeSeconds, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Revalida em background se expirado (sem bloquear a resposta)
    if (maxAgeSeconds) {
      const dateHeader = cached.headers.get("date");
      if (dateHeader) {
        const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
        if (age > maxAgeSeconds) {
          fetchAndCache(request, cache, maxEntries).catch(() => {});
        }
      }
    }
    return cached;
  }

  return fetchAndCache(request, cache, maxEntries);
}

/**
 * Network First: tenta a rede primeiro; cai para cache se offline.
 */
async function networkFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      await trimCache(cache, maxEntries);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response(JSON.stringify({ success: false, message: "Offline" }), {
      headers: { "Content-Type": "application/json" },
      status: 503,
    });
  }
}

/**
 * Stale While Revalidate: retorna do cache e atualiza em background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request.clone()).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached ?? (await fetchPromise) ?? new Response("Offline", { status: 503 });
}

async function fetchAndCache(request, cache, maxEntries) {
  const response = await fetch(request.clone());
  if (response.ok) {
    await trimCache(cache, maxEntries);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Remove as entradas mais antigas quando o cache excede maxEntries.
 */
async function trimCache(cache, maxEntries) {
  if (!maxEntries) return;
  const keys = await cache.keys();
  if (keys.length >= maxEntries) {
    await cache.delete(keys[0]);
  }
}
