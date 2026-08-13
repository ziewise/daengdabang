const SHELL_CACHE = "ddb-shell-v3";
const ASSET_CACHE = "ddb-static-v3";
const SHELL_URLS = [
    "/app/",
    "/offline/",
    "/images/pwa/icon-v2-192x192.png",
    "/images/pwa/icon-v2-512x512.png",
    "/images/pwa/icon-maskable-v2-512x512.png",
    "/images/pwa/apple-touch-icon-v2-180x180.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(SHELL_CACHE);
        await Promise.all(SHELL_URLS.map(async (url) => {
            try {
                const response = await fetch(url, { cache: "reload" });
                if (response.ok) await cache.put(url, response);
            } catch {
                // One missing shell file must not block the whole installation.
            }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const currentCaches = new Set([SHELL_CACHE, ASSET_CACHE]);
        const names = await caches.keys();
        await Promise.all(
            names
                .filter((name) => (name.startsWith("ddb-shell-") || name.startsWith("ddb-static-")) && !currentCaches.has(name))
                .map((name) => caches.delete(name)),
        );
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        });
        await Promise.all(windowClients.map(async (client) => {
            try {
                if (new URL(client.url).pathname === "/pwa-refresh.html") return;
                await client.navigate(client.url);
            } catch {
                // A closing/backgrounded window may no longer be navigable.
            }
        }));
    })());
});

function isPublicBuildAsset(pathname) {
    return pathname.startsWith("/_next/static/") || pathname.startsWith("/images/pwa/");
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith((async () => {
            try {
                return await fetch(request, { cache: "no-store" });
            } catch {
                return (await caches.match("/offline/")) || Response.error();
            }
        })());
        return;
    }

    if (!isPublicBuildAsset(url.pathname)) return;

    event.respondWith((async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(ASSET_CACHE);
            await cache.put(request, response.clone());
        }
        return response;
    })());
});
