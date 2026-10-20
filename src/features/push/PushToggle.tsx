"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  deletePushSubscription,
  getVapidPublicKey,
  savePushSubscription,
} from "./actions";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "loading" | "off" | "on";

export function PushToggle() {
  const toast = useToast();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function init() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (active) setState("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (active) setState(sub ? "on" : "off");
      } catch {
        if (active) setState("off");
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.show("알림 권한이 꺼져 있어요. 기기 설정에서 허용해주세요.", "error");
        return;
      }
      const keyRes = await getVapidPublicKey();
      if (!keyRes.ok) {
        toast.show(keyRes.message, "error");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.data.key) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (res.ok) {
        setState("on");
        toast.show("기도 리마인더 알림을 켰어요.");
      } else {
        toast.show(res.message, "error");
      }
    } catch {
      toast.show("알림을 켜지 못했어요. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.show("알림을 껐어요.");
    } catch {
      toast.show("알림을 끄지 못했어요.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported") {
    return (
      <div className="card flex flex-col gap-1 p-4">
        <p className="text-sm font-medium text-ink">기도 리마인더 알림</p>
        <p className="text-[13px] text-ink-soft">
          이 브라우저에서는 알림을 지원하지 않아요. 홈 화면에 앱을 추가하면 알림을
          받을 수 있어요.
        </p>
      </div>
    );
  }

  const on = state === "on";

  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">기도 리마인더 알림</p>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          오늘 기도할 제목이 남아 있을 때 하루 한 번 조용히 알려드려요.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="기도 리마인더 알림"
        disabled={busy || state === "loading"}
        onClick={on ? disable : enable}
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
          on ? "bg-primary" : "bg-line",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
