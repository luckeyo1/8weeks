import type { PrayerUpdateView } from "@/types/domain";
import type { PrayerUpdateType } from "@/types/db";
import { formatKoreanDate } from "@/lib/date";

const LABELS: Record<PrayerUpdateType, string> = {
  EXTENDED: "기간을 연장했어요",
  CHANGED: "변화가 있었어요",
  ANSWERED: "응답을 경험했어요 🙌",
  CLOSED: "기도제목을 마쳤어요",
};

/** 기도 업데이트 타임라인 */
export function UpdateList({ updates }: { updates: PrayerUpdateView[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {updates.map((u) => (
        <li key={u.id} className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">
              {LABELS[u.type]}
            </span>
            <span className="text-xs text-ink-soft/70">
              {formatKoreanDate(u.createdAt.slice(0, 10))}
            </span>
          </div>
          {u.content && (
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
              {u.content}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
