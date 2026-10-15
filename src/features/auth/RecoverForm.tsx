"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { recoverAccount } from "./actions";

export function RecoverForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (newPassword.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 해요.");
      return;
    }
    startTransition(async () => {
      const res = await recoverAccount({
        username: username.trim(),
        recoveryCode: recoveryCode.trim(),
        newPassword,
      });
      if (res.ok) {
        router.replace("/home");
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
        label="복구 코드"
        hint="가입할 때 저장해둔 코드예요. (예: A7KQ-9MXT-H3PW)"
        placeholder="복구 코드"
        value={recoveryCode}
        onChange={(e) => setRecoveryCode(e.target.value)}
        required
      />
      <PasswordInput
        label="새 비밀번호"
        autoComplete="new-password"
        placeholder="6자 이상"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={error}
        required
      />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        비밀번호 재설정
      </Button>
      <p className="text-center text-[13px] leading-relaxed text-ink-soft">
        복구 코드를 잃어버렸다면 관리자에게 재발급을 요청해주세요.
      </p>
      <Link
        href="/login"
        className="text-center text-sm text-ink-soft hover:text-ink"
      >
        ← 로그인으로 돌아가기
      </Link>
    </form>
  );
}
