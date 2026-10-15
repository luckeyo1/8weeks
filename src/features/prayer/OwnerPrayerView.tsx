"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { QRModal } from "./QRModal";
import { DurationPicker } from "./DurationPicker";
import {
  closePrayer,
  deletePrayer,
  endPrayerNow,
  extendPrayer,
  recordAnswer,
  recordChange,
  removeParticipant,
  reissueShareLink,
  revokeShareLink,
} from "./actions";
import { UpdateList } from "./UpdateList";
import { formatDDay, formatKoreanRange, appTodayISO } from "@/lib/date";
import type { OwnerPrayerDetail } from "@/types/domain";
import type { ActionResult } from "@/lib/errors";

type Sheet =
  | null
  | "extend"
  | "change"
  | "answer"
  | "close"
  | "delete"
  | "end"
  | "revoke"
  | "reissue";

export function OwnerPrayerView({ detail }: { detail: OwnerPrayerDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [qrOpen, setQrOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [removeTarget, setRemoveTarget] = useState<OwnerPrayerDetail["participants"][number] | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  // sheet 입력 상태
  const [extendDays, setExtendDays] = useState<number | null>(7);
  const [changeText, setChangeText] = useState("");
  const [answerText, setAnswerText] = useState("");

  const today = appTodayISO();
  const dday = formatDDay(detail.endDate, today);
  const isActive = detail.status === "ACTIVE";
  const isExpired = detail.status === "EXPIRED";
  const isDone = detail.status === "ANSWERED" || detail.status === "CLOSED";

  function run(fn: () => Promise<ActionResult>, onSuccess: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setSheet(null);
        onSuccess();
        router.refresh();
      } else {
        toast.show(res.message, "error");
      }
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(detail.shareUrl);
      toast.show("링크를 복사했어요.");
    } catch {
      toast.show("링크 복사에 실패했어요.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 정보 카드 */}
      <section className="card flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <StatusBadge status={detail.status} />
          {(isActive || isExpired) && (
            <span className="text-sm text-ink-soft">{dday}</span>
          )}
        </div>
        <h1 className="text-lg font-bold leading-snug text-ink">
          {detail.title}
        </h1>
        {detail.description && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
            {detail.description}
          </p>
        )}
        <div className="mt-1 flex flex-col gap-1 border-t border-line pt-3 text-sm text-ink-soft">
          <Row label="기간" value={formatKoreanRange(detail.startDate, detail.endDate)} />
          <Row label="함께 기도하는 사람" value={`${detail.participantCount}명`} />
          {/* 명세 55: 누가 몇번인지는 노출하지 않고 aggregate 만 */}
          <Row
            label="함께한 기도"
            value={`이번 기간 동안 ${detail.totalPrayerCount}번의 기도가 함께했어요`}
          />
          {detail.extensionCount > 0 && (
            <Row label="연장" value={`${detail.extensionCount}회`} />
          )}
        </div>
      </section>

      {/* 공유 (진행 중/종료 대기 시) */}
      {(isActive || isExpired) &&
        (detail.shareRevoked ? (
          <section className="card flex flex-col gap-3 p-5">
            <p className="text-[15px] font-medium text-ink">초대 링크가 잠겨 있어요</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              지금은 새로운 분이 이 링크로 함께 기도할 수 없어요. 이미 함께 기도 중인
              분들은 그대로 이어가요. 다시 초대하고 싶으면 새 링크를 만들어요.
            </p>
            <Button variant="secondary" onClick={() => setSheet("reissue")}>
              새 초대 링크 만들기
            </Button>
          </section>
        ) : (
          <section className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setQrOpen(true)}>
                QR로 공유하기
              </Button>
              <Button variant="secondary" className="flex-1" onClick={copyLink}>
                링크 복사
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setSheet("revoke")}
              className="self-center px-2 py-1 text-[13px] text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              초대 링크 잠그기
            </button>
          </section>
        ))}

      {/* 동행자 명단 + 접근 해제 (작성자 운영용) */}
      {detail.participants.length > 0 && (
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-[15px] font-semibold text-ink">
            함께 기도하는 사람
          </h2>
          <ul className="flex flex-col divide-y divide-line">
            {detail.participants.map((p) => (
              <li
                key={p.participantId}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="truncate text-[15px] text-ink">
                  {p.nickname ?? "이름 없음"}
                </span>
                {(isActive || isExpired) && (
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(p)}
                    className="shrink-0 px-2 py-1 text-[13px] text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
                  >
                    접근 해제
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-relaxed text-ink-soft/80">
            접근을 해제하면 그분은 더 이상 이 기도를 볼 수 없어요. 함께한 기록은
            남아 있어요.
          </p>
        </section>
      )}

      {/* 진행 중: 연장 / 마치기 */}
      {isActive && (
        <section className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => setSheet("extend")}>
            기간 연장
          </Button>
          <Button variant="ghost" onClick={() => setSheet("end")}>
            기도제목 마치기
          </Button>
        </section>
      )}

      {/* 종료(EXPIRED): 정리 화면 (명세 23) */}
      {isExpired && (
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-[15px] font-semibold text-ink">
            이 기도제목은 지금 어떻게 되었나요?
          </h2>
          <div className="flex flex-col gap-2">
            <ResolveButton
              emoji="🙏"
              label="조금 더 기도가 필요해요"
              onClick={() => setSheet("extend")}
            />
            <ResolveButton
              emoji="🌱"
              label="변화가 있었어요"
              onClick={() => setSheet("change")}
            />
            <ResolveButton
              emoji="🙌"
              label="응답을 경험했어요"
              onClick={() => setSheet("answer")}
            />
            <ResolveButton
              emoji="🔒"
              label="여기에서 마칠게요"
              onClick={() => setSheet("close")}
            />
          </div>
        </section>
      )}

      {/* 마무리된 기도: 업데이트 표시 */}
      {isDone && detail.updates.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[15px] font-semibold text-ink">함께 나눈 이야기</h2>
          <UpdateList updates={detail.updates} />
        </section>
      )}

      {/* 삭제 */}
      <section className="pt-2">
        <Button variant="danger" fullWidth onClick={() => setSheet("delete")}>
          기도제목 삭제
        </Button>
      </section>

      {/* QR 모달 */}
      <QRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        shareUrl={detail.shareUrl}
        title={detail.title}
      />

      {/* 연장 sheet */}
      <SheetShell
        open={sheet === "extend"}
        onClose={() => setSheet(null)}
        title="얼마나 더 함께 기도할까요?"
      >
        <DurationPicker value={extendDays} onChange={setExtendDays} />
        <Button
          size="lg"
          fullWidth
          loading={pending}
          disabled={!extendDays}
          onClick={() =>
            extendDays &&
            run(
              () =>
                extendPrayer({
                  prayerId: detail.prayerId,
                  durationDays: extendDays,
                }),
              () => toast.show("기간을 연장했어요."),
            )
          }
        >
          연장하기
        </Button>
      </SheetShell>

      {/* 변화 sheet (명세 25) */}
      <SheetShell
        open={sheet === "change"}
        onClose={() => setSheet(null)}
        title="어떤 변화가 있었나요?"
      >
        <Textarea
          placeholder="함께 기도한 분들에게 전하고 싶은 변화를 적어주세요."
          rows={4}
          maxLength={300}
          counter={{ value: changeText.trim().length, max: 300 }}
          value={changeText}
          onChange={(e) => setChangeText(e.target.value)}
        />
        <Button
          size="lg"
          fullWidth
          loading={pending}
          disabled={changeText.trim().length === 0}
          onClick={() =>
            run(
              () =>
                recordChange({
                  prayerId: detail.prayerId,
                  content: changeText.trim(),
                }),
              () => toast.show("변화를 나눴어요."),
            )
          }
        >
          업데이트 공유
        </Button>
      </SheetShell>

      {/* 응답 sheet (명세 26) */}
      <SheetShell
        open={sheet === "answer"}
        onClose={() => setSheet(null)}
        title="응답을 경험하셨군요 🙌"
      >
        <Textarea
          placeholder="감사한 마음을 함께 기도한 분들에게 전해보세요. (선택)"
          rows={4}
          maxLength={500}
          counter={{ value: answerText.trim().length, max: 500 }}
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
        />
        <Button
          size="lg"
          fullWidth
          loading={pending}
          onClick={() =>
            run(
              () =>
                recordAnswer({
                  prayerId: detail.prayerId,
                  content: answerText.trim() || undefined,
                }),
              () => toast.show("응답을 기록했어요."),
            )
          }
        >
          저장하기
        </Button>
      </SheetShell>

      {/* 마치기 확인 (명세 27) */}
      <ConfirmSheet
        open={sheet === "close"}
        onClose={() => setSheet(null)}
        title="여기에서 마칠까요?"
        description="함께 기도한 분들에게 마무리되었다고 전해져요."
        confirmLabel="마치기"
        pending={pending}
        onConfirm={() =>
          run(
            () => closePrayer(detail.prayerId),
            () => toast.show("기도제목을 마쳤어요."),
          )
        }
      />

      {/* 지금 마치기 (ACTIVE → 정리) */}
      <ConfirmSheet
        open={sheet === "end"}
        onClose={() => setSheet(null)}
        title="지금 기도제목을 마칠까요?"
        description="마친 뒤 변화나 응답을 정리할 수 있어요."
        confirmLabel="네, 마칠게요"
        pending={pending}
        onConfirm={() =>
          run(
            () => endPrayerNow(detail.prayerId),
            () => {},
          )
        }
      />

      {/* 초대 링크 잠그기 */}
      <ConfirmSheet
        open={sheet === "revoke"}
        onClose={() => setSheet(null)}
        title="초대 링크를 잠글까요?"
        description="지금 공유된 링크로는 더 이상 새로운 분이 함께 기도할 수 없어요. 이미 함께하는 분들은 그대로예요."
        confirmLabel="링크 잠그기"
        pending={pending}
        onConfirm={() =>
          run(
            () => revokeShareLink(detail.prayerId),
            () => toast.show("초대 링크를 잠갔어요."),
          )
        }
      />

      {/* 새 초대 링크 만들기 */}
      <ConfirmSheet
        open={sheet === "reissue"}
        onClose={() => setSheet(null)}
        title="새 초대 링크를 만들까요?"
        description="예전에 공유했던 링크는 더 이상 열리지 않아요. 새 링크를 다시 공유해주세요."
        confirmLabel="새 링크 만들기"
        pending={pending}
        onConfirm={() =>
          run(
            async () => {
              const res = await reissueShareLink(detail.prayerId);
              return res.ok ? { ok: true as const, data: undefined } : res;
            },
            () => toast.show("새 초대 링크를 만들었어요."),
          )
        }
      />

      {/* 동행자 접근 해제 */}
      <ConfirmSheet
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title={
          removeTarget
            ? `${removeTarget.nickname ?? "이 동행자"}님의 접근을 해제할까요?`
            : "접근을 해제할까요?"
        }
        description="그분은 더 이상 이 기도를 볼 수 없어요. 함께한 기록은 남아 있어요."
        confirmLabel="접근 해제"
        pending={pending}
        onConfirm={() => {
          const target = removeTarget;
          if (!target) return;
          startTransition(async () => {
            const res = await removeParticipant({
              prayerId: detail.prayerId,
              participantId: target.participantId,
            });
            if (res.ok) {
              setRemoveTarget(null);
              toast.show("접근을 해제했어요.");
              router.refresh();
            } else {
              toast.show(res.message, "error");
            }
          });
        }}
      />

      {/* 삭제 확인 (명세 33) */}
      <ConfirmSheet
        open={sheet === "delete"}
        onClose={() => setSheet(null)}
        title="이 기도제목을 삭제할까요?"
        description="삭제하면 더 이상 볼 수 없어요."
        confirmLabel="삭제하기"
        danger
        pending={pending}
        onConfirm={() =>
          run(
            () => deletePrayer(detail.prayerId),
            () => {
              toast.show("기도제목을 삭제했어요.");
              router.replace("/my-prayers");
            },
          )
        }
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-ink-soft/80">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

function ResolveButton({
  emoji,
  label,
  onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] items-center gap-3 rounded-card border border-line bg-surface px-4 text-left text-[15px] font-medium text-ink transition-colors hover:border-primary/40"
    >
      <span aria-hidden className="text-lg">
        {emoji}
      </span>
      {label}
    </button>
  );
}

function SheetShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4 px-5 pb-6 pt-5">
        <div className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden />
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {children}
      </div>
    </Modal>
  );
}

function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending: boolean;
  danger?: boolean;
}) {
  return (
    <SheetShell open={open} onClose={onClose} title={title}>
      {description && (
        <p className="text-sm leading-relaxed text-ink-soft">{description}</p>
      )}
      <div className="flex flex-col gap-2">
        <Button
          variant={danger ? "danger" : "primary"}
          size="lg"
          fullWidth
          loading={pending}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
          다음에
        </Button>
      </div>
    </SheetShell>
  );
}
