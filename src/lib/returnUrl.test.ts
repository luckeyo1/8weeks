import { describe, expect, it } from "vitest";
import { inviteTokenFrom, safeReturnUrl } from "./returnUrl";

describe("safeReturnUrl", () => {
  it("사이트 안 경로는 그대로", () => {
    expect(safeReturnUrl("/join/abc")).toBe("/join/abc");
    expect(safeReturnUrl("/prayers/1?x=1")).toBe("/prayers/1?x=1");
  });
  it("외부 주소·프로토콜 상대 주소·빈 값은 /home", () => {
    expect(safeReturnUrl("https://evil.example")).toBe("/home");
    expect(safeReturnUrl("//evil.example")).toBe("/home");
    expect(safeReturnUrl("")).toBe("/home");
    expect(safeReturnUrl(null)).toBe("/home");
    expect(safeReturnUrl(undefined)).toBe("/home");
  });
});

describe("inviteTokenFrom", () => {
  it("초대 경로에서 토큰만 꺼낸다", () => {
    expect(inviteTokenFrom("/join/1BKbxL0sqjLKbG2expNF6S")).toBe(
      "1BKbxL0sqjLKbG2expNF6S",
    );
  });
  it("초대 경로가 아니면 null", () => {
    expect(inviteTokenFrom("/home")).toBeNull();
    expect(inviteTokenFrom("/join/abc/extra")).toBeNull();
    expect(inviteTokenFrom("/join/a-b")).toBeNull();
  });
});
