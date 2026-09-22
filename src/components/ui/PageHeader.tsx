import Link from "next/link";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title?: string;
  /** 뒤로가기 링크 (없으면 표시 안 함) */
  backHref?: string;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  backHref,
  right,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-5 flex h-14 items-center gap-2 bg-canvas/90 px-5 backdrop-blur",
        className,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          aria-label="뒤로 가기"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-line/50"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
      {title && (
        <h1 className="flex-1 truncate text-base font-semibold text-ink">
          {title}
        </h1>
      )}
      {!title && <div className="flex-1" />}
      {right}
    </header>
  );
}
