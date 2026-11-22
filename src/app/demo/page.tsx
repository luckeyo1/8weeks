import type { Metadata } from "next";
import { DemoExperience } from "@/features/demo/DemoExperience";
import { VERSES } from "@/lib/bible/verses";
import { VERSE_TRANSLATION, formatVerseRef } from "@/lib/bible/daily";
import { formatReading, todaysReading } from "@/lib/bible/plan";

export const metadata: Metadata = {
  title: "체험해보기",
  description: "가입 전에 기도 동행의 '오늘의 기도' 화면을 직접 체험해보세요.",
};

/** 체험 화면은 정적 페이지라 날짜별 구절 대신 고정 예시 구절을 보여준다 (빌 4:6-7). */
const sampleVerse =
  VERSES.find(
    (v) => v.book === "빌립보서" && v.chapter === 4 && v.verseStart === 6,
  ) ?? VERSES[0]!;

/** 읽기표도 고정 예시: 1년 1독 첫날 (창세기 1–3장) */
const samplePlan = formatReading(todaysReading("2026-01-01"));

export default function DemoPage() {
  return (
    <main className="app-shell">
      <DemoExperience
        verse={{
          text: sampleVerse.text,
          reference: formatVerseRef(sampleVerse),
          translation: VERSE_TRANSLATION,
        }}
        plan={samplePlan}
      />
    </main>
  );
}
