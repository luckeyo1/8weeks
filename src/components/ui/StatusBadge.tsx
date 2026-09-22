import type { PrayerStatus } from "@/types/db";
import { cn } from "@/lib/cn";

const LABELS: Record<PrayerStatus, { text: string; className: string }> = {
  ACTIVE: { text: "함께 기도 중", className: "bg-primary-soft text-primary" },
  EXPIRED: { text: "기간 종료", className: "bg-line text-ink-soft" },
  ANSWERED: { text: "응답을 경험했어요", className: "bg-primary text-white" },
  CLOSED: { text: "마무리됨", className: "bg-line text-ink-soft" },
  DELETED: { text: "삭제됨", className: "bg-line text-ink-soft" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: PrayerStatus;
  className?: string;
}) {
  const item = LABELS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium",
        item.className,
        className,
      )}
    >
      {item.text}
    </span>
  );
}

/** D-day 배지 */
export function DDayBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-pill bg-canvas px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-line">
      {label}
    </span>
  );
}
