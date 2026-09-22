"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { completeOnboarding } from "./actions";

function safeReturn(url: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

export function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length === 0) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const res = await completeOnboarding({ nickname: trimmed });
      if (res.ok) {
        router.replace(safeReturn(params.get("returnUrl")));
        router.refresh();
      } else {
        setError(res.message);
        toast.show(res.message, "error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Input
        label="닉네임"
        placeholder="함께 기도할 때 보일 이름이에요"
        value={nickname}
        onChange={(e) => {
          setNickname(e.target.value);
          if (error) setError(undefined);
        }}
        error={error}
        counter={{ value: nickname.trim().length, max: 20 }}
        maxLength={20}
        autoFocus
      />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        시작하기
      </Button>
    </form>
  );
}
