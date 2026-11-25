"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_SPEECH_RATE,
  VOICE_SAMPLE,
  chapterSpeechPlan,
  isSpeechRate,
  koreanVoices,
  nextSpokenVerse,
  pickKoreanVoice,
  prevSpokenVerse,
} from "@/lib/bible/speech";

/**
 * 성경 한 장 소리로 듣기 — 기기 내장 음성 합성(Web Speech API).
 *
 * 브라우저마다 다른 문제를 피하려고:
 * - 절(긴 절은 조각) 단위로 하나씩 읽는다: 긴 문장을 중간에 끊는 브라우저가 있고, 지금 읽는 절을 표시할 수 있다.
 * - 일시정지는 멈춘 뒤 그 조각부터 다시 읽는다: pause()/resume() 은 iOS·크롬에서 믿기 어렵다.
 * - 첫 재생은 반드시 버튼을 누를 때 시작한다(iOS 는 사용자 동작 없이 소리를 내지 않는다).
 * - 취소(cancel)하면 이전 문장의 끝/오류 이벤트가 늦게 오므로, 재생 차례(gen)로 지난 이벤트를 버린다.
 * - 읽는 동안 화면이 꺼지지 않게 한다(Wake Lock, 지원하는 기기만). 화면이 꺼지면 멈추는 기기가 있다.
 */

export type SpeechStatus = "idle" | "playing" | "paused" | "ended";
export type SpeechProblem = "no_korean_voice" | "blocked" | "failed";

const noopSubscribe = () => () => {};
function readSupported(): boolean {
  return (
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

/** 이 기기에서 듣기를 쓸 수 있는지 (서버 렌더링에서는 false → 버튼을 그리지 않는다) */
export function useSpeechSupported(): boolean {
  return useSyncExternalStore(noopSubscribe, readSupported, () => false);
}

/** 기기에 기억하는 작은 설정(속도·목소리). 글자 크기와 같은 방식 */
function localPref<T>(key: string, parse: (raw: string | null) => T) {
  const listeners = new Set<() => void>();
  return {
    read(): T {
      try {
        return parse(window.localStorage.getItem(key));
      } catch {
        return parse(null);
      }
    },
    write(value: string) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* 저장할 수 없는 환경: 이번 화면에서만 적용 */
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
  };
}

const ratePref = localPref("pt-bible-rate", (raw) => {
  const n = Number(raw);
  return isSpeechRate(n) ? n : DEFAULT_SPEECH_RATE;
});

/** 사용자가 고른 목소리(voiceURI). 없으면 null = 자동 */
const voicePref = localPref("pt-bible-voice", (raw) => (raw ? raw : null));

/* 기기의 한국어 음성 목록. 크롬은 비동기로 불러와 voiceschanged 로 알린다 */
const NO_VOICES: SpeechSynthesisVoice[] = [];
let voicesKey = "";
let voicesCache: SpeechSynthesisVoice[] = NO_VOICES;

function readKoreanVoices(): SpeechSynthesisVoice[] {
  if (!readSupported()) return NO_VOICES;
  const list = koreanVoices(window.speechSynthesis.getVoices());
  const key = list
    .map((v) => `${v.voiceURI}|${v.lang}|${v.default ? 1 : 0}`)
    .join(",");
  if (key !== voicesKey) {
    voicesKey = key;
    voicesCache = list;
  }
  return voicesCache;
}

function subscribeVoices(listener: () => void) {
  if (!readSupported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener?.("voiceschanged", listener);
  // voiceschanged 를 보내지 않는 브라우저 대비: 잠시 뒤 몇 번 다시 확인
  const timers = [300, 1500].map((ms) => window.setTimeout(listener, ms));
  return () => {
    synth.removeEventListener?.("voiceschanged", listener);
    timers.forEach((t) => window.clearTimeout(t));
  };
}

/** 이 기기의 한국어 음성들 (목소리 고르기 화면 순서) */
export function useKoreanVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(
    subscribeVoices,
    readKoreanVoices,
    () => NO_VOICES,
  );
}

/* "다음 장 듣기": 화면이 바뀐 뒤 그 장을 이어서 읽는다(같은 문서 안 이동이라 재생 허용이 유지된다) */
let listenOnArrival: string | null = null;

export function requestListenOnArrival(book: number, chapter: number) {
  listenOnArrival = `${book}:${chapter}`;
}

export function takeListenOnArrival(book: number, chapter: number): boolean {
  if (listenOnArrival !== `${book}:${chapter}`) return false;
  listenOnArrival = null;
  return true;
}

export function useChapterSpeech(
  verses: readonly string[] | null,
  options: {
    onProblem?: (problem: SpeechProblem) => void;
    onEnded?: () => void;
  } = {},
) {
  const supported = useSpeechSupported();
  const plan = useMemo(
    () => (verses ? chapterSpeechPlan(verses) : []),
    [verses],
  );
  const rate = useSyncExternalStore(
    ratePref.subscribe,
    ratePref.read,
    () => DEFAULT_SPEECH_RATE,
  );
  const voices = useKoreanVoices();
  const preferredVoice = useSyncExternalStore(
    voicePref.subscribe,
    voicePref.read,
    () => null,
  );
  const [status, setStatus] = useState<SpeechStatus>("idle");
  /** 지금(또는 멈춘 곳의) 절 — 0부터 */
  const [verse, setVerse] = useState<number | null>(null);
  const [problem, setProblem] = useState<SpeechProblem | null>(null);

  const gen = useRef(0);
  const pos = useRef({ verse: 0, chunk: 0 });
  const statusRef = useRef<SpeechStatus>("idle");
  const planRef = useRef(plan);
  const rateRef = useRef(rate);
  const voiceRef = useRef(preferredVoice);
  const optionsRef = useRef(options);
  // 크롬은 읽는 중인 문장 객체가 정리(GC)되면 끝 이벤트를 놓친다 → 붙잡아 둔다
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  useEffect(() => {
    voiceRef.current = preferredVoice;
  }, [preferredVoice]);
  useEffect(() => {
    optionsRef.current = options;
  });

  const changeStatus = useCallback((next: SpeechStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const releaseWake = useCallback(() => {
    const lock = wakeLock.current;
    wakeLock.current = null;
    lock?.release().catch(() => {});
  }, []);

  const holdWake = useCallback(async () => {
    if (wakeLock.current || !("wakeLock" in navigator)) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (statusRef.current !== "playing") {
        lock.release().catch(() => {});
        return;
      }
      wakeLock.current = lock;
      lock.addEventListener("release", () => {
        if (wakeLock.current === lock) wakeLock.current = null;
      });
    } catch {
      /* 배터리 절약 모드 등: 화면 유지 없이 읽는다 */
    }
  }, []);

  const report = useCallback((p: SpeechProblem) => {
    setProblem(p);
    optionsRef.current.onProblem?.(p);
  }, []);

  /** g 차례의 재생: from 절의 chunk 조각부터 끝까지 이어 읽는다 */
  const speakFrom = useCallback(
    (g: number, from: number, chunk: number) => {
      const synth = window.speechSynthesis;

      function speakChunk(at0: number, chunk0: number) {
        if (g !== gen.current) return;
        const p = planRef.current;
        const at = nextSpokenVerse(p, at0);
        if (at === null) {
          // 끝까지 읽었다
          gen.current += 1;
          pos.current = { verse: 0, chunk: 0 };
          releaseWake();
          setVerse(null);
          changeStatus("ended");
          optionsRef.current.onEnded?.();
          return;
        }
        const chunks = p[at] ?? [];
        const c = at === at0 && chunk0 < chunks.length ? chunk0 : 0;
        pos.current = { verse: at, chunk: c };
        setVerse(at);

        const u = new SpeechSynthesisUtterance(chunks[c] ?? "");
        applyVoice(u, voiceRef.current, rateRef.current);
        u.onend = () => {
          if (g !== gen.current) return;
          if (c + 1 < chunks.length) speakChunk(at, c + 1);
          else speakChunk(at + 1, 0);
        };
        u.onerror = (e) => {
          if (g !== gen.current) return;
          gen.current += 1;
          releaseWake();
          changeStatus("paused");
          if (e.error === "not-allowed") report("blocked");
          else if (
            e.error === "language-unavailable" ||
            e.error === "voice-unavailable"
          )
            report("no_korean_voice");
          // interrupted/canceled: 전화·다른 소리 등으로 기기가 멈춤 → 조용히 멈춤 상태로
          else if (e.error !== "interrupted" && e.error !== "canceled")
            report("failed");
        };
        utterance.current = u;
        if (synth.paused) synth.resume();
        synth.speak(u);
      }

      speakChunk(from, chunk);
    },
    [changeStatus, releaseWake, report],
  );

  const startAt = useCallback(
    (from: number, chunk = 0) => {
      const g = ++gen.current;
      window.speechSynthesis.cancel();
      setProblem(null);
      changeStatus("playing");
      void holdWake();
      speakFrom(g, from, chunk);
    },
    [changeStatus, holdWake, speakFrom],
  );

  /** 재생 (멈춘 상태면 멈춘 곳부터, 처음이면 from 절부터). 한국어 음성이 없으면 false */
  const play = useCallback(
    (from = 0): boolean => {
      if (!readSupported()) return false;
      const voices = window.speechSynthesis.getVoices();
      // 음성 목록이 아직 비어 있으면(불러오는 중) 일단 한국어로 읽어 본다
      if (voices.length > 0 && !pickKoreanVoice(voices)) {
        report("no_korean_voice");
        return false;
      }
      if (statusRef.current === "paused")
        startAt(pos.current.verse, pos.current.chunk);
      else startAt(from);
      return true;
    },
    [report, startAt],
  );

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") return;
    gen.current += 1;
    window.speechSynthesis.cancel();
    releaseWake();
    changeStatus("paused");
  }, [changeStatus, releaseWake]);

  const stop = useCallback(() => {
    gen.current += 1;
    if (readSupported()) window.speechSynthesis.cancel();
    releaseWake();
    pos.current = { verse: 0, chunk: 0 };
    setVerse(null);
    setProblem(null);
    changeStatus("idle");
  }, [changeStatus, releaseWake]);

  /** 이전·다음 절로. 읽는 중이면 그 절부터 이어 읽고, 멈춤이면 자리만 옮긴다 */
  const skip = useCallback(
    (delta: 1 | -1) => {
      const p = planRef.current;
      const cur = pos.current.verse;
      const target =
        delta > 0 ? nextSpokenVerse(p, cur + 1) : prevSpokenVerse(p, cur - 1);
      if (target === null) return;
      if (statusRef.current === "playing") {
        startAt(target);
      } else {
        pos.current = { verse: target, chunk: 0 };
        setVerse(target);
      }
    },
    [startAt],
  );

  /** 속도 바꾸기 — 읽는 중이면 지금 조각을 새 속도로 다시 읽는다 */
  const changeRate = useCallback(
    (next: number) => {
      ratePref.write(String(next));
      rateRef.current = next;
      if (statusRef.current === "playing")
        startAt(pos.current.verse, pos.current.chunk);
    },
    [startAt],
  );

  /** 목소리 바꾸기 — 읽는 중이면 지금 조각을 새 목소리로 다시 읽는다 */
  const changeVoice = useCallback(
    (voiceURI: string) => {
      voicePref.write(voiceURI);
      voiceRef.current = voiceURI;
      if (statusRef.current === "playing")
        startAt(pos.current.verse, pos.current.chunk);
    },
    [startAt],
  );

  /** 목소리 미리 듣기: 읽는 중이면 멈추고 샘플 한 문장만 읽는다 */
  const preview = useCallback(
    (voiceURI: string) => {
      if (!readSupported()) return;
      const synth = window.speechSynthesis;
      if (statusRef.current === "playing") pause();
      gen.current += 1;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(VOICE_SAMPLE);
      applyVoice(u, voiceURI, rateRef.current);
      utterance.current = u;
      if (synth.paused) synth.resume();
      synth.speak(u);
    },
    [pause],
  );

  useEffect(() => {
    if (!readSupported()) return;
    const synth = window.speechSynthesis;
    // 크롬은 처음 부를 때 음성 목록을 불러오기 시작한다 → 미리 불러 둔다
    synth.getVoices();

    function onVisibility() {
      if (
        document.visibilityState !== "visible" ||
        statusRef.current !== "playing"
      )
        return;
      if (!synth.speaking && !synth.pending) {
        // 화면이 꺼진 동안 기기가 읽기를 멈췄다 → 멈춤으로 보여 주고 이어 듣기를 기다린다
        gen.current += 1;
        releaseWake();
        changeStatus("paused");
      } else {
        // 화면 유지는 화면이 가려지면 풀린다 → 다시 잡는다
        void holdWake();
      }
    }
    function onPageHide() {
      gen.current += 1;
      synth.cancel();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // 다른 화면으로 가면 읽기를 멈춘다
      gen.current += 1;
      synth.cancel();
      releaseWake();
    };
  }, [changeStatus, holdWake, releaseWake]);

  const canPrev = verse !== null && prevSpokenVerse(plan, verse - 1) !== null;
  /** 실제로 쓰일 목소리 (고른 것이 없거나 사라졌으면 자동으로 고른 것) */
  const voiceURI = pickKoreanVoice(voices, preferredVoice)?.voiceURI ?? null;
  const canNext = verse !== null && nextSpokenVerse(plan, verse + 1) !== null;

  return {
    supported,
    status,
    verse,
    problem,
    rate,
    voices,
    voiceURI,
    canPrev,
    canNext,
    play,
    pause,
    stop,
    skip,
    changeRate,
    changeVoice,
    preview,
  };
}

/** 문장에 한국어 목소리·속도 지정 (한국어 음성 목록이 비어 있으면 언어만 지정) */
function applyVoice(
  u: SpeechSynthesisUtterance,
  preferredURI: string | null,
  rate: number,
) {
  const voice = pickKoreanVoice(
    window.speechSynthesis.getVoices(),
    preferredURI,
  );
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = "ko-KR";
  }
  u.rate = rate;
}

export type ChapterSpeech = ReturnType<typeof useChapterSpeech>;
