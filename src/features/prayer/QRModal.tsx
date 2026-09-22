"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface QRModalProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
}

/** QR 전체화면 모달 (명세 12) */
export function QRModal({ open, onClose, shareUrl, title }: QRModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.show("링크를 복사했어요.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show("링크 복사에 실패했어요.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} fullScreen title="함께 기도해주세요">
      <div className="flex min-h-dvh flex-col px-6 py-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <h2 className="text-xl font-bold text-ink">함께 기도해주세요</h2>
          <p className="max-w-xs text-center text-[15px] leading-relaxed text-ink">
            {title}
          </p>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-card">
            <QRCodeSVG
              value={shareUrl}
              size={220}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#222222"
            />
          </div>

          <p className="max-w-xs text-center text-sm leading-relaxed text-ink-soft">
            카메라로 QR을 스캔하면 이 기도제목을 함께 품을 수 있어요.
          </p>
        </div>

        <div className="pb-safe">
          <Button variant="secondary" size="lg" fullWidth onClick={copyLink}>
            {copied ? "복사됨" : "링크 복사"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
