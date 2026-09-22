import { describe, expect, it } from "vitest";
import {
  canCheck,
  canJoin,
  canTransition,
  computeEffectiveStatus,
  isActiveForHome,
} from "./status";

describe("canTransition", () => {
  it("허용된 전이", () => {
    expect(canTransition("ACTIVE", "EXPIRED")).toBe(true);
    expect(canTransition("EXPIRED", "ACTIVE")).toBe(true);
    expect(canTransition("EXPIRED", "ANSWERED")).toBe(true);
    expect(canTransition("EXPIRED", "CLOSED")).toBe(true);
    expect(canTransition("ACTIVE", "DELETED")).toBe(true);
    expect(canTransition("ANSWERED", "DELETED")).toBe(true);
  });

  it("허용되지 않은 전이", () => {
    expect(canTransition("ACTIVE", "ANSWERED")).toBe(false);
    expect(canTransition("CLOSED", "ACTIVE")).toBe(false);
    expect(canTransition("DELETED", "ACTIVE")).toBe(false);
    expect(canTransition("ANSWERED", "CLOSED")).toBe(false);
  });
});

describe("computeEffectiveStatus", () => {
  it("ACTIVE 이면서 종료일이 지나면 EXPIRED 로 간주", () => {
    expect(computeEffectiveStatus("ACTIVE", "2024-01-01", "2024-01-02")).toBe(
      "EXPIRED",
    );
  });
  it("ACTIVE 이고 아직 기간 내면 ACTIVE 유지", () => {
    expect(computeEffectiveStatus("ACTIVE", "2024-01-05", "2024-01-01")).toBe(
      "ACTIVE",
    );
    // 당일은 아직 진행
    expect(computeEffectiveStatus("ACTIVE", "2024-01-01", "2024-01-01")).toBe(
      "ACTIVE",
    );
  });
  it("종료/응답 상태는 그대로 유지", () => {
    expect(computeEffectiveStatus("ANSWERED", "2024-01-01", "2024-06-01")).toBe(
      "ANSWERED",
    );
    expect(computeEffectiveStatus("CLOSED", "2020-01-01", "2024-01-01")).toBe(
      "CLOSED",
    );
  });
});

describe("행동 가능 여부", () => {
  it("ACTIVE 만 홈 노출/체크/참여 가능", () => {
    expect(isActiveForHome("ACTIVE")).toBe(true);
    expect(isActiveForHome("EXPIRED")).toBe(false);
    expect(canCheck("ACTIVE")).toBe(true);
    expect(canCheck("EXPIRED")).toBe(false);
    expect(canJoin("ACTIVE")).toBe(true);
    expect(canJoin("ANSWERED")).toBe(false);
  });
});
