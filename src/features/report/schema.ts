import { z } from "zod";

/** 신고 사유 (DB check 제약과 같아야 한다 — migrations/0010_prayer_reports.sql) */
export const REPORT_REASONS = [
  "INAPPROPRIATE",
  "HARASSMENT",
  "SPAM",
  "PRIVACY",
  "OTHER",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  INAPPROPRIATE: "부적절하거나 불쾌한 내용",
  HARASSMENT: "괴롭힘이나 혐오 표현",
  SPAM: "광고나 스팸",
  PRIVACY: "다른 사람의 개인정보가 드러나 있어요",
  OTHER: "기타",
};

export const REPORT_DETAIL_MAX = 300;

export const reportSchema = z
  .object({
    prayerId: z.string().trim().min(1).max(64),
    reason: z.enum(REPORT_REASONS, {
      errorMap: () => ({ message: "신고 사유를 골라주세요." }),
    }),
    detail: z
      .string()
      .trim()
      .max(REPORT_DETAIL_MAX, `${REPORT_DETAIL_MAX}자 이내로 적어주세요.`)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((d) => d.reason !== "OTHER" || Boolean(d.detail), {
    message: "'기타'를 고르셨다면 이유를 짧게 적어주세요.",
    path: ["detail"],
  });

export type ReportInput = z.input<typeof reportSchema>;

export function reportReasonLabel(reason: string): string {
  return (REPORT_REASON_LABELS as Record<string, string>)[reason] ?? reason;
}
