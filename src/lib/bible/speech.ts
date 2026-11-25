/**
 * 성경 듣기(TTS) — 순수 함수.
 * 기기에 내장된 음성 합성(Web Speech API)으로 읽기 때문에 서버·비용이 들지 않는다.
 * 본문은 그대로 두고(동일성유지권) "읽을 문장"만 만든다: 괄호 기호를 빼고, 빈 절 표시는 건너뛴다.
 */

/** 재생 속도 단계 (기기에 기억한다) */
export const SPEECH_RATES = [0.8, 1, 1.2, 1.5] as const;
export const DEFAULT_SPEECH_RATE = 1;

export function speechRateLabel(rate: number): string {
  return `${rate === 1 ? "1.0" : String(rate)}배`;
}

/** 다음 속도 (마지막이면 처음으로) */
export function nextSpeechRate(rate: number): number {
  const i = SPEECH_RATES.findIndex((r) => r === rate);
  return SPEECH_RATES[(i + 1) % SPEECH_RATES.length] ?? DEFAULT_SPEECH_RATE;
}

export function isSpeechRate(n: number): boolean {
  return SPEECH_RATES.some((r) => r === n);
}

/** "(없음)", "(3절에 포함되어 있음)" 처럼 본문이 없는 절 */
const PLACEHOLDER_VERSE = /^\s*\((?:없음|\d+절에 포함되어 있음)\)\s*$/;

/**
 * 소리로 읽을 문장. 읽을 것이 없는 절이면 null.
 * 괄호·낫표 기호는 음성 엔진에 따라 "괄호"라고 읽히기도 해서 뺀다(내용은 그대로).
 */
export function speechText(verse: string): string | null {
  if (PLACEHOLDER_VERSE.test(verse)) return null;
  const text = verse
    .replace(/[[\]「」()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text : null;
}

/** 한 번에 읽을 최대 길이. 일부 브라우저(데스크톱 크롬의 온라인 음성)는 긴 문장을 중간에 끊는다. */
export const SPEECH_CHUNK_MAX = 100;

/** 이어지는 말(연결 어미)로 끝나는 어절 — 여기서 끊으면 자연스럽다 */
const SOFT_BREAK = /(?:[,.!?]|[고며니매서면요라다])$/;

/**
 * 긴 절을 자연스러운 곳(쉼표, 연결 어미)에서 나눈다. 짧은 절은 그대로 한 조각.
 * 나눈 조각을 이어 붙이면 원문과 같다(공백 하나 차이).
 */
export function speechChunks(
  text: string,
  max: number = SPEECH_CHUNK_MAX,
): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= max) return [t];

  const words = t.split(" ");
  // 가운데에 가장 가까운 "자연스러운" 끊는 곳, 없으면 가운데에 가장 가까운 띄어쓰기
  const target = t.length / 2;
  let best = -1;
  let bestScore = Infinity;
  let pos = 0;
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i] ?? "";
    pos += word.length;
    const distance = Math.abs(pos - target);
    const score = SOFT_BREAK.test(word) ? distance : distance + max;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
    pos += 1; // 띄어쓰기
  }
  if (best < 0) {
    // 띄어쓰기가 없는 아주 긴 덩어리: 글자 수로 자른다
    return [t.slice(0, max), ...speechChunks(t.slice(max), max)];
  }
  return [
    ...speechChunks(words.slice(0, best + 1).join(" "), max),
    ...speechChunks(words.slice(best + 1).join(" "), max),
  ];
}

/** 절 목록 → 절마다 읽을 조각들 (읽을 것이 없는 절은 빈 배열) */
export function chapterSpeechPlan(verses: readonly string[]): string[][] {
  return verses.map((v) => {
    const text = speechText(v);
    return text ? speechChunks(text) : [];
  });
}

/** 다음에 읽을 절 (빈 절은 건너뜀). 없으면 null */
export function nextSpokenVerse(
  plan: readonly string[][],
  from: number,
): number | null {
  for (let i = Math.max(0, from); i < plan.length; i++) {
    if ((plan[i]?.length ?? 0) > 0) return i;
  }
  return null;
}

/** 이전에 읽을 절 (빈 절은 건너뜀). 없으면 null */
export function prevSpokenVerse(
  plan: readonly string[][],
  from: number,
): number | null {
  for (let i = Math.min(plan.length - 1, from); i >= 0; i--) {
    if ((plan[i]?.length ?? 0) > 0) return i;
  }
  return null;
}

/** 음성 정보 중 고르는 데 필요한 것만 (테스트하기 쉽게) */
export type VoiceLike = {
  lang: string;
  name: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
};

export function isKoreanVoice(v: Pick<VoiceLike, "lang">): boolean {
  return /^ko(?:[-_]|$)/i.test(v.lang);
}

/**
 * 한국어 음성 고르기: 사용자가 고른 음성 → 기기 기본 음성 → 기기 안 음성(오프라인에서도 됨)
 * → 아무 한국어 음성. 한국어 음성이 없으면 null.
 * 고른 음성이 기기에서 사라졌으면(삭제·다른 기기) 자동으로 고른다.
 */
export function pickKoreanVoice<V extends VoiceLike>(
  voices: readonly V[],
  preferredURI?: string | null,
): V | null {
  const ko = voices.filter(isKoreanVoice);
  return (
    (preferredURI ? ko.find((v) => v.voiceURI === preferredURI) : undefined) ??
    ko.find((v) => v.default) ??
    ko.find((v) => v.localService) ??
    ko[0] ??
    null
  );
}

/** 목소리 고르기 화면에 보일 한국어 음성: 기기 기본 → 기기 안 음성 → 이름순 (같은 음성은 한 번만) */
export function koreanVoices<V extends VoiceLike>(voices: readonly V[]): V[] {
  const seen = new Set<string>();
  const rank = (v: V) => (v.default ? 0 : v.localService ? 1 : 2);
  return voices
    .filter((v) => {
      if (!isKoreanVoice(v) || seen.has(v.voiceURI)) return false;
      seen.add(v.voiceURI);
      return true;
    })
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "ko"));
}

/** 미리 듣기 문장 */
export const VOICE_SAMPLE = "태초에 하나님이 천지를 창조하시니라";
