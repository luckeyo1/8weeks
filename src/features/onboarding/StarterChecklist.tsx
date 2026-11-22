import Link from "next/link";
import { cn } from "@/lib/cn";
import type { StarterProgress } from "@/types/domain";

/**
 * 새 사용자 "시작하기" 3단계. 가입은 이미 끝난 단계로 시작해(1/3) 첫걸음을 가볍게 느끼게 하고,
 * 지금 할 단계 하나에만 버튼을 둔다. 기존 데이터에서 계산하므로 다 하면 저절로 사라진다.
 * 경고·마감·벌점 같은 압박 요소는 두지 않는다.
 */
export function StarterChecklist({ progress }: { progress: StarterProgress }) {
  const steps: {
    label: string;
    hint: string;
    done: boolean;
    href?: string;
    cta?: string;
  }[] = [
    { label: "가입하기", hint: "환영해요!", done: true },
    {
      label: "첫 기도제목 만들기",
      hint: "함께 기도했으면 하는 마음을 짧게 적어요",
      done: progress.hasPrayer,
      href: "/prayers/new",
      cta: "만들기",
    },
    {
      label: "함께 기도할 사람 초대하기",
      hint: "카카오톡으로 초대 메시지를 보내요. 한 명이면 충분해요",
      done: progress.hasCompanion,
      href: progress.invitePrayerId
        ? `/prayers/${progress.invitePrayerId}`
        : "/prayers/new",
      cta: "초대하기",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const current = steps.findIndex((s) => !s.done);

  return (
    <section aria-labelledby="starter-heading" className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="starter-heading" className="text-[15px] font-semibold text-ink">
          기도 동행 시작하기
        </h2>
        <span className="text-[13px] font-medium text-primary">
          {doneCount}/{steps.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="시작하기 진행"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={doneCount}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-3 flex flex-col">
        {steps.map((s, i) => {
          const isCurrent = i === current;
          return (
            <li key={s.label} className="flex items-center gap-3 py-2">
              <span
                aria-hidden
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                  s.done
                    ? "bg-primary text-white"
                    : isCurrent
                      ? "border-2 border-primary text-primary"
                      : "border border-line text-ink-soft",
                )}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[15px]",
                    s.done
                      ? "text-ink-soft line-through"
                      : "font-medium text-ink",
                  )}
                >
                  <span className="sr-only">{s.done ? "완료: " : ""}</span>
                  {s.label}
                </p>
                {isCurrent && (
                  <p className="text-[13px] leading-snug text-ink-soft">
                    {s.hint}
                  </p>
                )}
              </div>
              {isCurrent && s.href && (
                <Link
                  href={s.href}
                  className="inline-flex min-h-[40px] shrink-0 items-center rounded-pill bg-primary px-4 text-[14px] font-semibold text-white hover:bg-primary-hover"
                >
                  {s.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
