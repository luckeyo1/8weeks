"use client";

import { useEffect } from "react";

/** 서비스워커 등록 (PWA, 명세 41). production 에서만 등록. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 등록 실패는 조용히 무시 (앱 동작에는 영향 없음)
      });
    };
    // 이 effect 가 실행될 때 이미 load 가 끝났으면 load 이벤트는 다시 오지 않는다 →
    // 바로 등록한다. (예전엔 이 경우 서비스워커가 영영 등록되지 않아 알림·오프라인이 동작하지 않았다)
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
