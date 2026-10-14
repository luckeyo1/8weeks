"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

/** 표시/숨기기 토글이 있는 비밀번호 입력 */
export function PasswordInput({
  label,
  error,
  id,
  className,
  ...props
}: PasswordInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errId = `${inputId}-error`;
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={show ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(
            "min-h-[48px] w-full rounded-card border border-line bg-surface pl-4 pr-12 text-[15px] text-ink",
            "placeholder:text-ink-soft/70 focus:border-primary",
            error && "border-red-300",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "비밀번호 숨기기" : "비밀번호 표시"}
          aria-pressed={show}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
        >
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.3 9.3 0 0112 5c5 0 9 4.5 9 7 0 1-.7 2.3-1.9 3.5M6.1 6.1C3.9 7.4 3 9.6 3 12c0 1 .7 4 3 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p id={errId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
