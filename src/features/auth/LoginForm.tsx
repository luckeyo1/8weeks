"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { signIn } from "./actions";

function safeReturn(url: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const returnUrl = safeReturn(params.get("returnUrl"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const signupHref = `/signup?returnUrl=${encodeURIComponent(returnUrl)}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const res = await signIn({ username: username.trim(), password });
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
        label="아이디"
        autoComplete="username"
        placeholder="아이디"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Input
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error}
        required
      />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        로그인
      </Button>
      <p className="text-center text-sm text-ink-soft">
        아직 계정이 없으세요?{" "}
        <Link href={signupHref} className="font-semibold text-primary">
          가입하기
        </Link>
      </p>
    </form>
  );
}
