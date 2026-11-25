"use client";

import { useId } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";
import type { ChapterSpeech } from "./useChapterSpeech";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  )
    return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

const GUIDES: Record<Platform, { title: string; steps: string }> = {
  ios: {
    title: "아이폰·아이패드",
    steps:
      "설정 › 손쉬운 사용 › 읽기 및 말하기 › 음성 › 한국어에서 '향상된 음질'이 붙은 음성을 내려받은 뒤, 이 앱을 다시 열어 주세요.",
  },
  android: {
    title: "안드로이드",
    steps:
      "설정에서 '텍스트 음성 변환'을 찾아(기기마다 '일반' 또는 '접근성' 안에 있어요) 엔진을 'Google 음성 서비스'로 고르고, 음성 데이터 설치에서 한국어를 내려받아 주세요.",
  },
  desktop: {
    title: "컴퓨터",
    steps:
      "크롬·엣지에는 한국어 음성이 기본으로 들어 있어요. 윈도우는 설정 › 시간 및 언어 › 음성에서 한국어 음성을 더할 수 있어요.",
  },
};

/** 고음질 음성 받는 법 — 이 기기 안내를 먼저, 나머지는 접어 둔다 (열렸을 때만 그려져 navigator 를 읽는다) */
function VoiceGuide() {
  const platform = detectPlatform();
  const others = (Object.keys(GUIDES) as Platform[]).filter(
    (p) => p !== platform,
  );
  return (
    <section className="flex flex-col gap-2 rounded-card bg-canvas p-4">
      <h3 className="text-sm font-semibold text-ink">
        더 자연스러운 목소리로 듣고 싶다면
      </h3>
      <p className="text-[13px] leading-relaxed text-ink-soft">
        기기에 고음질 한국어 음성을 받으면 여기 목록에 나타나요. 무료예요.
      </p>
      <p className="text-[13px] leading-relaxed text-ink">
        <span className="font-semibold">{GUIDES[platform].title}</span>:{" "}
        {GUIDES[platform].steps}
      </p>
      <details className="text-[13px] leading-relaxed text-ink-soft">
        <summary className="cursor-pointer py-1">다른 기기 안내</summary>
        {others.map((p) => (
          <p key={p} className="mt-1">
            <span className="font-semibold text-ink">{GUIDES[p].title}</span>:{" "}
            {GUIDES[p].steps}
          </p>
        ))}
      </details>
    </section>
  );
}

/**
 * 듣기 목소리 고르기. 기기에 깔린 한국어 음성 중에서 고르고 미리 들어 본다.
 * 고른 목소리는 기기에 기억한다(다른 기기·브라우저에는 따로).
 */
export function VoiceSheet({
  open,
  onClose,
  speech,
}: {
  open: boolean;
  onClose: () => void;
  speech: ChapterSpeech;
}) {
  const titleId = useId();
  const { voices, voiceURI } = speech;

  function choose(uri: string) {
    if (uri === voiceURI) return;
    speech.changeVoice(uri);
    track("bible_voice_changed");
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId}>
      <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto px-5 pb-6 pt-5">
        <div className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden />
        <div>
          <h2 id={titleId} className="text-base font-semibold text-ink">
            목소리
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            이 기기에 있는 한국어 음성으로 읽어요.
          </p>
        </div>

        {voices.length === 0 ? (
          <p className="rounded-card border border-line px-4 py-3 text-[15px] text-ink">
            이 기기에서 쓸 수 있는 한국어 음성을 찾지 못했어요.
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">읽을 목소리</legend>
            {voices.map((v) => {
              const selected = v.voiceURI === voiceURI;
              const tags = [
                v.default && "기기 기본",
                !v.localService && "인터넷 필요",
              ].filter(Boolean);
              return (
                <div
                  key={v.voiceURI}
                  className={cn(
                    "flex min-h-[56px] items-center gap-2 rounded-card border pr-2 transition-colors",
                    selected
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-surface",
                  )}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 self-stretch py-2 pl-4">
                    <input
                      type="radio"
                      name="bible-voice"
                      value={v.voiceURI}
                      checked={selected}
                      onChange={() => choose(v.voiceURI)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] text-ink">
                        {v.name || v.lang}
                      </span>
                      {tags.length > 0 && (
                        <span className="block text-[12px] text-ink-soft">
                          {tags.join(" · ")}
                        </span>
                      )}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => speech.preview(v.voiceURI)}
                    aria-label={`${v.name || v.lang} 들어보기`}
                    className="flex h-10 shrink-0 items-center gap-1 rounded-pill px-3 text-[13px] font-medium text-primary hover:bg-primary/10"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M8 5.5v13a1 1 0 001.5.86l10.2-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z"
                        fill="currentColor"
                      />
                    </svg>
                    들어보기
                  </button>
                </div>
              );
            })}
          </fieldset>
        )}

        <VoiceGuide />

        <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
          닫기
        </Button>
      </div>
    </Modal>
  );
}
