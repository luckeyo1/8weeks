/**
 * 분석 이벤트 (명세 56).
 * MVP 에서는 별도 SDK 없이 확장 가능한 sink 만 둔다.
 * window.__analytics 가 있으면 위임하고, 개발 환경에서는 콘솔에만 남긴다.
 * 실제 도구(GA4/Amplitude/PostHog 등) 연결 시 track 구현만 교체하면 된다.
 */

export type AnalyticsEvent =
  | "signup_completed"
  | "prayer_created"
  | "prayer_share_opened"
  | "prayer_qr_opened"
  | "prayer_joined"
  | "prayer_checked"
  | "prayer_extended"
  | "prayer_updated"
  | "prayer_answered"
  | "prayer_closed";

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    __analytics?: (event: string, props?: Props) => void;
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
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
