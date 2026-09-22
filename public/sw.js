/* 기도 동행 — 최소 서비스워커 (명세 41)
 * - 정적 자산: stale-while-revalidate
 * - 페이지 이동: network-first (인증/동적 데이터 최신 유지), 실패 시 오프라인 안내
 * 민감한 기도 내용은 캐시하지 않도록 navigation 응답은 캐시에 저장하지 않는다.
 */
const CACHE = "prayer-together-v1";
const STATIC_ASSETS = ["/offline.html", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: network-first, 실패 시 오프라인 페이지 (기도 내용은 캐시 안 함)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  // 정적 자산(_next/static, icons 등): 캐시 우선 + 백그라운드 갱신
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
