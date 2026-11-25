"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";
import { bookName, chapterUnit } from "@/lib/bible/books";
import {
  BIBLE_TEXT_SOURCE,
  chapterDataUrl,
  chapterHref,
  nextChapterOrNull,
  prevChapter,
  type ChapterText,
} from "@/lib/bible/text";
import { setChapterReadToday } from "./actions";
import { ListenBar, SPEECH_PROBLEM_MESSAGE } from "./ListenBar";
import { VoiceSheet } from "./VoiceSheet";
import {
  requestListenOnArrival,
  takeListenOnArrival,
  useChapterSpeech,
} from "./useChapterSpeech";

/** 글자 크기 단계 (px). 기기에만 기억한다. */
const FONT_SIZES = [16, 18, 20, 23] as const;
const FONT_KEY = "pt-bible-font";
const DEFAULT_FONT = 1;

/** 글자 크기 설정: localStorage 를 작은 외부 저장소로 다룬다 (화면 간 공유) */
const fontListeners = new Set<() => void>();

function readFontStep(): number {
  try {
    const raw = window.localStorage.getItem(FONT_KEY);
    const n = raw === null ? DEFAULT_FONT : Number(raw);
    return Number.isInteger(n) && n >= 0 && n < FONT_SIZES.length ? n : DEFAULT_FONT;
  } catch {
    return DEFAULT_FONT;
  }
}

function writeFontStep(step: number) {
  try {
    window.localStorage.setItem(FONT_KEY, String(step));
  } catch {
    /* 저장할 수 없는 환경: 기본 크기 유지 */
  }
  fontListeners.forEach((l) => l());
}

function subscribeFont(listener: () => void) {
  fontListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    fontListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** 주소의 #v<n> → 절 번호 */
function hashVerse(max: number): number | null {
  const m = /^#v(\d+)$/.exec(window.location.hash);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= max ? n : null;
}

type Load =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; verses: string[] };

/**
 * 성경 한 장 읽기.
 * - 본문은 정적 JSON(개역한글)을 받아 그린다. 서비스워커가 한 번 읽은 장을 보관해 오프라인에서도 열린다.
 * - 맨 아래 "이 장 다 읽었어요"는 홈의 '오늘 읽은 곳'·통독 현황과 같은 기록에 더해진다.
 * - #v16 처럼 절 번호가 주소에 있으면 그 절로 이동해 잠시 표시한다(오늘의 말씀에서 들어올 때).
 * - "소리로 듣기": 기기 내장 음성으로 절마다 읽고, 읽는 절을 표시한다(useChapterSpeech).
 */
export function ChapterReader({
  book,
  chapter,
  recordAvailable,
  initialReadToday,
  readBefore,
}: {
  book: number;
  chapter: number;
  recordAvailable: boolean;
  initialReadToday: boolean;
  readBefore: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const fontStep = useSyncExternalStore(subscribeFont, readFontStep, () => DEFAULT_FONT);
  const [readToday, setReadToday] = useState(initialReadToday);
  const [focusVerse, setFocusVerse] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [voiceOpen, setVoiceOpen] = useState(false);

  const speech = useChapterSpeech(load.state === "ready" ? load.verses : null, {
    onProblem: (p) => {
      if (p === "no_korean_voice") toast.show(SPEECH_PROBLEM_MESSAGE[p], "error");
    },
    onEnded: () => track("bible_listen_completed"),
  });
  const listening = speech.status !== "idle";

  const unit = chapterUnit(book);
  const title = `${bookName(book)} ${chapter}${unit}`;
  const prev = prevChapter({ book, chapter });
  const next = nextChapterOrNull({ book, chapter });

  const fetchText = useCallback(() => {
    fetch(chapterDataUrl(book, chapter))
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<ChapterText>;
      })
      .then((data) => {
        setLoad({ state: "ready", verses: data.v });
        setFocusVerse(hashVerse(data.v.length));
      })
      .catch(() => setLoad({ state: "error" }));
  }, [book, chapter]);

  useEffect(() => {
    fetchText();
  }, [fetchText]);

  // 주소에 절 번호(#v16)가 있으면 그 절로 이동해 잠시 표시
  useEffect(() => {
    if (focusVerse === null) return;
    document.getElementById(`v${focusVerse}`)?.scrollIntoView({ block: "center" });
    const t = window.setTimeout(() => setFocusVerse(null), 4000);
    return () => window.clearTimeout(t);
  }, [focusVerse]);

  // 이용 통계: 장을 연 횟수 (듣기 비율의 기준)
  useEffect(() => {
    if (load.state === "ready") track("bible_chapter_opened");
  }, [load.state]);

  // "다음 장 듣기"로 들어왔으면 본문이 준비되는 대로 이어서 읽는다
  const { play } = speech;
  useEffect(() => {
    if (load.state !== "ready") return;
    if (takeListenOnArrival(book, chapter)) play(0);
  }, [load.state, book, chapter, play]);

  // 읽는 절이 화면 밖이면 따라간다 (직접 스크롤해 둔 곳은 화면 안에 있으면 그대로 둔다)
  useEffect(() => {
    if (speech.status !== "playing" || speech.verse === null) return;
    const el = document.getElementById(`v${speech.verse + 1}`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const visibleTop = 64; // 상단 제목줄
    const visibleBottom = window.innerHeight - 150; // 듣기 막대 + 하단 메뉴
    if (r.top < visibleTop || r.bottom > visibleBottom) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
  }, [speech.status, speech.verse]);

  function startListening() {
    if (speech.play(0)) track("bible_listen_started", { from: "button" });
  }

  function listenNext() {
    if (!next) return;
    requestListenOnArrival(next.book, next.chapter);
    track("bible_listen_started", { from: "next" });
    router.push(chapterHref(next.book, next.chapter));
  }

  /** 읽는 중에 이전·다음 장으로 넘어가면 그 장도 이어서 읽는다 */
  function keepListening(to: { book: number; chapter: number }) {
    if (speech.status === "playing") requestListenOnArrival(to.book, to.chapter);
  }

  function retry() {
    setLoad({ state: "loading" });
    fetchText();
  }

  function changeFont(delta: number) {
    writeFontStep(Math.min(FONT_SIZES.length - 1, Math.max(0, fontStep + delta)));
  }

  function setRead(read: boolean) {
    startTransition(async () => {
      const res = await setChapterReadToday(book, chapter, read);
      if (!res.ok) {
        toast.show(res.message, "error");
        return;
      }
      setReadToday(read);
      if (read) {
        track("bible_reading_recorded", { from: "reader" });
        toast.show(`${title}을 오늘 읽은 곳에 기록했어요.`);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        backHref="/bible"
        right={
          <div className="flex items-center gap-1" role="group" aria-label="글자 크기">
            <button
              type="button"
              onClick={() => changeFont(-1)}
              disabled={fontStep === 0}
              aria-label="글자 작게"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-ink-soft hover:bg-line/50 disabled:opacity-40"
            >
              가
            </button>
            <button
              type="button"
              onClick={() => changeFont(1)}
              disabled={fontStep === FONT_SIZES.length - 1}
              aria-label="글자 크게"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[18px] font-semibold text-ink hover:bg-line/50 disabled:opacity-40"
            >
              가
            </button>
          </div>
        }
      />

      {load.state === "loading" && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="본문을 불러오는 중">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className={cn("h-5", i % 3 === 2 ? "w-2/3" : "w-full")} />
          ))}
        </div>
      )}

      {load.state === "error" && (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-[15px] text-ink">본문을 불러오지 못했어요.</p>
          <p className="text-sm text-ink-soft">인터넷 연결을 확인한 뒤 다시 시도해 주세요.</p>
          <Button variant="secondary" onClick={retry}>
            다시 불러오기
          </Button>
        </div>
      )}

      {load.state === "ready" && speech.supported && (
        <div className="-mt-1 flex">
          {listening ? (
            <p className="inline-flex min-h-[40px] items-center gap-1.5 rounded-pill bg-primary-soft px-3.5 text-[14px] font-medium text-primary">
              <SpeakerIcon />
              {speech.status === "ended" ? "끝까지 들었어요" : "소리로 듣는 중"}
            </p>
          ) : (
            <button
              type="button"
              onClick={startListening}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-pill border border-line bg-surface px-3.5 text-[14px] font-medium text-ink hover:border-primary/40"
            >
              <SpeakerIcon />
              소리로 듣기
            </button>
          )}
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="ml-1 inline-flex min-h-[40px] items-center rounded-pill px-3 text-[14px] text-ink-soft hover:bg-line/50 hover:text-ink"
          >
            목소리
          </button>
        </div>
      )}
      {speech.supported && (
        <VoiceSheet open={voiceOpen} onClose={() => setVoiceOpen(false)} speech={speech} />
      )}

      {load.state === "ready" && (
        <article
          lang="ko"
          className="flex flex-col gap-2 break-keep text-ink"
          style={{ fontSize: FONT_SIZES[fontStep], lineHeight: 1.85 }}
        >
          {load.verses.map((text, i) => {
            const n = i + 1;
            return (
              <p
                key={n}
                id={`v${n}`}
                aria-current={speech.verse === i ? "true" : undefined}
                className={cn(
                  "scroll-mt-20 rounded-lg px-1 transition-colors duration-700",
                  focusVerse === n && "bg-primary-soft",
                  // 지금 읽는 절: 소리를 따라 눈으로 찾기 쉽게 조금 더 진하게
                  speech.verse === i && "bg-primary/15 duration-200",
                )}
              >
                <sup className="mr-1.5 select-none text-[0.62em] font-semibold text-primary">
                  {n}
                </sup>
                {text}
              </p>
            );
          })}
        </article>
      )}

      {load.state === "ready" && recordAvailable && (
        <section className="mt-2 flex flex-col items-center gap-2">
          {readToday ? (
            <>
              <p className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-card bg-primary-soft text-base font-semibold text-primary">
                <span aria-hidden>✓</span> 오늘 읽은 곳에 기록했어요
              </p>
              <button
                type="button"
                onClick={() => setRead(false)}
                disabled={pending}
                className="px-2 py-1 text-[13px] text-ink-soft underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
              >
                기록 취소
              </button>
            </>
          ) : (
            <>
              <Button size="lg" fullWidth loading={pending} onClick={() => setRead(true)}>
                이 {unit} 다 읽었어요
              </Button>
              {readBefore && (
                <p className="text-[13px] text-ink-soft">전에도 읽은 {unit}이에요.</p>
              )}
            </>
          )}
        </section>
      )}

      {load.state !== "loading" && (
        <nav aria-label="장 이동" className="mt-2 flex gap-2">
          {prev ? (
            <Link
              href={chapterHref(prev.book, prev.chapter)}
              onClick={() => keepListening(prev)}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-1 rounded-card border border-line bg-surface px-3 text-[15px] text-ink hover:border-primary/40"
            >
              <span aria-hidden>‹</span>
              {bookName(prev.book)} {prev.chapter}
              {chapterUnit(prev.book)}
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              href={chapterHref(next.book, next.chapter)}
              onClick={() => keepListening(next)}
              className={cn(
                "flex min-h-[48px] flex-1 items-center justify-center gap-1 rounded-card px-3 text-[15px] font-semibold",
                readToday
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "border border-line bg-surface text-ink hover:border-primary/40",
              )}
            >
              {bookName(next.book)} {next.chapter}
              {chapterUnit(next.book)}
              <span aria-hidden>›</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>
      )}

      <p className="pb-2 pt-2 text-center text-[12px] text-ink-soft/80">{BIBLE_TEXT_SOURCE}</p>

      {listening && load.state === "ready" && (
        <>
          {/* 듣기 막대에 가려지지 않게 아래 여백 */}
          <div aria-hidden className={speech.status === "ended" ? "h-36" : "h-20"} />
          <ListenBar
            speech={speech}
            totalVerses={load.verses.length}
            endedNote={
              readToday
                ? "오늘 읽은 곳에 기록돼 있어요."
                : recordAvailable
                  ? "들은 것도 읽은 거예요. 원하면 기록해 두세요."
                  : "수고하셨어요."
            }
            endActions={
              (recordAvailable && !readToday) || next ? (
                <>
                  {recordAvailable && !readToday && (
                    <Button
                      variant="secondary"
                      className="flex-1"
                      loading={pending}
                      onClick={() => setRead(true)}
                    >
                      다 읽었어요
                    </Button>
                  )}
                  {next && (
                    <Button className="flex-1" onClick={listenNext}>
                      {bookName(next.book)} {next.chapter}
                      {chapterUnit(next.book)} 듣기
                    </Button>
                  )}
                </>
              ) : undefined
            }
          />
        </>
      )}
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
