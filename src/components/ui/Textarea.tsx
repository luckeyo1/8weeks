import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  counter?: { value: number; max: number };
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, counter, className, id, rows = 4, ...props },
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
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hint && hintId, error && errId) || undefined}
          className={cn(
            "resize-none rounded-card border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink",
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
  },
);
