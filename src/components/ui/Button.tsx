import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:bg-primary/40",
  secondary:
    "bg-primary-soft text-primary hover:bg-primary-soft/70 disabled:opacity-50",
  ghost: "bg-transparent text-ink-soft hover:bg-line/50 disabled:opacity-50",
  danger:
    "bg-transparent text-red-600 hover:bg-red-50 disabled:opacity-50 border border-red-200",
};

const SIZES: Record<Size, string> = {
  // 명세 40: 버튼 최소 높이 48px
  md: "min-h-[48px] px-4 text-[15px]",
  lg: "min-h-[52px] px-5 text-base",
};

/** 실제 <button> 태그 사용 (명세 81 접근성) */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        // 명세 47/68: submit 시 double click 방지
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-card font-semibold transition-colors",
          "disabled:cursor-not-allowed",
          VARIANTS[variant],
          SIZES[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);
