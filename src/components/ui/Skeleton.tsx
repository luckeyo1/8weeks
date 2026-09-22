import { cn } from "@/lib/cn";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** 기도 카드 로딩 스켈레톤 (명세 47) */
export function PrayerCardSkeleton() {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full rounded-card" />
    </div>
  );
}
