"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  deletePushSubscription,
  getVapidPublicKey,
  savePushSubscription,
  setReminderTime,
} from "./actions";
import {
  DEFAULT_REMINDER_TIME,
  REMINDER_TIMES,
  reminderLabel,
} from "@/lib/reminder";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  // 서버 설정에 섞인 공백·줄바꿈이 있어도 안전하게
  const clean = base64.replace(/\s+/g, "");
  const pad = "=".repeat((4 - (clean.length % 4)) % 4);
  const b64 = (clean + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** 서비스워커 준비를 기다리되 끝없이 기다리지 않는다. 등록이 안 돼 있으면 한 번 등록을 시도한다. */
async function readyRegistration(
  timeoutMs = 6000,
): Promise<ServiceWorkerRegistration | null> {
  const wait = (ms: number) =>
    Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((r) => setTimeout(() => r(null), ms)),
    ]);
  const first = await wait(timeoutMs);
  if (first) return first;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
  return wait(timeoutMs);
}

/** 응답이 없으면 끝없이 기다리지 않고 TimeoutError 로 끝낸다 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new DOMException("timeout", "TimeoutError")), ms),
    ),
  ]);
}

/** 구독 실패 이유 → 사용자에게 보여줄 문구 (오류 이름을 붙여 원인을 알 수 있게) */
function subscribeErrorMessage(e: unknown): string {
  const name = e instanceof Error || e instanceof DOMException ? e.name : "";
  switch (name) {
    case "NotAllowedError":
      return "알림 권한이 막혀 있어요. 주소창 왼쪽 아이콘(사이트 설정)에서 알림을 허용해 주세요.";
    case "AbortError":
      return "브라우저의 푸시 서비스에 연결하지 못했어요. 브라우저 설정(예: Brave는 '구글 서비스로 푸시 메시징 사용')이나 네트워크를 확인해 주세요. (AbortError)";
    case "TimeoutError":
      return "브라우저의 푸시 서비스가 응답하지 않아요. 네트워크(회사·학교 와이파이 등)나 브라우저 설정을 확인한 뒤 다시 시도해 주세요. (TimeoutError)";
    case "InvalidAccessError":
    case "InvalidCharacterError":
      return `알림 키 형식이 올바르지 않아요. 관리자 설정을 확인해 주세요. (${name})`;
    default:
      return `알림을 켜지 못했어요. 잠시 후 다시 시도해주세요.${name ? ` (${name})` : ""}`;
  }
}

type State = "unsupported" | "loading" | "off" | "on";

/**
 * 매일 알림 켜기/끄기 + 알림 시간.
 * reminderTime: 서버에 저장된 시간(없으면 기본 08:00). null 이면 마이그레이션 전이라 시간 선택을 숨긴다.
 */
export function PushToggle({
  reminderTime = null,
}: {
  reminderTime?: string | null;
}) {
  const toast = useToast();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState(reminderTime ?? DEFAULT_REMINDER_TIME);
  const [savingTime, setSavingTime] = useState(false);

  async function changeTime(next: string) {
    const prev = time;
    setTime(next);
    setSavingTime(true);
    const res = await setReminderTime(next);
    setSavingTime(false);
    if (res.ok) {
      toast.show(`매일 ${reminderLabel(next)}에 알려드릴게요.`);
    } else {
      setTime(prev);
      toast.show(res.message, "error");
    }
  }

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
        const reg = await readyRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
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
        toast.show(
          "알림 권한이 꺼져 있어요. 기기 설정에서 허용해주세요.",
          "error",
        );
        return;
      }
      const keyRes = await getVapidPublicKey();
      if (!keyRes.ok) {
        toast.show(keyRes.message, "error");
        return;
      }
      const reg = await readyRegistration();
      if (!reg) {
        toast.show(
          "알림 준비(서비스워커)를 마치지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
          "error",
        );
        return;
      }
      const options = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          keyRes.data.key,
        ) as BufferSource,
      };
      let sub: PushSubscription;
      try {
        sub = await withTimeout(reg.pushManager.subscribe(options), 15000);
      } catch (e) {
        // 예전 키로 만든 구독이 남아 있으면 지우고 한 번 더
        if (e instanceof DOMException && e.name === "InvalidStateError") {
          const old = await reg.pushManager.getSubscription();
          await old?.unsubscribe();
          try {
            sub = await withTimeout(reg.pushManager.subscribe(options), 15000);
          } catch (e2) {
            toast.show(subscribeErrorMessage(e2), "error");
            return;
          }
        } else {
          toast.show(subscribeErrorMessage(e), "error");
          return;
        }
      }
      const json = sub.toJSON();

      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (res.ok) {
        setState("on");
        toast.show(
          reminderTime !== null
            ? `알림을 켰어요. 매일 ${reminderLabel(time)}에 알려드릴게요.`
            : "기도 리마인더 알림을 켰어요.",
        );
      } else {
        toast.show(res.message, "error");
      }
    } catch (e) {
      toast.show(subscribeErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await readyRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
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
        <p className="text-sm font-medium text-ink">매일 알림</p>
        <p className="text-[13px] text-ink-soft">
          이 브라우저에서는 알림을 지원하지 않아요. 홈 화면에 앱을 추가하면
          알림을 받을 수 있어요.
        </p>
      </div>
    );
  }

  const on = state === "on";
  const showTime = on && reminderTime !== null;
  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">매일 알림</p>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            {reminderTime !== null
              ? "정한 시간에 하루 한 번, 오늘의 말씀과 함께 기도할 제목을 알려드려요."
              : "오늘 기도할 제목이 남아 있을 때 하루 한 번 조용히 알려드려요."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="매일 알림"
          disabled={busy || state === "loading"}
          onClick={on ? disable : enable}
          className={[
            "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
            on ? "bg-primary" : "bg-line",
          ].join(" ")}
        >
          <span
            className={[
              // left-0 이 없으면 버튼 가운데서 출발해 켜졌을 때 트랙 밖으로 넘쳤다
              "absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
              on ? "translate-x-6" : "translate-x-1",
            ].join(" ")}
          />
        </button>
      </div>

      {showTime && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <label htmlFor="reminder-time" className="text-sm text-ink">
            알림 시간
          </label>
          <select
            id="reminder-time"
            value={time}
            disabled={savingTime}
            onChange={(e) => changeTime(e.target.value)}
            className="min-h-[44px] rounded-card border border-line bg-surface px-3 text-[15px] text-ink disabled:opacity-60"
          >
            {REMINDER_TIMES.map((t) => (
              <option key={t} value={t}>
                {reminderLabel(t)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
