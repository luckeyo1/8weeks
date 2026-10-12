import { Skeleton, PrayerCardSkeleton } from "@/components/ui/Skeleton";

/** 앱 영역 공통 로딩 (home 은 자체 loading 사용) */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-6 w-32" />
      <PrayerCardSkeleton />
      <PrayerCardSkeleton />
    </div>
  );
}
