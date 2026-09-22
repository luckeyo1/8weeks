import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** 빈 상태 (명세 48/49) — 죄책감 없는 담담한 문구 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-16 text-center",
        className,
      )}
    >
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description && (
        <p className="text-sm leading-relaxed text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
