import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/features/auth/service";
import { getBibleReadingState } from "@/services/bible";
import { appTodayISO } from "@/lib/date";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  BIBLE_BOOKS,
  OLD_TESTAMENT_BOOKS,
  TOTAL_CHAPTERS,
  bookName,
  chapterKey,
  chapterUnit,
  formatChapters,
  fromChapterKey,
  nextChapter,
} from "@/lib/bible/books";
import { BIBLE_TEXT_SOURCE, chapterHref } from "@/lib/bible/text";

export const metadata: Metadata = {
  title: "성경",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type BookProgress = {
  book: number;
  name: string;
  total: number;
  read: number[]; // 읽은 장 번호
};

/**
 * 성경 탭: 이어 읽기 + 통독 현황(본인 기록만) + 66권 목록(장을 누르면 읽기 화면).
 * 읽기 진도 압박 없이 현황만 보여준다.
 */
export default async function BiblePage() {
  const profile = await requireProfile();
  const reading = await getBibleReadingState(profile.id, appTodayISO());
  const keys = reading.available ? reading.readKeys : null;

  if (keys === null) {
    return (
      <div>
        <PageHeader title="성경" />
        <EmptyState
          title="성경 읽기 기록을 준비하고 있어요."
          description="잠시 후 다시 확인해 주세요."
          action={
            <Link href="/home">
              <Button variant="secondary">홈으로</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const read = new Set(keys);
  const lastRead = reading.lastRead ? fromChapterKey(reading.lastRead) : null;
  const resume = lastRead ? nextChapter(lastRead) : { book: 1, chapter: 1 };
  const todayText = formatChapters(reading.todayKeys.map(fromChapterKey));
  const books: BookProgress[] = BIBLE_BOOKS.map(([name, total], i) => {
    const book = i + 1;
    const chapters = Array.from({ length: total }, (_, c) => c + 1);
    return {
      book,
      name,
      total,
      read: chapters.filter((c) => read.has(chapterKey(book, c))),
    };
  });
  const old = books.slice(0, OLD_TESTAMENT_BOOKS);
  const neu = books.slice(OLD_TESTAMENT_BOOKS);
  const sum = (list: BookProgress[], f: (b: BookProgress) => number) =>
    list.reduce((n, b) => n + f(b), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="성경" />

      {/* 이어 읽기 */}
      <Link
        href={chapterHref(resume.book, resume.chapter)}
        className="card flex items-center gap-4 p-4 transition-colors hover:border-primary/40"
      >
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 5.5A1.5 1.5 0 015.5 4H11v15H5.5A1.5 1.5 0 004 20.5zM20 5.5A1.5 1.5 0 0018.5 4H13v15h5.5a1.5 1.5 0 011.5 1.5z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-ink-soft">
            {lastRead ? `지난번 ${formatChapters([lastRead])}까지 읽었어요` : "처음부터 읽어볼까요?"}
          </span>
          <span className="mt-0.5 block text-[17px] font-semibold text-ink">
            {bookName(resume.book)} {resume.chapter}
            {chapterUnit(resume.book)} {lastRead ? "이어 읽기" : "읽기"}
          </span>
        </span>
        <span aria-hidden className="text-ink-soft">
          ›
        </span>
      </Link>

      <section className="card flex flex-col gap-3 p-4">
        <p className="text-[13px] text-ink-soft">지금까지 읽은 장</p>
        <p className="text-2xl font-bold text-ink">
          {keys.length}
          <span className="text-base font-medium text-ink-soft">
            {" "}
            / {TOTAL_CHAPTERS}장
          </span>
        </p>
        <Bar value={keys.length} max={TOTAL_CHAPTERS} label="전체 통독" />
        <p className="text-[13px] text-ink-soft">
          구약 {sum(old, (b) => b.read.length)}/{sum(old, (b) => b.total)}장 ·
          신약 {sum(neu, (b) => b.read.length)}/{sum(neu, (b) => b.total)}장
        </p>
        {todayText && (
          <p className="text-[13px] text-ink">오늘 읽은 곳: {todayText}</p>
        )}
        <p className="text-[13px] leading-relaxed text-ink-soft">
          장 끝의 &lsquo;다 읽었어요&rsquo;나 홈의 &lsquo;읽은 곳 기록하기&rsquo;로
          기록하면 여기에 채워져요. 순서도 속도도 자유예요.
        </p>
      </section>

      <BookList title="구약" books={old} />
      <BookList title="신약" books={neu} />

      <p className="text-center text-[12px] text-ink-soft/80">{BIBLE_TEXT_SOURCE}</p>
    </div>
  );
}

function BookList({ title, books }: { title: string; books: BookProgress[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <ul className="card divide-y divide-line">
        {books.map((b) => (
          <li key={b.book}>
            <details className="group">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                <span className="w-24 shrink-0 text-[15px] text-ink">
                  {b.name}
                </span>
                <span className="flex-1">
                  <Bar value={b.read.length} max={b.total} label={b.name} />
                </span>
                <span
                  className={cn(
                    "w-14 shrink-0 text-right text-[13px] tabular-nums",
                    b.read.length === b.total
                      ? "font-semibold text-primary"
                      : "text-ink-soft",
                  )}
                >
                  {b.read.length}/{b.total}
                </span>
                <span
                  aria-hidden
                  className="text-ink-soft transition-transform group-open:rotate-90"
                >
                  ›
                </span>
              </summary>
              <div className="px-4 pb-4">
                <p className="sr-only">
                  {b.read.length > 0
                    ? `읽은 곳: ${formatChapters(
                        b.read.map((c) => ({ book: b.book, chapter: c })),
                      )}`
                    : "아직 읽은 장이 없어요"}
                </p>
                <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                  {Array.from({ length: b.total }, (_, i) => i + 1).map((c) => {
                    const done = b.read.includes(c);
                    return (
                      <Link
                        key={c}
                        href={chapterHref(b.book, c)}
                        aria-label={`${b.name} ${c}${chapterUnit(b.book)}${done ? ", 읽음" : ""}`}
                        className={cn(
                          "flex h-9 items-center justify-center rounded-md text-[13px] tabular-nums transition-colors",
                          done
                            ? "bg-primary text-white hover:bg-primary-hover"
                            : "bg-line/50 text-ink hover:bg-primary-soft",
                        )}
                      >
                        {c}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Bar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
