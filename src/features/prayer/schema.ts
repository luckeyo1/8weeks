import { z } from "zod";
import { MAX_DURATION_DAYS, MIN_DURATION_DAYS } from "@/lib/date";

/** 기도제목 생성 (명세 9) */
export const createPrayerSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "기도제목을 입력해주세요.")
    .max(50, "기도제목은 50자 이내로 입력해주세요."),
  description: z
    .string()
    .trim()
    .max(500, "자세한 내용은 500자 이내로 입력해주세요.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  durationDays: z
    .number({ invalid_type_error: "기간을 선택해주세요." })
    .int()
    .min(MIN_DURATION_DAYS, `기간은 최소 ${MIN_DURATION_DAYS}일이에요.`)
    .max(MAX_DURATION_DAYS, `기간은 최대 ${MAX_DURATION_DAYS}일까지예요.`),
});
export type CreatePrayerInput = z.infer<typeof createPrayerSchema>;

/** 기간 연장 (명세 24) */
export const extendPrayerSchema = z.object({
  prayerId: z.string().uuid(),
  durationDays: z
    .number()
    .int()
    .min(MIN_DURATION_DAYS)
    .max(MAX_DURATION_DAYS),
});

/** 변화 업데이트 (명세 25) — 최대 300자 */
export const changePrayerSchema = z.object({
  prayerId: z.string().uuid(),
  content: z
    .string()
    .trim()
    .min(1, "변화된 내용을 적어주세요.")
    .max(300, "300자 이내로 적어주세요."),
});

/** 응답 (명세 26) — 선택 입력, 최대 500자 */
export const answerPrayerSchema = z.object({
  prayerId: z.string().uuid(),
  content: z
    .string()
    .trim()
    .max(500, "500자 이내로 적어주세요.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
