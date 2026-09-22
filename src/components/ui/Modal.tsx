"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 전체화면 모달 (QR 등) */
  fullScreen?: boolean;
  labelledBy?: string;
}

/** 접근성 있는 모달 (esc 닫기, 배경 클릭 닫기, focus 이동) */
export function Modal({
  open,
  onClose,
  title,
  children,
  fullScreen = false,
  labelledBy,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // 배경 스크롤 잠금
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={!labelledBy ? title : undefined}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-app bg-surface shadow-pop focus:outline-none",
          fullScreen
            ? "min-h-dvh"
            : "rounded-t-3xl pb-safe sm:rounded-3xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}
