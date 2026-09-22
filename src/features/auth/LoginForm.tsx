"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

function safeReturn(url: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

export function LoginForm() {
  const params = useSearchParams();
  const toast = useToast();
  const returnUrl = safeReturn(params.get("returnUrl"));
  const authError = params.get("error");

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const callbackUrl = `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(returnUrl)}`;

  async function handleGoogle() {
    setLoadingGoogle(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (error) throw error;
      // 성공 시 리다이렉트되므로 이후 코드는 실행되지 않음
    } catch {
      toast.show("로그인에 실패했어요. 잠시 후 다시 시도해주세요.", "error");
      setLoadingGoogle(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.show("이메일 주소를 확인해주세요.", "error");
      return;
    }
    setLoadingEmail(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) throw error;
      setEmailSent(true);
    } catch {
      toast.show("메일 전송에 실패했어요. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setLoadingEmail(false);
    }
  }

  if (emailSent) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-lg font-semibold text-ink">메일을 보냈어요</p>
        <p className="text-sm leading-relaxed text-ink-soft">
          {email} 로 로그인 링크를 보냈어요.
          <br />
          메일함을 확인하고 링크를 눌러주세요.
        </p>
        <Button
          variant="ghost"
          onClick={() => setEmailSent(false)}
          className="mt-2"
        >
          다른 방법으로 로그인
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {authError && (
        <p className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-600">
          로그인이 완료되지 않았어요. 다시 시도해주세요.
        </p>
      )}

      <Button
        variant="secondary"
        size="lg"
        fullWidth
        loading={loadingGoogle}
        onClick={handleGoogle}
      >
        Google로 계속하기
      </Button>

      <div className="flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        또는
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일 주소"
          aria-label="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" size="lg" fullWidth loading={loadingEmail}>
          이메일로 로그인 링크 받기
        </Button>
      </form>

      <p className="text-center text-xs leading-relaxed text-ink-soft/80">
        비밀번호 없이 로그인해요.
      </p>
    </div>
  );
}
