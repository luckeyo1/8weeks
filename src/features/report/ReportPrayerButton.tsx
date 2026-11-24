"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { reportPrayer } from "./actions";
import {
  REPORT_DETAIL_MAX,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  type ReportReason,
} from "./schema";

/**
 * 기도제목 신고 (함께 기도하는 사람 화면).
 * 접수 후에는 원하면 바로 목록에서 지울 수 있게 '함께 기도 그만하기'를 안내한다.
 */
export function ReportPrayerButton({
  prayerId,
  onLeave,
}: {
  prayerId: string;
  /** 신고 후 "목록에서 지우기"를 고르면 호출 */
  onLeave: () => void;
}) {
  const toast = useToast();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    // 다음에 열 때 깨끗한 상태로
    setTimeout(() => {
      setDone(false);
      setReason(null);
      setDetail("");
      setError(null);
    }, 200);
  }

  function submit() {
    if (!reason) {
      setError("신고 사유를 골라주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reportPrayer({ prayerId, reason, detail });
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.message);
        if (res.code !== "VALIDATION") toast.show(res.message, "error");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-center px-2 py-1 text-[13px] text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        이 기도제목 신고하기
      </button>

      <Modal open={open} onClose={close} labelledBy={titleId}>
        <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto px-5 pb-6 pt-5">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden />

          {done ? (
            <>
              <h2 id={titleId} className="text-base font-semibold text-ink">
                신고를 접수했어요
              </h2>
              <p className="text-sm leading-relaxed text-ink-soft">
                운영자가 내용을 확인하고 필요하면 기도제목을 숨겨요. 신고한
                사실은 작성자에게 알리지 않아요.
              </p>
              <p className="text-sm leading-relaxed text-ink-soft">
                이 기도제목을 더 보고 싶지 않다면 지금 내 목록에서 지울 수
                있어요.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    close();
                    onLeave();
                  }}
                >
                  내 목록에서 지우기
                </Button>
                <Button variant="ghost" size="lg" fullWidth onClick={close}>
                  닫기
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 id={titleId} className="text-base font-semibold text-ink">
                  이 기도제목을 신고할까요?
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  운영자에게만 전달되고, 작성자에게는 알리지 않아요.
                </p>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium text-ink">
                  신고 사유
                </legend>
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className={cn(
                      "flex min-h-[48px] cursor-pointer items-center gap-3 rounded-card border px-4 text-[15px] transition-colors",
                      reason === r
                        ? "border-primary bg-primary-soft text-ink"
                        : "border-line bg-surface text-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name={`report-reason-${prayerId}`}
                      value={r}
                      checked={reason === r}
                      onChange={() => {
                        setReason(r);
                        setError(null);
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    {REPORT_REASON_LABELS[r]}
                  </label>
                ))}
              </fieldset>

              <Textarea
                id={`report-detail-${prayerId}`}
                label={reason === "OTHER" ? "이유 (필수)" : "자세한 내용 (선택)"}
                placeholder="운영자가 알아야 할 내용이 있다면 적어주세요."
                rows={3}
                maxLength={REPORT_DETAIL_MAX}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                counter={{ value: detail.length, max: REPORT_DETAIL_MAX }}
                error={error ?? undefined}
              />

              <div className="flex gap-2">
                <Button variant="ghost" onClick={close} disabled={pending}>
                  취소
                </Button>
                <Button
                  className="flex-1"
                  loading={pending}
                  onClick={submit}
                >
                  신고하기
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
