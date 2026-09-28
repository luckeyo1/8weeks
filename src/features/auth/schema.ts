import { z } from "zod";

/** 이름(화면 표시) */
export const nicknameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력해주세요.")
  .max(20, "이름은 20자 이내로 입력해주세요.");

/** 아이디: 영문/숫자/._- 4~20자 */
export const usernameSchema = z
  .string()
  .trim()
  .min(4, "아이디는 4자 이상이에요.")
  .max(20, "아이디는 20자 이내로 입력해주세요.")
  .regex(/^[a-zA-Z0-9._-]+$/, "아이디는 영문, 숫자, . _ - 만 쓸 수 있어요.");

export const passwordSchema = z
  .string()
  .min(6, "비밀번호는 6자 이상이에요.")
  .max(72, "비밀번호가 너무 길어요.");

export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
  churchName: z
    .string()
    .trim()
    .max(40, "교회명은 40자 이내로 입력해주세요.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  username: z.string().trim().min(1, "아이디를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});
