"use client";

import { nextSpeechRate, speechRateLabel } from "@/lib/bible/speech";
import type { ChapterSpeech, SpeechProblem } from "./useChapterSpeech";

export const SPEECH_PROBLEM_MESSAGE: Record<SpeechProblem, string> = {
  no_korean_voice:
    "이 기기에 한국어 음성이 없어요. 휴대폰 설정의 '텍스트 음성 변환'(아이폰은 손쉬운 사용 › 읽기 및 말하기)에서 한국어 음성을 받아 주세요.",
  blocked: "재생 버튼을 눌러 이어 들어 주세요.",
  failed: "소리를 내지 못했어요. 재생 버튼을 다시 눌러 주세요.",
};

function Icon({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d={d}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PLAY =
  "M8 5.5v13a1 1 0 001.5.86l10.2-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z";
const PAUSE = "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z";
const REPLAY = "M4 12a8 8 0 108-8 8.2 8.2 0 00-5.7 2.3L4 8.5M4 4v4.5h4.5";
const PREV = "M15 6l-6 6 6 6";
const NEXT = "M9 6l6 6-6 6";
const CLOSE = "M6 6l12 12M18 6L6 18";

const iconButton =
  "flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-line/50 hover:text-ink disabled:opacity-30";

/**
 * 듣기 조절 막대 — 하단 메뉴 바로 위에 떠 있다.
 * 끝까지 들으면 '다 읽었어요' 기록과 다음 장 듣기를 권한다(자동으로 기록하지 않는다).
 */
export function ListenBar({
  speech,
  totalVerses,
  endedNote,
  endActions,
}: {
  speech: ChapterSpeech;
  totalVerses: number;
  /** 끝까지 들었을 때 안내 문구 */
  endedNote: string;
  /** 끝까지 들었을 때 보여 줄 버튼들 */
  endActions?: React.ReactNode;
}) {
  const { status, verse, problem, rate } = speech;
  const ended = status === "ended";
  const playing = status === "playing";
  const current = verse === null ? 0 : verse + 1;
  const progress = ended
    ? 100
    : totalVerses > 0
      ? (current / totalVerses) * 100
      : 0;

  return (
    <div
      role="region"
      aria-label="성경 듣기"
      // 하단 메뉴(약 62px) 바로 위. 막대 아래 틈으로 본문이 비치지 않게 배경을 깔고, 위쪽은 부드럽게 흐린다
      className="fixed inset-x-0 z-40 mx-auto max-w-app bg-gradient-to-t from-canvas via-canvas to-transparent px-3 pb-2 pt-3"
      style={{ bottom: "calc(62px + env(safe-area-inset-bottom))" }}
    >
      <div className="card overflow-hidden shadow-pop">
        <div className="h-1 bg-line" aria-hidden>
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-0.5 py-2 pl-2 pr-1">
          <button
            type="button"
            onClick={() => (playing ? speech.pause() : speech.play(0))}
            aria-label={
              playing ? "일시정지" : ended ? "처음부터 다시 듣기" : "이어 듣기"
            }
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover"
          >
            <Icon d={playing ? PAUSE : ended ? REPLAY : PLAY} filled={!ended} />
          </button>

          <div className="min-w-0 flex-1 px-2" aria-live="polite">
            {ended ? (
              <>
                <p className="text-[15px] font-semibold text-ink">
                  끝까지 들었어요
                </p>
                <p className="text-[12px] leading-snug text-ink-soft">
                  {endedNote}
                </p>
              </>
            ) : (
              <>
                <p className="truncate text-[15px] font-semibold tabular-nums text-ink">
                  {current}절
                  <span className="hidden text-[13px] font-normal text-ink-soft min-[360px]:inline">
                    {" "}
                    / {totalVerses}
                  </span>
                </p>
                <p className="truncate text-[12px] text-ink-soft">
                  {playing ? "읽는 중" : "멈춤"}
                </p>
              </>
            )}
          </div>

          {!ended && (
            <>
              <button
                type="button"
                onClick={() => speech.skip(-1)}
                disabled={!speech.canPrev}
                aria-label="이전 절"
                className={iconButton}
              >
                <Icon d={PREV} />
              </button>
              <button
                type="button"
                onClick={() => speech.skip(1)}
                disabled={!speech.canNext}
                aria-label="다음 절"
                className={iconButton}
              >
                <Icon d={NEXT} />
              </button>
              <button
                type="button"
                onClick={() => speech.changeRate(nextSpeechRate(rate))}
                aria-label={`읽는 속도 ${speechRateLabel(rate)}, 눌러서 바꾸기`}
                className="mx-0.5 flex h-9 min-w-[48px] shrink-0 items-center justify-center rounded-pill border border-line px-1.5 text-[13px] font-semibold tabular-nums text-ink hover:border-primary/40"
              >
                {speechRateLabel(rate)}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={speech.stop}
            aria-label="듣기 닫기"
            className={iconButton}
          >
            <Icon d={CLOSE} />
          </button>
        </div>
        {problem && (
          <p
            role="status"
            className="px-3 pb-3 text-[13px] leading-snug text-ink"
          >
            {SPEECH_PROBLEM_MESSAGE[problem]}
          </p>
        )}
        {ended && endActions && (
          <div className="flex gap-2 px-3 pb-3">{endActions}</div>
        )}
      </div>
    </div>
  );
}
