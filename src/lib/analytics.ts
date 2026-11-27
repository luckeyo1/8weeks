/**
 * 분석 이벤트 (명세 56).
 *
 * 개인을 알 수 없는 "기능별 하루 사용 횟수"만 우리 서버(/api/track)에 센다.
 * - 이벤트 이름만 보낸다. 기도 id·내용 등 속성(props)은 서버로 보내지 않는다.
 * - 서버는 누가 보냈는지 저장하지 않고 (날짜, 이벤트) 합계만 올린다 → 관리자 › 이용 통계.
 * - window.__analytics 가 있으면 그쪽에도 넘기고, 개발 환경에서는 콘솔에도 남긴다.
 */

/** 서버가 받는 이벤트 허용 목록 (서버·화면 공용) */
export const ANALYTICS_EVENTS = [
  "signup_completed",
  "prayer_created",
  "prayer_share_opened",
  "prayer_qr_opened",
  "prayer_joined",
  "prayer_checked",
  "prayer_extended",
  "prayer_updated",
  "prayer_answered",
  "prayer_closed",
  "bible_reading_recorded",
  "bible_chapter_opened",
  "bible_listen_started",
  "bible_listen_completed",
  "bible_voice_changed",
  "bible_highlighted",
  "push_enabled",
  "mini_window_opened",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return (
    typeof value === "string" &&
    (ANALYTICS_EVENTS as readonly string[]).includes(value)
  );
}

/** 관리자 화면 표기 */
export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEvent, string> = {
  signup_completed: "가입 완료",
  prayer_created: "기도제목 만들기",
  prayer_share_opened: "초대 공유",
  prayer_qr_opened: "QR 열기",
  prayer_joined: "함께 기도 참여",
  prayer_checked: "오늘 기도 체크",
  prayer_extended: "기간 연장",
  prayer_updated: "변화 기록",
  prayer_answered: "응답 기록",
  prayer_closed: "마무리",
  bible_reading_recorded: "성경 읽음 기록",
  bible_chapter_opened: "성경 장 열기",
  bible_listen_started: "듣기 시작",
  bible_listen_completed: "끝까지 듣기",
  bible_voice_changed: "목소리 바꾸기",
  bible_highlighted: "하이라이트",
  push_enabled: "알림 켜기",
  mini_window_opened: "작은 창 열기",
};

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    __analytics?: (event: string, props?: Props) => void;
  }
}

const TRACK_URL = "/api/track";

/** 화면을 떠나는 중에도 보내지도록 sendBeacon, 안 되면 keepalive fetch */
function send(event: AnalyticsEvent) {
  const body = JSON.stringify({ event });
  try {
    if (
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(
        TRACK_URL,
        new Blob([body], { type: "application/json" }),
      )
    ) {
      return;
    }
  } catch {
    /* 아래 fetch 로 */
  }
  void fetch(TRACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {});
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    send(event);
    if (typeof window.__analytics === "function") {
      window.__analytics(event, props);
    } else if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event, props ?? {});
    }
  } catch {
    // 분석 실패는 앱 동작에 영향 없음
  }
}
