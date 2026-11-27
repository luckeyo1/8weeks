"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics";
import type { MiniWindowData } from "@/types/domain";
import { copyStyles, isPipSupported } from "./pip";
import { MiniWindowView, type MiniState } from "./MiniWindowView";

type MiniWindowContext = {
  supported: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const Ctx = createContext<MiniWindowContext | null>(null);

/** 작은 창 열기·닫기 (provider 밖이면 null) */
export function useMiniWindow(): MiniWindowContext | null {
  return useContext(Ctx);
}

const REFRESH_MS = 5 * 60 * 1000;
const noopSubscribe = () => () => {};

/**
 * PC "작은 창"(항상 위 미니 창). 앱 영역 전체를 감싸서 화면을 옮겨 다녀도 창이 유지된다.
 * 내용은 같은 React 트리에서 작은 창 문서로 portal 해 그린다.
 * 새로고침: 열 때, 5분마다, 작은 창으로 포커스가 옮겨 갈 때(본 창 blur·작은 창 focus), 본 창이 다시 보일 때.
 */
export function MiniWindowProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    isPipSupported,
    () => false,
  );
  const [pip, setPip] = useState<Window | null>(null);
  const [state, setState] = useState<MiniState>({ status: "loading" });
  const pipRef = useRef<Window | null>(null);
  const router = useRouter();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mini", { cache: "no-store" });
      if (res.status === 401) {
        setState({ status: "unauthenticated" });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as MiniWindowData;
      setState({ status: "ready", data });
    } catch {
      // 이미 보여 주던 내용이 있으면 그대로 두고, 처음이면 "다시 시도"
      setState((prev) =>
        prev.status === "ready" ? prev : { status: "error" },
      );
    }
  }, []);

  const open = useCallback(async () => {
    const api = window.documentPictureInPicture;
    if (!api) return;
    if (pipRef.current) {
      pipRef.current.focus();
      return;
    }
    try {
      const w = await api.requestWindow({ width: 340, height: 460 });
      copyStyles(w.document);
      w.document.documentElement.lang = "ko";
      w.document.title = "기도 동행";
      w.addEventListener(
        "pagehide",
        () => {
          pipRef.current = null;
          setPip(null);
        },
        { once: true },
      );
      pipRef.current = w;
      setState({ status: "loading" });
      setPip(w);
      void load();
      track("mini_window_opened");
    } catch {
      toast.show("작은 창을 열지 못했어요. 다시 눌러 주세요.", "error");
    }
  }, [load, toast]);

  const close = useCallback(() => {
    pipRef.current?.close();
  }, []);

  useEffect(() => {
    if (!pip) return;
    const refresh = () => void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    pip.addEventListener("focus", refresh);
    window.addEventListener("blur", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      pip.removeEventListener("focus", refresh);
      window.removeEventListener("blur", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pip, load]);

  // 앱 영역을 벗어나면(로그아웃 등) 작은 창도 닫는다
  useEffect(() => () => pipRef.current?.close(), []);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      try {
        window.focus();
      } catch {
        /* 브라우저가 막으면 작은 창의 "탭으로 돌아가기"를 쓰면 된다 */
      }
    },
    [router],
  );

  return (
    <Ctx.Provider value={{ supported, isOpen: pip !== null, open, close }}>
      {children}
      {pip &&
        createPortal(
          <MiniWindowView
            state={state}
            onNavigate={navigate}
            onRetry={() => void load()}
          />,
          pip.document.body,
        )}
    </Ctx.Provider>
  );
}
