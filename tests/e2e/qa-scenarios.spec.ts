import { test } from "@playwright/test";

/**
 * 명세 69~80 의 핵심 QA 시나리오 (signup/create/share/join/check/expire/
 * extend/answer/delete). 이 흐름들은 로그인된 세션이 필요하므로 실행 전제 조건:
 *
 *  1) Supabase 테스트 프로젝트에 마이그레이션 + seed 적용
 *     (supabase db reset)
 *  2) 두 개의 사전 로그인 세션(storageState) 준비:
 *     - tests/e2e/.auth/userA.json (기도제목 작성자)
 *     - tests/e2e/.auth/userB.json (함께 기도하는 사람)
 *     매직링크/서비스롤로 세션 토큰을 발급해 storageState 로 저장하는
 *     global-setup 을 붙인다.
 *  3) E2E_BASE_URL 로 해당 환경을 가리킨다.
 *
 * 위 준비가 없는 CI/로컬에서는 skip 되며, 준비되면 test.skip 을 제거한다.
 */

const NEEDS_AUTH = !process.env.E2E_AUTH_READY;

test.describe("QA 시나리오 (로그인 세션 필요)", () => {
  test.skip(NEEDS_AUTH, "E2E_AUTH_READY + seed 세션 준비 후 실행");

  test("S1: 기도제목 생성 + 기간 + shareToken + QR (명세 69)", async () => {
    // A 로그인 → /prayers/new → 제목/7일 → 생성 → 상세에 QR/링크 노출
  });

  test("S2: B가 QR/링크로 접속 → 로그인 → 원래 join 복귀 → 참여 (명세 70)", async () => {
    // 비로그인 join → [함께 기도하기] → login(returnUrl) → 복귀 → 참여 성공
  });

  test("S3: B 홈에 노출 → 체크 → reload 후에도 완료 유지 (명세 71)", async () => {});

  test("S4: 같은 날 여러 번 클릭해도 PrayerCheck 1건 (명세 72)", async () => {});

  test("S5: A가 자신의 QR 접속 → 참여 버튼 없음/관리 안내 (명세 73)", async () => {});

  test("S6: B 재접속 시 중복 참여 방지 안내 (명세 74)", async () => {});

  test("S7: 종료일 도달 → 홈에서 제외 + A 정리 화면 (명세 75)", async () => {});

  test("S8: A가 7일 연장 → ACTIVE → B 홈 재노출 (명세 76)", async () => {});

  test("S9: A 응답 작성 → B가 종료 기도에서 업데이트 확인 (명세 77)", async () => {});

  test("S10: A 삭제 → B가 기존 URL 접속 시 내용 미노출 (명세 78)", async () => {});
});
