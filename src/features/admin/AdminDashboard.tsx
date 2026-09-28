"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatKoreanDate, formatKoreanRange } from "@/lib/date";
import type { AdminOverview, AdminPrayer, AdminUser } from "@/types/domain";

type Tab = "overview" | "users" | "prayers";

export function AdminDashboard({
  overview,
  users,
  prayers,
}: {
  overview: AdminOverview;
  users: AdminUser[];
  prayers: AdminPrayer[];
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-2">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>
          요약
        </TabBtn>
        <TabBtn active={tab === "users"} onClick={() => setTab("users")}>
          사용자 {users.length}
        </TabBtn>
        <TabBtn active={tab === "prayers"} onClick={() => setTab("prayers")}>
          기도·관계 {prayers.length}
        </TabBtn>
      </div>

      {tab === "overview" && <Overview overview={overview} />}
      {tab === "users" && <Users users={users} />}
      {tab === "prayers" && <Prayers prayers={prayers} />}
    </div>
  );
}

function Overview({ overview }: { overview: AdminOverview }) {
  const tiles = [
    { label: "전체 사용자", value: overview.totalUsers },
    { label: "기도제목", value: overview.totalPrayers },
    { label: "함께 기도(참여)", value: overview.totalParticipations },
    { label: "누적 기도 횟수", value: overview.totalChecks },
    { label: "오늘 기도", value: overview.checksToday },
  ];
  const status = [
    { label: "진행 중", value: overview.byStatus.ACTIVE },
    { label: "기간 종료", value: overview.byStatus.EXPIRED },
    { label: "응답", value: overview.byStatus.ANSWERED },
    { label: "마무리", value: overview.byStatus.CLOSED },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <p className="text-xs text-ink-soft">{t.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink tabular-nums">
              {t.value}
            </p>
          </div>
        ))}
      </div>
      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold text-ink">기도제목 상태</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {status.map((s) => (
            <div key={s.label}>
              <p className="text-lg font-bold text-ink tabular-nums">{s.value}</p>
              <p className="text-xs text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Users({ users }: { users: AdminUser[] }) {
  if (users.length === 0) return <Empty>아직 가입한 사용자가 없어요.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-soft">
            <Th>이름</Th>
            <Th>아이디</Th>
            <Th>교회</Th>
            <Th>가입일</Th>
            <Th className="text-right">작성</Th>
            <Th className="text-right">참여</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-line/60">
              <Td className="font-medium text-ink">{u.nickname ?? "-"}</Td>
              <Td className="text-ink-soft">{u.username ?? "-"}</Td>
              <Td className="text-ink-soft">{u.churchName ?? "-"}</Td>
              <Td className="text-ink-soft">
                {formatKoreanDate(u.createdAt.slice(0, 10))}
              </Td>
              <Td className="text-right tabular-nums">{u.ownedCount}</Td>
              <Td className="text-right tabular-nums">{u.joinedCount}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Prayers({ prayers }: { prayers: AdminPrayer[] }) {
  if (prayers.length === 0) return <Empty>아직 등록된 기도제목이 없어요.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      {prayers.map((p) => (
        <div key={p.prayerId} className="card flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-ink-soft">
                작성자 <span className="font-medium text-ink">{p.ownerName ?? "-"}</span>
                {p.ownerUsername && (
                  <span className="text-ink-soft/70"> ({p.ownerUsername})</span>
                )}
              </p>
              <p className="mt-0.5 font-semibold leading-snug text-ink">{p.title}</p>
            </div>
            <StatusBadge status={p.status} />
          </div>
          {p.description && (
            <p className="line-clamp-2 text-sm text-ink-soft">{p.description}</p>
          )}
          <p className="text-xs text-ink-soft">
            {formatKoreanRange(p.startDate, p.endDate)} · 참여 {p.participantCount}명 · 누적 기도 {p.checkCount}번
          </p>

          {/* 누가 누구와 나누는지 */}
          <div className="mt-1 border-t border-line pt-2">
            <p className="mb-1.5 text-xs font-medium text-ink-soft">함께 기도하는 사람</p>
            {p.participants.length === 0 ? (
              <p className="text-xs text-ink-soft/70">아직 없음</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {p.participants.map((pt, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-pill bg-primary-soft px-2.5 py-1 text-xs text-primary"
                  >
                    {pt.nickname ?? pt.username ?? "익명"}
                    <span className="text-primary/70">· {pt.checkedCount}번</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabBtn({
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
        "min-h-[40px] rounded-card px-3 text-sm font-semibold transition-colors",
        active ? "bg-ink text-white" : "border border-line bg-surface text-ink-soft",
      )}
    >
      {children}
    </button>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("px-2 py-2 font-medium", className)}>{children}</th>;
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-2 py-2 align-top", className)}>{children}</td>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-8 text-center text-sm text-ink-soft">{children}</div>
  );
}
