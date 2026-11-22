"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { weekdayShortKo } from "@/lib/date";
import { track } from "@/lib/analytics";
import {
  checkBibleReading,
  uncheckBibleReading,
} from "@/features/bible/actions";
import type { BibleReadingWeek } from "@/types/domain";

export type DailyVerseView = {
  text: string;
  reference: string; // "요한복음 3:16"
  translation: string; // "개역한글"
};

/**
 * 홈 "오늘의 말씀" + 1년 1독 "오늘 읽을 곳" + 성경 읽기 습관 체크.
 * - 체크는 하루 1회, 다시 누르면 해제(실수 대응). 낙관적 업데이트 후 실패 시 되돌린다.
 * - 이번 주(일~토) 점 표시로 흐름만 보여준다. 연속 기록(streak)·끊김 경고는 두지 않는다
 *   (제품 원칙: 죄책감을 주는 UI, 의미 없는 숫자 지표 금지).
 * - demo=true 면 서버에 저장하지 않고 로컬 상태로만 동작한다(체험 화면).
 */
export function DailyVerseCard({
  verse,
  plan = null,
  reading,
  demo = false,
}: {
  verse: DailyVerseView;
  /** 1년 1독 읽기표의 오늘 범위 ("사도행전 20–21장") */
  plan?: string | null;
  reading: BibleReadingWeek | null;
  demo?: boolean;
}) {
  const toast = useToast();
  const [readDates, setReadDates] = useState<string[]>(
    reading?.readDates ?? [],
  );
  const [pending, startTransition] = useTransition();

  const showCheck = Boolean(reading?.available);
  const today = reading?.today ?? "";
  const readToday = readDates.includes(today);

  function apply(read: boolean) {
    setReadDates((prev) =>
      read
        ? prev.includes(today)
          ? prev
          : [...prev, today]
        : prev.filter((d) => d !== today),
    );
  }

  function toggle() {
    if (!reading || pending) return;
    const next = !readToday;
    apply(next);
    if (demo) return;

    startTransition(async () => {
      const res = next
        ? await checkBibleReading()
        : await uncheckBibleReading();
      if (!res.ok) {
        apply(!next);
        toast.show(res.message, "error");
        return;
      }
      if (next) {
        track("bible_reading_checked");
        toast.show("오늘도 말씀과 함께했어요.");
      }
    });
  }

  return (
    <section aria-labelledby="daily-verse-heading" className="card">
      <div className="p-4">
        <h2
          id="daily-verse-heading"
          className="text-[13px] font-semibold text-primary"
        >
          오늘의 말씀
        </h2>
        <figure className="mt-2">
          <blockquote>
            <p className="break-keep text-[15px] leading-relaxed text-ink">
              {verse.text}
            </p>
          </blockquote>
          <figcaption className="mt-2 text-[13px] text-ink-soft">
            <cite className="not-italic">{verse.reference}</cite>
            <span aria-hidden> · </span>
            <span className="sr-only">, </span>
            {verse.translation}
          </figcaption>
        </figure>
      </div>

      {(plan || (showCheck && reading)) && (
        <div
          className={cn(
            "flex flex-col items-start border-t border-line px-4",
            showCheck ? "pb-3.5" : "pb-4",
            plan ? "pt-3.5" : "pt-1",
          )}
        >
          {plan && (
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] text-ink-soft">
                오늘 읽을 곳<span aria-hidden> · </span>
                <span className="sr-only">, </span>1년 1독
              </p>
              <p className="break-keep text-[15px] font-semibold text-ink">
                {plan}
              </p>
            </div>
          )}

          {showCheck && reading && (
            <>
              <label className="-ml-1 flex min-h-[48px] cursor-pointer items-center gap-2.5 px-1">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={readToday}
                  onChange={toggle}
                  disabled={pending}
                />
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/60 peer-focus-visible:ring-offset-2",
                    readToday
                      ? "border-primary bg-primary text-white"
                      : "border-ink-soft/40 bg-surface",
                  )}
                >
                  {readToday && (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3.5 w-3.5 animate-check-pop"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  )}
                </span>
                <span className="text-[15px] font-medium text-ink">
                  오늘 성경 읽었어요
                </span>
              </label>

              <WeekStrip
                weekDates={reading.weekDates}
                readDates={readDates}
                today={today}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** 이번 주 일~토 점 표시. 읽은 날만 채워지고, 안 읽은 날은 옅게 둔다(경고 없음). */
function WeekStrip({
  weekDates,
  readDates,
  today,
}: {
  weekDates: string[];
  readDates: string[];
  today: string;
}) {
  const read = new Set(readDates);
  return (
    <ol aria-label="이번 주 성경 읽기" className="flex items-end gap-1.5">
      {weekDates.map((d) => {
        const isRead = read.has(d);
        const isToday = d === today;
        const isFuture = d > today;
        const day = weekdayShortKo(d);
        return (
          <li key={d} className="flex w-4 flex-col items-center gap-1">
            <span
              aria-hidden
              className={cn(
                "text-[10px] leading-none",
                isToday ? "font-semibold text-ink" : "text-ink-soft",
              )}
            >
              {day}
            </span>
            <span
              aria-hidden
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors",
                isRead
                  ? "bg-primary"
                  : isToday
                    ? "border border-primary/70 bg-surface"
                    : isFuture
                      ? "bg-line/50"
                      : "bg-line",
              )}
            />
            <span className="sr-only">
              {`${day}요일${isToday ? "(오늘)" : ""} ${
                isRead ? "읽음" : isFuture ? "" : "기록 없음"
              }`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
