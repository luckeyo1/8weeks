import { describe, expect, it } from "vitest";
import {
  generateShareToken,
  isValidShareTokenFormat,
  SHARE_TOKEN_LENGTH,
} from "./token";

describe("generateShareToken", () => {
  it("기본 길이(22자)로 생성한다", () => {
    expect(generateShareToken()).toHaveLength(SHARE_TOKEN_LENGTH);
  });

  it("base62 문자만 포함한다", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateShareToken()).toMatch(/^[0-9A-Za-z]+$/);
    }
  });

  it("충돌 없이 고유한 토큰을 생성한다", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i += 1) set.add(generateShareToken());
    expect(set.size).toBe(1000);
  });

  it("16자 미만은 거부한다", () => {
    expect(() => generateShareToken(10)).toThrow();
  });
});

describe("isValidShareTokenFormat", () => {
  it("유효한 형식", () => {
    expect(isValidShareTokenFormat("a8F3zkP92vAbCdEfGh12")).toBe(true);
  });
  it("너무 짧거나 특수문자 포함 시 거부", () => {
    expect(isValidShareTokenFormat("short")).toBe(false);
    expect(isValidShareTokenFormat("has-dash-and-more1234")).toBe(false);
    expect(isValidShareTokenFormat("")).toBe(false);
  });
});
