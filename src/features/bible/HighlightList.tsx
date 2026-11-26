"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { bookName } from "@/lib/bible/books";
import {
  HIGHLIGHT_STYLE,
  formatVerseRange,
  type HighlightGroup,
} from "@/lib/bible/highlights";
import {
  chapterDataUrl,
  chapterHref,
  type ChapterText,
} from "@/lib/bible/text";

/* 장 본문은 장마다 한 번만 받는다 (서비스워커가 보관해 오프라인에서도 열린다) */
const chapterCache = new Map<string, Promise<string[] | null>>();

function loadChapter(book: number, chapter: number): Promise<string[] | null> {
  const key = `${book}:${chapter}`;
  let p = chapterCache.get(key);
  if (!p) {
    p = fetch(chapterDataUrl(book, chapter))
      .then((res) => (res.ok ? (res.json() as Promise<ChapterText>) : null))
      .then((data) => data?.v ?? null)
      .catch(() => null);
    chapterCache.set(key, p);
  }
  return p;
}

function groupText(verses: string[] | null, g: HighlightGroup): string | null {
  if (!verses) return null;
  return verses.slice(g.first - 1, g.last).join(" ") || null;
}

/** 내 하이라이트 목록: 색 · "시편 23:1-3" · 본문 두 줄. 누르면 그 절로 이동 */
export function HighlightList({ groups }: { groups: HighlightGroup[] }) {
  const [texts, setTexts] = useState<Record<string, string[] | null>>({});

  useEffect(() => {
    let alive = true;
    const chapters = new Map<string, { book: number; chapter: number }>();
    for (const g of groups) chapters.set(`${g.book}:${g.chapter}`, g);
    for (const [key, { book, chapter }] of chapters) {
      void loadChapter(book, chapter).then((verses) => {
        if (alive) setTexts((prev) => ({ ...prev, [key]: verses }));
      });
    }
    return () => {
      alive = false;
    };
  }, [groups]);

  return (
    <ul className="card divide-y divide-line">
      {groups.map((g) => {
        const key = `${g.book}:${g.chapter}`;
        const loaded = key in texts;
        const text = groupText(texts[key] ?? null, g);
        const ref = `${bookName(g.book)} ${g.chapter}:${formatVerseRange(g.first, g.last)}`;
        return (
          <li key={`${key}:${g.color}:${g.first}`}>
            <Link
              href={chapterHref(g.book, g.chapter, g.first)}
              className="flex gap-3 px-4 py-3 transition-colors hover:bg-canvas"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 h-3 w-3 shrink-0 rounded-full",
                  HIGHLIGHT_STYLE[g.color].swatch,
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink">
                  {ref}
                  <span className="sr-only">
                    {" "}
                    ({HIGHLIGHT_STYLE[g.color].name})
                  </span>
                </span>
                <span
                  className={cn(
                    "mt-0.5 line-clamp-2 break-keep text-[14px] leading-relaxed",
                    text ? "text-ink-soft" : "text-ink-soft/60",
                  )}
                >
                  {text ?? (loaded ? "본문을 불러오지 못했어요." : "…")}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
