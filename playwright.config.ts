import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 설정 (명세 88).
 * 모바일 Safari/Chrome 동작 확인을 위해 모바일 뷰포트 프로젝트를 둔다.
 * 인증이 필요한 시나리오는 실제 Supabase 테스트 프로젝트 + seed 세션이 필요하다
 * (README 참고). 백엔드 없이 검증 가능한 공개 흐름부터 실행된다.
 */
const PORT = 3000;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
