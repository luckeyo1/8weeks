import { describe, expect, it } from "vitest";
import {
  SPEECH_CHUNK_MAX,
  chapterSpeechPlan,
  isKoreanVoice,
  nextSpeechRate,
  nextSpokenVerse,
  pickKoreanVoice,
  prevSpokenVerse,
  speechChunks,
  speechRateLabel,
  speechText,
  type VoiceLike,
} from "./speech";

describe("speechText", () => {
  it("본문은 그대로, 괄호·낫표 기호만 뺀다", () => {
    expect(speechText("여호와는 나의 목자시니 내가 부족함이 없으리로다")).toBe(
      "여호와는 나의 목자시니 내가 부족함이 없으리로다",
    );
    expect(speechText("축복하실 때에 저희를 떠나 [하늘로 올리우]시니")).toBe(
      "축복하실 때에 저희를 떠나 하늘로 올리우 시니",
    );
    expect(speechText("내가 너를 구원하리라 (셀라)")).toBe(
      "내가 너를 구원하리라 셀라",
    );
    expect(speechText("「여호와여」 하니")).toBe("여호와여 하니");
  });

  it("본문이 없는 절 표시는 건너뛴다", () => {
    expect(speechText("(없음)")).toBeNull();
    expect(speechText("(12절에 포함되어 있음)")).toBeNull();
    expect(speechText("  ")).toBeNull();
  });

  it("괄호 안 본문만 있는 절은 읽는다", () => {
    expect(
      speechText("(예수께서 친히 세례를 주신 것이 아니요 제자들이 준 것이라)"),
    ).toBe("예수께서 친히 세례를 주신 것이 아니요 제자들이 준 것이라");
  });
});

describe("speechChunks", () => {
  it("짧은 절은 한 조각", () => {
    expect(speechChunks("태초에 하나님이 천지를 창조하시니라")).toEqual([
      "태초에 하나님이 천지를 창조하시니라",
    ]);
    expect(speechChunks("")).toEqual([]);
  });

  it("긴 절은 최대 길이 안으로, 자연스러운 곳에서 나누고 내용은 그대로", () => {
    const long =
      "르바임 족속의 남은 자는 바산 왕 옥뿐이었으며 그의 침상은 철 침상이라 지금 오히려 암몬 족속의 랍바에 있지 아니하냐 그것을 사람의 보통 규빗으로 재면 그 장이 아홉 규빗이요 광이 네 규빗이니라";
    const chunks = speechChunks(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks)
      expect(c.length).toBeLessThanOrEqual(SPEECH_CHUNK_MAX);
    expect(chunks.join(" ")).toBe(long);
    // 첫 조각은 연결 어미에서 끝난다
    expect(chunks[0]).toMatch(/[고며니매서면요라다,.!?]$/);
  });

  it("띄어쓰기 없는 긴 덩어리도 자른다", () => {
    const chunks = speechChunks("가".repeat(250), 100);
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
  });
});

describe("chapterSpeechPlan / 다음·이전 절", () => {
  const plan = chapterSpeechPlan([
    "첫째 절",
    "(없음)",
    "셋째 절",
    "(3절에 포함되어 있음)",
  ]);

  it("빈 절은 빈 배열", () => {
    expect(plan).toEqual([["첫째 절"], [], ["셋째 절"], []]);
  });

  it("빈 절을 건너뛰어 다음·이전 절을 찾는다", () => {
    expect(nextSpokenVerse(plan, 0)).toBe(0);
    expect(nextSpokenVerse(plan, 1)).toBe(2);
    expect(nextSpokenVerse(plan, 3)).toBeNull();
    expect(prevSpokenVerse(plan, 1)).toBe(0);
    expect(prevSpokenVerse(plan, 3)).toBe(2);
    expect(prevSpokenVerse(plan, -1)).toBeNull();
  });
});

describe("속도", () => {
  it("순서대로 돌고 처음으로 돌아온다", () => {
    expect(nextSpeechRate(1)).toBe(1.2);
    expect(nextSpeechRate(1.5)).toBe(0.8);
    expect(nextSpeechRate(3)).toBe(0.8);
    expect(speechRateLabel(1)).toBe("1.0배");
    expect(speechRateLabel(1.2)).toBe("1.2배");
  });
});

describe("한국어 음성 고르기", () => {
  const v = (
    lang: string,
    name: string,
    extra: Partial<VoiceLike> = {},
  ): VoiceLike => ({
    lang,
    name,
    default: false,
    localService: false,
    voiceURI: name,
    ...extra,
  });

  it("ko-KR, ko_KR(안드로이드), ko 를 한국어로 본다", () => {
    expect(isKoreanVoice(v("ko-KR", "a"))).toBe(true);
    expect(isKoreanVoice(v("ko_KR", "a"))).toBe(true);
    expect(isKoreanVoice(v("ko", "a"))).toBe(true);
    expect(isKoreanVoice(v("kok-IN", "a"))).toBe(false);
    expect(isKoreanVoice(v("en-US", "a"))).toBe(false);
  });

  it("기본 음성 → 기기 안 음성 → 아무 한국어 음성 순", () => {
    const en = v("en-US", "English", { default: true, localService: true });
    const remote = v("ko-KR", "Google 한국의");
    const local = v("ko-KR", "Yuna", { localService: true });
    const def = v("ko-KR", "Default", { default: true });
    expect(pickKoreanVoice([en, remote, local, def])?.name).toBe("Default");
    expect(pickKoreanVoice([en, remote, local])?.name).toBe("Yuna");
    expect(pickKoreanVoice([en, remote])?.name).toBe("Google 한국의");
    expect(pickKoreanVoice([en])).toBeNull();
    expect(pickKoreanVoice([])).toBeNull();
  });
});
