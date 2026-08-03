const CACHE_NAME = "hrr-static-v4";
const STATIC_FILES = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.includes("supabase")) return;
  if (request.mode === "navigate") { event.respondWith(fetch(request).catch(() => caches.match("/usuario"))); return; }
  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(caches.match(request).then(async (cached) => {
      const network = fetch(request).then((response) => { if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())); return response; }).catch(() => cached);
      return cached || network;
    }));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || "Tienes una nueva notificación." }; }
  event.waitUntil(self.registration.showNotification(data.title || "Home Run Rewards", {
    body: data.body || "Tienes una nueva notificación.",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/badge-96.png",
    image: data.image,
    tag: data.tag || "hrr-notification",
    renotify: true,
    data: { url: data.url || "/usuario", notificationId: data.notificationId || null },
    vibrate: [100, 60, 100],
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/usuario", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) { if (client.url.startsWith(self.location.origin) && "focus" in client) { client.navigate(target); return client.focus(); } }
    return self.clients.openWindow(target);
  }));
});
