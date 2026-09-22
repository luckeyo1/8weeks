import { z } from "zod";

/** 닉네임 (명세 5) — 필수, 1~20자 */
export const nicknameSchema = z
  .string()
  .trim()
  .min(1, "닉네임을 입력해주세요.")
  .max(20, "닉네임은 20자 이내로 입력해주세요.");

export const onboardingSchema = z.object({
  nickname: nicknameSchema,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
