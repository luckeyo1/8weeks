/* 기도 동행 — 최소 서비스워커 (명세 41)
 * - 정적 자산: stale-while-revalidate
 * - 페이지 이동: network-first (인증/동적 데이터 최신 유지), 실패 시 오프라인 안내
 * 민감한 기도 내용은 캐시하지 않도록 navigation 응답은 캐시에 저장하지 않는다.
 */
const CACHE = "prayer-together-v2";
// 성경 본문(개역한글, 바뀌지 않음): 한 번 읽은 장은 오프라인에서도 열리게 따로 보관
const BIBLE_CACHE = "bible-krv-v1";
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
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== BIBLE_CACHE)
            .map((k) => caches.delete(k)),
        ),
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

  // 성경 본문: 캐시 우선, 없으면 받아서 보관
  if (url.pathname.startsWith("/bibledata/")) {
    event.respondWith(
      caches.open(BIBLE_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            }),
        ),
      ),
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

/* 푸시 알림 (P1 리마인더)
 * 민감정보 보호를 위해 "데이터 없는 푸시"를 쓴다 → 고정 문구만 표시.
 * (기도 내용·이름은 알림에 담지 않는다)
 */
// 매일 알림: 푸시 서비스(구글·애플)를 거치는 데이터에는 아무 내용도 싣지 않는다.
// 알림을 받으면 우리 서버(/api/push/message)에서 로그인 세션으로 문구를 직접 받아온다.
// 네트워크가 느리거나 실패해도 알림은 반드시 띄운다(4초 제한, 기본 문구).
async function loadMessage() {
  const fallback = {
    title: "기도 동행",
    body: "오늘의 말씀과 함께 기도할 제목을 확인해 보세요.",
    url: "/home",
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("/api/push/message", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      title: typeof data.title === "string" ? data.title : fallback.title,
      body: typeof data.body === "string" ? data.body : fallback.body,
      url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/home",
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    loadMessage().then((msg) =>
      self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "daily-reminder",
        data: { url: msg.url },
      }),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});
