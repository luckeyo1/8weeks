import Image from "next/image";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** 상단 일러스트 경로 (선택) */
  image?: string;
  className?: string;
}

/** 빈 상태 (명세 48/49) — 죄책감 없는 담담한 문구 */
export function EmptyState({
  title,
  description,
  action,
  image,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-14 text-center",
        className,
      )}
    >
      {image && (
        <Image
          src={image}
          alt=""
          width={120}
          height={120}
          className="mb-2 h-24 w-24 object-contain opacity-90"
        />
      )}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description && (
        <p className="text-sm leading-relaxed text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
