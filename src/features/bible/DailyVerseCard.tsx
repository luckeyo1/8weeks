"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { weekdayShortKo } from "@/lib/date";
import { track } from "@/lib/analytics";
import {
  TOTAL_CHAPTERS,
  formatChapters,
  fromChapterKey,
  nextChapter,
  chapterKey,
} from "@/lib/bible/books";
import { saveTodayReading } from "@/features/bible/actions";
import { ReadingSheet } from "@/features/bible/ReadingSheet";
import type { BibleReadingState } from "@/types/domain";

export type DailyVerseView = {
  text: string;
  reference: string; // "요한복음 3:16"
  translation: string; // "개역한글"
};

/**
 * 홈 "오늘의 말씀" + 오늘 읽은 곳 기록.
 * - 정해진 읽기표 대신, 내가 읽은 장을 골라 기록한다(바텀 시트). 지난번 다음 장을 미리 선택.
 * - 이번 주(일~토) 점 표시와 통독 현황(읽은 장 수)만 보여준다. 연속 기록(streak)·밀림 경고는
 *   두지 않는다(제품 원칙: 죄책감을 주는 UI 금지).
 * - demo=true 면 서버에 저장하지 않고 로컬 상태로만 동작한다(체험 화면).
 * - 서버 데이터가 바뀌면 부모가 key 를 바꿔 다시 마운트한다(로컬 상태 초기화).
 */
export function DailyVerseCard({
  verse,
  reading,
  demo = false,
}: {
  verse: DailyVerseView;
  reading: BibleReadingState | null;
  demo?: boolean;
}) {
  const toast = useToast();
  const [todayKeys, setTodayKeys] = useState(reading?.todayKeys ?? []);
  const [readKeys, setReadKeys] = useState(reading?.readKeys ?? []);
  const [readDates, setReadDates] = useState(reading?.readDates ?? []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  if (!reading?.available) {
    return <VerseOnly verse={verse} />;
  }

  const today = reading.today;
  const todayText = formatChapters(todayKeys.map(fromChapterKey));
  const lastRead = reading.lastRead ? fromChapterKey(reading.lastRead) : null;

  // 시트 초기값: 오늘 기록이 있으면 그대로, 없으면 지난번 다음 장을 미리 선택
  const suggested = lastRead ? nextChapter(lastRead) : null;
  const sheetInitial =
    todayKeys.length > 0
      ? todayKeys
      : suggested
        ? [chapterKey(suggested.book, suggested.chapter)]
        : [];
  const lastKey = sheetInitial[sheetInitial.length - 1];
  const sheetBook = lastKey ? fromChapterKey(lastKey).book : 1;

  function applyLocal(keys: number[]) {
    setTodayKeys(keys);
    setReadKeys((prev) => [...new Set([...prev, ...keys])]);
    setReadDates((prev) =>
      keys.length > 0
        ? prev.includes(today)
          ? prev
          : [...prev, today]
        : prev.filter((d) => d !== today),
    );
  }

  function save(keys: number[]) {
    const done = () => {
      applyLocal(keys);
      setSheetOpen(false);
      toast.show(
        keys.length > 0
          ? "오늘 읽은 곳을 기록했어요."
          : "오늘 기록을 지웠어요.",
      );
    };
    if (demo) return done();

    startTransition(async () => {
      const res = await saveTodayReading(keys.map(fromChapterKey));
      if (!res.ok) {
        toast.show(res.message, "error");
        return;
      }
      if (keys.length > 0) {
        track("bible_reading_recorded", { chapters: keys.length });
      }
      done();
    });
  }

  const progress = `통독 ${readKeys.length}/${TOTAL_CHAPTERS}장`;

  return (
    <section aria-labelledby="daily-verse-heading" className="card">
      <VerseBody verse={verse} />

      <div className="flex flex-col gap-3 border-t border-line px-4 pb-3.5 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-ink-soft">오늘 읽은 곳</p>
            {todayText ? (
              <p className="mt-0.5 break-keep text-[15px] font-semibold text-ink">
                {todayText}
              </p>
            ) : (
              <p className="mt-0.5 text-[15px] text-ink-soft">
                아직 기록이 없어요
                {lastRead && (
                  <span className="block text-[13px]">
                    지난번 {formatChapters([lastRead])}까지 읽었어요
                  </span>
                )}
              </p>
            )}
          </div>
          {todayText && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="-mr-2 min-h-[44px] shrink-0 px-2 text-[14px] font-medium text-primary"
            >
              수정
            </button>
          )}
        </div>

        {!todayText && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setSheetOpen(true)}
          >
            읽은 곳 기록하기
          </Button>
        )}

        <div className="flex items-end justify-between gap-3">
          <WeekStrip
            weekDates={reading.weekDates}
            readDates={readDates}
            today={today}
          />
          {demo ? (
            <span className="text-[13px] text-ink-soft">{progress}</span>
          ) : (
            <Link
              href="/bible"
              className="-my-2 py-2 text-[13px] text-ink-soft hover:text-ink"
            >
              {progress} <span aria-hidden>›</span>
            </Link>
          )}
        </div>
      </div>

      {sheetOpen && (
        <ReadingSheet
          initialKeys={sheetInitial}
          readKeys={readKeys}
          startBook={sheetBook}
          pending={pending}
          onClose={closeSheet}
          onSave={save}
        />
      )}
    </section>
  );
}

function VerseBody({ verse }: { verse: DailyVerseView }) {
  return (
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
  );
}

/** 기록 기능을 쓸 수 없을 때(마이그레이션 전 등): 말씀만 */
function VerseOnly({ verse }: { verse: DailyVerseView }) {
  return (
    <section aria-labelledby="daily-verse-heading" className="card">
      <VerseBody verse={verse} />
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
