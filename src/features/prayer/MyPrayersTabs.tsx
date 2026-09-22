"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge, DDayBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDDay, appTodayISO } from "@/lib/date";
import type {
  OwnedPrayerSummary,
  ParticipatingPrayer,
} from "@/types/domain";

type MainTab = "mine" | "with";
type Filter = "ongoing" | "done";

const isOngoing = (s: string) => s === "ACTIVE" || s === "EXPIRED";

export function MyPrayersTabs({
  owned,
  participating,
}: {
  owned: OwnedPrayerSummary[];
  participating: ParticipatingPrayer[];
}) {
  const [tab, setTab] = useState<MainTab>("mine");
  const [filter, setFilter] = useState<Filter>("ongoing");
  const today = appTodayISO();

  const ownedFiltered = useMemo(
    () =>
      owned.filter((p) =>
        filter === "ongoing" ? isOngoing(p.status) : !isOngoing(p.status),
      ),
    [owned, filter],
  );
  const withFiltered = useMemo(
    () =>
      participating.filter((p) =>
        filter === "ongoing" ? p.status === "ACTIVE" : p.status !== "ACTIVE",
      ),
    [participating, filter],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 메인 탭 */}
      <div role="tablist" aria-label="나의 기도" className="flex gap-2">
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          나의 기도
        </TabButton>
        <TabButton active={tab === "with"} onClick={() => setTab("with")}>
          함께 기도 중
        </TabButton>
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2">
        <FilterChip active={filter === "ongoing"} onClick={() => setFilter("ongoing")}>
          진행 중
        </FilterChip>
        <FilterChip active={filter === "done"} onClick={() => setFilter("done")}>
          마무리
        </FilterChip>
      </div>

      {/* 목록 */}
      {tab === "mine" ? (
        ownedFiltered.length === 0 ? (
          <EmptyState
            title="아직 나눈 기도제목이 없어요."
            description="마음에 품고 있는 기도를 누군가와 나눠보세요."
            action={
              <Link href="/prayers/new">
                <Button>기도제목 만들기</Button>
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {ownedFiltered.map((p) => (
              <li key={p.prayerId}>
                <Link href={`/prayers/${p.prayerId}`} className="block">
                  <div className="card flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={p.status} />
                      {isOngoing(p.status) && (
                        <DDayBadge label={formatDDay(p.endDate, today)} />
                      )}
                    </div>
                    <p className="font-medium leading-snug text-ink">
                      {p.title}
                    </p>
                    <p className="text-xs text-ink-soft">
                      함께 기도하는 사람 {p.participantCount}명
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : withFiltered.length === 0 ? (
        <EmptyState
          title="함께 기도하는 기도제목이 없어요."
          description="공유받은 링크나 QR로 함께 기도해보세요."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {withFiltered.map((p) => (
            <li key={p.prayerId}>
              <Link href={`/prayers/${p.prayerId}`} className="block">
                <div className="card flex items-center gap-3 p-4">
                  <Avatar
                    name={p.owner.nickname}
                    src={p.owner.profileImageUrl}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {p.owner.nickname}
                    </p>
                    <p className="truncate text-sm text-ink-soft">{p.title}</p>
                  </div>
                  {p.status === "ACTIVE" ? (
                    <DDayBadge label={formatDDay(p.endDate, today)} />
                  ) : (
                    <StatusBadge status={p.status} />
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "min-h-[44px] flex-1 rounded-card text-sm font-semibold transition-colors",
        active ? "bg-ink text-white" : "bg-surface text-ink-soft border border-line",
      )}
    >
      {children}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-[36px] rounded-pill px-4 text-sm font-medium transition-colors",
        active ? "bg-primary-soft text-primary" : "text-ink-soft",
      )}
    >
      {children}
    </button>
  );
}
