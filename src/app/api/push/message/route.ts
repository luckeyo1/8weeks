import { NextResponse } from "next/server";
import { getAuthUser } from "@/features/auth/service";
import { appTodayISO } from "@/lib/date";
import { formatVerseRef, pickDailyVerse } from "@/lib/bible/daily";
import { countPendingPrayers } from "@/services/reminder";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** 알림 문구가 너무 길면 잠금화면에서 잘리므로 줄인다 */
function clip(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * 서비스워커가 (데이터 없는) 푸시를 받은 뒤 알림 문구를 가져가는 곳.
 * 푸시 서비스(구글·애플)를 거치지 않고, 로그인 세션으로 우리 서버에서 직접 받는다.
 * 기도 제목·내용은 잠금화면에 보이지 않게 넣지 않는다(개수와 공개된 성경 구절만).
 */
export async function GET(): Promise<Response> {
  const uid = await getAuthUser();
  if (!uid) {
    return NextResponse.json(
      {
        title: "기도 동행",
        body: "오늘의 말씀과 함께 기도할 제목을 확인해 보세요.",
        url: "/home",
      },
      { headers: NO_STORE },
    );
  }

  const today = appTodayISO();
  const verse = pickDailyVerse(today);
  const ref = formatVerseRef(verse);
  const pending = await countPendingPrayers(uid, today);

  const message =
    pending > 0
      ? {
          title: "오늘의 기도",
          body: `함께 기도할 제목이 ${pending}개 있어요 · 오늘의 말씀 ${ref}`,
        }
      : { title: `오늘의 말씀 · ${ref}`, body: clip(verse.text) };

  return NextResponse.json({ ...message, url: "/home" }, { headers: NO_STORE });
}
