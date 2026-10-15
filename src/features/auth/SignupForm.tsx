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
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

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
        // 복구 코드를 1회 보여준 뒤 이어서 이동한다.
        setRecoveryCode(res.data.recoveryCode);
      } else if (res.message.includes("아이디")) {
        setErrors({ username: res.message });
      } else if (res.message.includes("비밀번호")) {
        setErrors({ password: res.message });
      } else {
        setErrors({ general: res.message });
      }
    });
  }

  if (recoveryCode) {
    return (
      <RecoveryCodeScreen
        code={recoveryCode}
        onContinue={() => {
          router.replace(returnUrl);
          router.refresh();
        }}
      />
    );
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

/** 가입 직후 복구 코드 1회 안내 화면 */
function RecoveryCodeScreen({
  code,
  onContinue,
}: {
  code: string;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 미지원 환경은 무시 */
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-ink">복구 코드를 저장해두세요</h2>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          비밀번호를 잊었을 때 이 코드로 다시 들어올 수 있어요. 지금 한 번만
          보여드리니 안전한 곳에 적어두세요.
        </p>
      </div>

      <div className="card flex flex-col items-center gap-3 p-6">
        <p className="select-all text-center text-2xl font-bold tracking-[0.15em] text-ink">
          {code}
        </p>
        <button
          type="button"
          onClick={copy}
          className="px-3 py-1 text-sm text-primary underline-offset-2 hover:underline"
        >
          {copied ? "복사했어요" : "복사하기"}
        </button>
      </div>

      <p className="text-[13px] leading-relaxed text-ink-soft">
        이 코드는 다시 볼 수 없어요. 잃어버리면 관리자에게 재발급을 요청해야
        해요.
      </p>

      <Button size="lg" fullWidth onClick={onContinue}>
        저장했어요 · 시작하기
      </Button>
    </div>
  );
}
