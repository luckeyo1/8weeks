import { PrayerCardSkeleton } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-40" />
      </div>
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-3">
        <PrayerCardSkeleton />
        <PrayerCardSkeleton />
      </div>
    </div>
  );
}
