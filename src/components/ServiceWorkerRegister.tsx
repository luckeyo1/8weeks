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
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 등록 실패는 조용히 무시 (앱 동작에는 영향 없음)
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
