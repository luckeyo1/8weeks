import { describe, expect, it } from "vitest";
import {
  KAKAO_NICKNAME_MAX,
  buildKakaoAuthUrl,
  buildTokenBody,
  decodeOAuthState,
  encodeOAuthState,
  newOAuthState,
  parseKakaoProfile,
  type KakaoConfig,
} from "./kakao";

const cfg: KakaoConfig = {
  clientId: "rest-key",
  clientSecret: null,
  adminKey: null,
  redirectUri: "https://example.com/auth/kakao/callback",
  authBase: "https://kauth.kakao.com",
  apiBase: "https://kapi.kakao.com",
};

describe("buildKakaoAuthUrl", () => {
  it("인가 코드 요청 파라미터", () => {
    const url = new URL(buildKakaoAuthUrl(cfg, "s".repeat(32)));
    expect(url.origin + url.pathname).toBe(
      "https://kauth.kakao.com/oauth/authorize",
    );
    expect(url.searchParams.get("client_id")).toBe("rest-key");
    expect(url.searchParams.get("redirect_uri")).toBe(cfg.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("s".repeat(32));
  });
});

describe("buildTokenBody", () => {
  it("Client Secret 이 없으면 넣지 않는다", () => {
    const body = buildTokenBody(cfg, "CODE");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("CODE");
    expect(body.get("redirect_uri")).toBe(cfg.redirectUri);
    expect(body.has("client_secret")).toBe(false);
  });
  it("있으면 넣는다", () => {
    const body = buildTokenBody({ ...cfg, clientSecret: "sec" }, "CODE");
    expect(body.get("client_secret")).toBe("sec");
  });
});

describe("parseKakaoProfile", () => {
  it("회원번호 + kakao_account 닉네임", () => {
    expect(
      parseKakaoProfile({
        id: 1234567890,
        kakao_account: { profile: { nickname: " 현우 " } },
      }),
    ).toEqual({ id: "1234567890", nickname: "현우" });
  });
  it("properties 닉네임으로 대체, 길이 제한", () => {
    const long = "가".repeat(40);
    const p = parseKakaoProfile({ id: 1, properties: { nickname: long } });
    expect(p?.nickname).toHaveLength(KAKAO_NICKNAME_MAX);
  });
  it("닉네임 동의가 없으면 null", () => {
    expect(parseKakaoProfile({ id: 7, kakao_account: {} })).toEqual({
      id: "7",
      nickname: null,
    });
  });
  it("회원번호가 없거나 이상하면 null", () => {
    expect(parseKakaoProfile(null)).toBeNull();
    expect(parseKakaoProfile({})).toBeNull();
    expect(parseKakaoProfile({ id: "12a" })).toBeNull();
  });
});

describe("OAuth state 쿠키", () => {
  it("왕복", () => {
    const s = {
      state: newOAuthState(),
      mode: "link" as const,
      returnUrl: "/join/a|b",
    };
    expect(decodeOAuthState(encodeOAuthState(s))).toEqual(s);
  });
  it("손상·누락·짧은 state 는 거부", () => {
    expect(decodeOAuthState(undefined)).toBeNull();
    expect(decodeOAuthState("%%%")).toBeNull();
    expect(
      decodeOAuthState(
        encodeURIComponent(
          JSON.stringify({ state: "short", mode: "login", returnUrl: "/" }),
        ),
      ),
    ).toBeNull();
    expect(
      decodeOAuthState(
        encodeURIComponent(
          JSON.stringify({
            state: "x".repeat(32),
            mode: "admin",
            returnUrl: "/",
          }),
        ),
      ),
    ).toBeNull();
  });
  it("state 는 48자 16진수 난수", () => {
    const a = newOAuthState();
    expect(a).toMatch(/^[0-9a-f]{48}$/);
    expect(newOAuthState()).not.toBe(a);
  });
});
