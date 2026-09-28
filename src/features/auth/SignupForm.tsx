"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signUp } from "./actions";

function safeReturn(url: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnUrl = safeReturn(params.get("returnUrl"));

  const [form, setForm] = useState({
    username: "",
    password: "",
    nickname: "",
    churchName: "",
  });
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const loginHref = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
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
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="이름"
        placeholder="함께 기도할 때 보일 이름"
        value={form.nickname}
        onChange={update("nickname")}
        maxLength={20}
        required
        autoFocus
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
        placeholder="영문/숫자 4~20자"
        value={form.username}
        onChange={update("username")}
        required
      />
      <Input
        label="비밀번호"
        type="password"
        autoComplete="new-password"
        placeholder="6자 이상"
        value={form.password}
        onChange={update("password")}
        error={error}
        required
      />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        가입하고 시작하기
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
