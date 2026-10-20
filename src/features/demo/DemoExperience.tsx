"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

/**
 * 가입 전 체험용 데모 (P1). 저장 없음 — 로컬 상태로만 동작한다.
 * 실제 다른 사람의 기도제목은 보여주지 않고, 예시 데이터만 사용한다.
 */

type SampleCard = {
  id: string;
  name: string;
  title: string;
  body: string;
  dday: string;
};

const SAMPLES: SampleCard[] = [
  {
    id: "s1",
    name: "다은",
    title: "가족의 건강을 위해",
    body: "아버지 수술이 잘 마무리되고, 회복하는 동안 온 가족이 평안하기를 바라요.",
    dday: "D-12",
  },
  {
    id: "s2",
    name: "현우",
    title: "진로를 앞두고",
    body: "졸업을 앞두고 어떤 길로 가야 할지 고민이 많아요. 지혜를 구하고 있어요.",
    dday: "D-5",
  },
];

export function DemoExperience() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="flex flex-1 flex-col px-6 pb-16 pt-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        ← 처음으로
      </Link>

      <header className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center rounded-pill bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
          체험해보기
        </span>
        <h1 className="text-2xl font-bold leading-snug text-ink">
          이런 모습으로 함께해요
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          가입하면 만나는 &lsquo;오늘의 기도&rsquo; 화면이에요. 아래 카드를 눌러
          체크해보세요. (체험용이라 저장되지 않아요.)
        </p>
      </header>

      <section className="mt-8 flex flex-col gap-3">
        {SAMPLES.map((s) => {
          const isChecked = Boolean(checked[s.id]);
          return (
            <article
              key={s.id}
              className={cn(
                "card flex flex-col gap-3 p-4 transition-opacity",
                isChecked && "opacity-70",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
                >
                  {s.name.slice(0, 1)}
                </span>
                <p className="flex-1 font-semibold text-ink">{s.name}</p>
                <span className="rounded-pill bg-line/60 px-2 py-0.5 text-xs text-ink-soft">
                  {s.dday}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium leading-snug text-ink">{s.title}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setChecked((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                }
                aria-pressed={isChecked}
                className={cn(
                  "mt-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-card font-semibold transition-colors",
                  isChecked
                    ? "bg-primary-soft text-primary"
                    : "bg-primary text-white hover:bg-primary-hover",
                )}
              >
                {isChecked ? (
                  <>
                    <span className="animate-check-pop" aria-hidden>
                      ✓
                    </span>
                    오늘 함께 기도했습니다.
                  </>
                ) : (
                  <>🙏 오늘 함께 기도했어요</>
                )}
              </button>
            </article>
          );
        })}
      </section>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {checkedCount === 0
          ? "카드를 눌러 오늘의 기도를 체크해보세요."
          : checkedCount === SAMPLES.length
            ? "오늘 함께할 기도를 모두 마쳤어요. 이렇게 하루 두어 번이면 충분해요."
            : `오늘 ${checkedCount}명과 함께 기도했어요.`}
      </p>

      <section className="mt-12 flex flex-col items-center gap-4 rounded-card bg-primary-soft/60 px-6 py-10 text-center">
        <p className="text-lg font-bold text-ink">
          이제 나의 기도 동행을
          <br />
          시작해볼까요?
        </p>
        <Link href="/signup" className="w-full max-w-xs">
          <Button size="lg" fullWidth>
            시작하기
          </Button>
        </Link>
        <Link href="/login" className="text-sm text-ink-soft hover:text-ink">
          이미 계정이 있어요 · 로그인
        </Link>
      </section>
    </div>
  );
}
