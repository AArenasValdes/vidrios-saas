const CACHE_NAME = "vidrios-saas-v4";
const APP_SHELL = [
  "/",
  "/login",
  "/planes",
  "/offline",
  "/manifest.webmanifest",
  "/icons/apple-touch-icon.png",
  "/icons/pwa-192.png",
  "/icons/pwa-512.png",
  "/icons/pwa-maskable-512.png",
  "/icons/pwa-icon.svg",
  "/icons/pwa-maskable.svg",
];
const PUBLIC_NAVIGATION_ROUTES = new Set(["/", "/login", "/planes", "/offline"]);

function isPublicNavigation(pathname) {
  return PUBLIC_NAVIGATION_ROUTES.has(pathname);
}

function isStaticAsset(request, requestUrl) {
  if (request.destination === "style" || request.destination === "script") {
    return true;
  }

  if (request.destination === "image" || request.destination === "font") {
    return true;
  }

  return (
    requestUrl.pathname.startsWith("/_next/static/") ||
    requestUrl.pathname.startsWith("/icons/") ||
    requestUrl.pathname === "/manifest.webmanifest"
  );
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
}

async function cleanupOldCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
  );
}

async function networkFirstNavigation(request, preloadResponsePromise) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const preloadResponse = preloadResponsePromise
      ? await preloadResponsePromise
      : null;

    if (preloadResponse) {
      return preloadResponse;
    }

    const response = await fetch(request, { cache: "no-store" });

    if (response && response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(new URL(request.url).pathname, { ignoreSearch: true })) ||
      (await cache.match("/offline"));

    return cached;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse || networkFetch;
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await cleanupOldCaches();
      if ("navigationPreload" in self.registration) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {}
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    if (isPublicNavigation(requestUrl.pathname)) {
      event.respondWith(networkFirstNavigation(event.request, event.preloadResponse));
    }
    return;
  }

  if (isStaticAsset(event.request, requestUrl)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = null;

  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Ventora",
      body: event.data.text(),
      url: "/cotizaciones",
      tag: "ventora-push",
    };
  }

  const title = payload?.title || "Ventora";
  const options = {
    body: payload?.body || "Tienes una actualizacion nueva.",
    icon: "/icons/pwa-192.png",
    badge: "/icons/pwa-192.png",
    data: {
      url: payload?.url || "/cotizaciones",
    },
    tag: payload?.tag || "ventora-push",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/cotizaciones",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          if (client.url === targetUrl) {
            return client.focus();
          }
        }
      }

      const existing = clients.find((client) => "focus" in client);

      if (existing && "navigate" in existing) {
        return existing.navigate(targetUrl).then(() => existing.focus());
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
