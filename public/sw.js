// ============================================================================
// Life Blossom Hospital — Service Worker
// ============================================================================
// Strategy: Network-first for pages/API, Cache-first for static assets,
// Stale-while-revalidate for navigation.
// ============================================================================

const CACHE = {
  STATIC: "lbh-static-v1",
  IMAGES: "lbh-images-v1",
  FONTS: "lbh-fonts-v1",
  API: "lbh-api-v1",
  PAGES: "lbh-pages-v1",
};

const STATIC_URLS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/apple-touch-icon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// ─── Install ────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE.STATIC).then((cache) => cache.addAll(STATIC_URLS)).then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !Object.values(CACHE).includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Caching helpers ────────────────────────────────────────────

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") && url.pathname !== "/api/notifications/vapid-public-key";
}

function isStaticAsset(url) {
  return /\.(js|css|json)$/i.test(url.pathname);
}

function isImage(url) {
  return /\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/i.test(url.pathname);
}

function isFont(url) {
  return url.hostname.includes("fonts.") || /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname);
}

function isNavigation(req) {
  return req.mode === "navigate";
}

// ─── Network-first strategy ─────────────────────────────────────
async function networkFirst(request, cacheName, expirySec = 300) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const copy = response.clone();
      const headers = new Headers(copy.headers);
      headers.set("x-lbh-cached-at", String(Date.now()));
      cache.put(request, new Response(await copy.blob(), { status: copy.status, statusText: copy.statusText, headers }));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get("x-lbh-cached-at") || "0", 10);
      if (Date.now() - cachedAt < expirySec * 1000) return cached;
    }
    return new Response(JSON.stringify({ success: false, error: "You are offline. Please check your connection." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── Cache-first strategy ───────────────────────────────────────
async function cacheFirst(request, cacheName, maxAgeSec = 86400 * 30) {
  const cached = await caches.match(request);
  if (cached) {
    const cachedAt = parseInt(cached.headers.get("x-lbh-cached-at") || "0", 10);
    if (Date.now() - cachedAt < maxAgeSec * 1000) return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const copy = response.clone();
      const headers = new Headers(copy.headers);
      headers.set("x-lbh-cached-at", String(Date.now()));
      cache.put(request, new Response(await copy.blob(), { status: copy.status, statusText: copy.statusText, headers }));
    }
    return response;
  } catch {
    return cached || new Response("", { status: 408 });
  }
}

// ─── Stale-while-revalidate strategy ────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const copy = response.clone();
      const headers = new Headers(copy.headers);
      headers.set("x-lbh-cached-at", String(Date.now()));
      await cache.put(request, new Response(await copy.blob(), { status: copy.status, statusText: copy.statusText, headers }));
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// ─── Fetch ──────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    if (isFont(url)) {
      event.respondWith(cacheFirst(event.request, CACHE.FONTS, 86400 * 365));
    }
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request, CACHE.API, 120));
  } else if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE.STATIC));
  } else if (isImage(url)) {
    event.respondWith(cacheFirst(event.request, CACHE.IMAGES));
  } else if (isNavigation(event.request)) {
    event.respondWith(networkFirst(event.request, CACHE.PAGES, 60));
  }
});

// ─── Push Notifications ─────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: event.data?.text() || "Life Blossom Hospital" };
  }

  const title = data.title || "Life Blossom Hospital";
  const options = {
    body: data.body || "You have a new update.",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
      id: data.id || null,
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || "default",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ─────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";
  const id = event.notification.data?.id;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "NOTIFICATION_CLICKED", notificationId: id });
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(urlToOpen);
    })
  );
});
