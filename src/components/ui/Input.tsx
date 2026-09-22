import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  counter?: { value: number; max: number };
}

/** label 연결 + 접근성 (명세 81) */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, counter, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint && hintId, error && errId) || undefined}
        className={cn(
          "min-h-[48px] rounded-card border border-line bg-surface px-4 text-[15px] text-ink",
          "placeholder:text-ink-soft/70 focus:border-primary",
          error && "border-red-300",
          className,
        )}
        {...props}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-soft">
          {error ? (
            <span id={errId} className="text-red-600">
              {error}
            </span>
          ) : hint ? (
            <span id={hintId}>{hint}</span>
          ) : null}
        </p>
        {counter && (
          <span className="text-xs text-ink-soft/70">
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
    </div>
  );
});
