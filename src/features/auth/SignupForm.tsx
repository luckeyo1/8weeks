"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signUp } from "./actions";

function safeReturn(url: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

type FieldErrors = {
  nickname?: string;
  username?: string;
  password?: string;
  general?: string;
};

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnUrl = safeReturn(params.get("returnUrl"));

  const [form, setForm] = useState({
    nickname: "",
    churchName: "",
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  const loginHref = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined, general: undefined }));
    };
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (form.nickname.trim().length === 0) e.nickname = "이름을 입력해주세요.";
    if (!/^[a-zA-Z0-9._-]{4,20}$/.test(form.username.trim()))
      e.username = "아이디는 영문·숫자 4~20자(. _ -)로 입력해주세요.";
    if (form.password.length < 6)
      e.password = "비밀번호는 6자 이상이어야 해요.";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await signUp({
        username: form.username.trim(),
        password: form.password,
        nickname: form.nickname.trim(),
        churchName: form.churchName.trim() || undefined,
      });
      if (res.ok) {
        router.replace(returnUrl);
        router.refresh();
      } else if (res.message.includes("아이디")) {
        setErrors({ username: res.message });
      } else if (res.message.includes("비밀번호")) {
        setErrors({ password: res.message });
      } else {
        setErrors({ general: res.message });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="이름"
        hint="함께 기도할 때 상대에게 보일 이름이에요. 실명이 아니어도 괜찮아요."
        placeholder="예: 민수, 믿음맘"
        value={form.nickname}
        onChange={update("nickname")}
        error={errors.nickname}
        maxLength={20}
      />
      <Input
        label="교회명 (선택)"
        placeholder="다니시는 교회 (선택)"
        value={form.churchName}
        onChange={update("churchName")}
        maxLength={40}
      />
      <Input
        label="아이디"
        autoComplete="username"
        placeholder="영문·숫자 4~20자"
        value={form.username}
        onChange={update("username")}
        error={errors.username}
      />
      <PasswordInput
        label="비밀번호"
        autoComplete="new-password"
        placeholder="6자 이상"
        value={form.password}
        onChange={update("password")}
        error={errors.password}
      />

      {errors.general && (
        <p className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-600">
          {errors.general}
        </p>
      )}

      <Button type="submit" size="lg" fullWidth loading={pending}>
        내 기도 동행 시작하기
      </Button>
      <p className="text-center text-sm text-ink-soft">
        이미 계정이 있으세요?{" "}
        <Link href={loginHref} className="font-semibold text-primary">
          로그인
        </Link>
      </p>
    </form>
  );
}
