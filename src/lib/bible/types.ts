/** 오늘의 말씀 한 구절(또는 연속 구절 묶음). */
export type Verse = {
  book: string; // "요한복음"
  chapter: number;
  verseStart: number;
  verseEnd: number; // 단일 구절이면 verseStart 와 같다
  text: string; // 개역한글 본문 (연속 구절은 공백으로 이어붙임)
};
