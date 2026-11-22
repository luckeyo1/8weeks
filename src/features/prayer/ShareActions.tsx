"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics";

/**
 * 초대 메시지(작성자 1인칭). 기도 내용은 넣지 않는다 — 수락 전 비공개 원칙과
 * 링크 미리보기(OG)에 내용을 싣지 않는 정책을 그대로 따른다.
 */
export function inviteText(daysLeft: number): string {
  const period = daysLeft > 0 ? `${daysLeft}일 동안 ` : "";
  return `제 기도제목을 함께 기도해 주실래요? 🙏\n${period}함께 기억해 주시면 큰 힘이 될 것 같아요.`;
}

/**
 * 공유 버튼 묶음. 휴대폰에서는 기기 공유 시트(카카오톡·문자 등)를 바로 열고,
 * 지원하지 않는 환경에서는 초대 메시지를 복사한다. QR 은 만나서 보여줄 때.
 */
export function ShareActions({
  shareUrl,
  daysLeft,
  onOpenQR,
}: {
  shareUrl: string;
  daysLeft: number;
  onOpenQR: () => void;
}) {
  const toast = useToast();
  const text = inviteText(daysLeft);

  async function copyMessage(reason: "button" | "fallback") {
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      toast.show(
        reason === "fallback"
          ? "초대 메시지를 복사했어요. 카카오톡이나 문자에 붙여 넣어 보내 보세요."
          : "초대 메시지를 복사했어요.",
      );
      track("prayer_share_opened", { method: "copy" });
    } catch {
      toast.show(
        "복사에 실패했어요. QR을 보여주거나 다시 시도해 주세요.",
        "error",
      );
    }
  }

  async function share() {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: "함께 기도해 주세요",
          text,
          url: shareUrl,
        });
        track("prayer_share_opened", { method: "native" });
      } catch (e) {
        // 사용자가 공유 시트를 닫은 경우(AbortError)는 조용히 무시
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          await copyMessage("fallback");
        }
      }
      return;
    }
    await copyMessage("fallback");
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" fullWidth onClick={share}>
        초대 메시지 보내기
      </Button>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            track("prayer_qr_opened");
            onOpenQR();
          }}
        >
          QR 보여주기
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => copyMessage("button")}
        >
          메시지 복사
        </Button>
      </div>
    </div>
  );
}
