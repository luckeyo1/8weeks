"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  BIBLE_BOOKS,
  OLD_TESTAMENT_BOOKS,
  bookName,
  chapterCount,
  chapterKey,
  chapterUnit,
  formatChapters,
  fromChapterKey,
} from "@/lib/bible/books";

/**
 * 오늘 읽은 곳 고르기 (바텀 시트). 책을 고르고 장 번호를 눌러 선택/해제한다.
 * 여러 책에 걸쳐 고를 수 있고, 전에 읽은 장은 옅게 표시해 어디까지 읽었는지 보이게 한다.
 * 열 때마다 새로 마운트된다(부모가 open 일 때만 렌더) — 초기값은 props 로 받는다.
 */
export function ReadingSheet({
  initialKeys,
  readKeys,
  startBook,
  pending,
  onClose,
  onSave,
}: {
  initialKeys: number[];
  readKeys: number[];
  startBook: number;
  pending: boolean;
  /** Modal 의 effect 의존성이라 부모에서 안정된 함수(useCallback)로 넘긴다 */
  onClose: () => void;
  onSave: (keys: number[]) => void;
}) {
  const [selected, setSelected] = useState(() => new Set(initialKeys));
  const [book, setBook] = useState(startBook);
  const readBefore = useMemo(() => new Set(readKeys), [readKeys]);

  const readCountByBook = useMemo(() => {
    const counts = new Map<number, number>();
    for (const key of readBefore) {
      const b = fromChapterKey(key).book;
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    return counts;
  }, [readBefore]);

  const summary = formatChapters([...selected].map(fromChapterKey));
  const unit = chapterUnit(book);

  function toggle(chapter: number) {
    const key = chapterKey(book, chapter);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function bookOption(n: number) {
    const read = readCountByBook.get(n) ?? 0;
    const total = chapterCount(n);
    return (
      <option key={n} value={n}>
        {bookName(n)}
        {read > 0 ? ` (${read}/${total})` : ""}
      </option>
    );
  }

  return (
    <Modal open onClose={onClose} labelledBy="reading-sheet-title">
      <div className="flex max-h-[88dvh] flex-col">
        <div className="px-5 pt-5">
          <h2 id="reading-sheet-title" className="text-lg font-bold text-ink">
            오늘 읽은 곳
          </h2>
          <p
            aria-live="polite"
            className={cn(
              "mt-1 min-h-[20px] break-keep text-sm",
              summary ? "font-medium text-primary" : "text-ink-soft",
            )}
          >
            {summary || "읽은 장을 눌러 골라 주세요."}
          </p>

          <label
            htmlFor="reading-book"
            className="mt-4 block text-[13px] font-medium text-ink-soft"
          >
            책
          </label>
          <select
            id="reading-book"
            value={book}
            onChange={(e) => setBook(Number(e.target.value))}
            className="mt-1 min-h-[48px] w-full rounded-card border border-line bg-surface px-3 text-[15px] text-ink"
          >
            <optgroup label="구약">
              {BIBLE_BOOKS.slice(0, OLD_TESTAMENT_BOOKS).map((_, i) =>
                bookOption(i + 1),
              )}
            </optgroup>
            <optgroup label="신약">
              {BIBLE_BOOKS.slice(OLD_TESTAMENT_BOOKS).map((_, i) =>
                bookOption(OLD_TESTAMENT_BOOKS + i + 1),
              )}
            </optgroup>
          </select>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          <div
            role="group"
            aria-label={`${bookName(book)} ${unit} 선택`}
            className="grid grid-cols-6 gap-2"
          >
            {Array.from({ length: chapterCount(book) }, (_, i) => i + 1).map(
              (chapter) => {
                const key = chapterKey(book, chapter);
                const isSelected = selected.has(key);
                const wasRead = readBefore.has(key);
                return (
                  <button
                    key={chapter}
                    type="button"
                    onClick={() => toggle(chapter)}
                    aria-pressed={isSelected}
                    aria-label={`${chapter}${unit}${wasRead ? ", 전에 읽음" : ""}`}
                    className={cn(
                      "h-11 rounded-lg text-[15px] font-medium transition-colors",
                      isSelected
                        ? "bg-primary text-white"
                        : wasRead
                          ? "bg-primary-soft text-primary"
                          : "border border-line text-ink hover:bg-line/40",
                    )}
                  >
                    {chapter}
                  </button>
                );
              },
            )}
          </div>
          <p
            aria-hidden
            className="mt-3 flex items-center gap-3 text-xs text-ink-soft"
          >
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-primary" /> 오늘 읽은 곳
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-primary-soft" /> 전에 읽은
              곳
            </span>
          </p>
        </div>

        <div className="flex gap-2 border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button
            className="flex-1"
            loading={pending}
            onClick={() => onSave([...selected])}
          >
            저장
          </Button>
        </div>
      </div>
    </Modal>
  );
}
