import { describe, expect, it } from "vitest";
import { REPORT_DETAIL_MAX, reportReasonLabel, reportSchema } from "./schema";

describe("reportSchema", () => {
  it("사유만 골라도 신고할 수 있다", () => {
    const r = reportSchema.safeParse({ prayerId: "p1", reason: "SPAM" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.detail).toBeUndefined();
  });

  it("빈 상세 내용은 없는 것으로 본다", () => {
    const r = reportSchema.safeParse({ prayerId: "p1", reason: "HARASSMENT", detail: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.detail).toBeUndefined();
  });

  it("'기타'는 이유를 적어야 한다", () => {
    expect(reportSchema.safeParse({ prayerId: "p1", reason: "OTHER" }).success).toBe(false);
    expect(
      reportSchema.safeParse({ prayerId: "p1", reason: "OTHER", detail: "중복 게시" }).success,
    ).toBe(true);
  });

  it("알 수 없는 사유와 너무 긴 내용은 거절한다", () => {
    expect(reportSchema.safeParse({ prayerId: "p1", reason: "NOPE" }).success).toBe(false);
    expect(
      reportSchema.safeParse({
        prayerId: "p1",
        reason: "SPAM",
        detail: "가".repeat(REPORT_DETAIL_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("사유 라벨", () => {
    expect(reportReasonLabel("SPAM")).toBe("광고나 스팸");
    expect(reportReasonLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
