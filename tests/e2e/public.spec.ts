import { test, expect } from "@playwright/test";

/**
 * 백엔드(로그인) 없이 검증 가능한 공개 흐름.
 * QA Scenario 11(존재하지 않는 shareToken)의 일부와 랜딩/로그인 진입을 커버.
 */

test("랜딩 페이지가 히어로와 CTA를 보여준다 (명세 61)", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /다음 만남까지 함께 품어요/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "시작하기" })).toBeVisible();
});

test("시작하기 → 로그인 화면 (명세 4)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "시작하기" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder("이메일 주소"),
  ).toBeVisible();
});

test("잘못된 초대 토큰은 서비스 스타일 안내를 보여준다 (명세 79)", async ({
  page,
}) => {
  await page.goto("/join/!!invalid!!");
  await expect(page.getByText("유효하지 않은 기도 초대예요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "처음으로" })).toBeVisible();
});

test("보호된 페이지(홈)는 비로그인 시 로그인으로 보낸다", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
});
