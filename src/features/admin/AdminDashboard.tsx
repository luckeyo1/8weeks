"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatKoreanDate, formatKoreanRange } from "@/lib/date";
import { reportReasonLabel } from "@/features/report/schema";
import {
  adminHideReportedPrayer,
  adminReissueRecoveryCode,
  adminResolveReport,
} from "./actions";
import type {
  AdminOverview,
  AdminPrayer,
  AdminReport,
  AdminUser,
} from "@/types/domain";

type Tab = "overview" | "reports" | "users" | "prayers";

export function AdminDashboard({
  overview,
  users,
  prayers,
  reports,
}: {
  overview: AdminOverview;
  users: AdminUser[];
  prayers: AdminPrayer[];
  /** null: 신고 테이블(0010) 미적용 */
  reports: AdminReport[] | null;
}) {
  // 처리할 신고가 있으면 신고 탭부터
  const [tab, setTab] = useState<Tab>(reports && reports.length > 0 ? "reports" : "overview");

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex flex-wrap gap-2">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>
          요약
        </TabBtn>
        <TabBtn active={tab === "reports"} onClick={() => setTab("reports")}>
          신고 {reports?.length ?? 0}
        </TabBtn>
        <TabBtn active={tab === "users"} onClick={() => setTab("users")}>
          사용자 {users.length}
        </TabBtn>
        <TabBtn active={tab === "prayers"} onClick={() => setTab("prayers")}>
          기도·관계 {prayers.length}
        </TabBtn>
      </div>

      {tab === "overview" && <Overview overview={overview} />}
      {tab === "reports" && <Reports reports={reports} />}
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
            <Th className="text-right">복구</Th>
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
              <Td className="text-right">
                <RecoveryReissue userId={u.id} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 관리자: 특정 사용자 복구 코드 재발급 (코드는 1회 노출, 관리자가 전달) */
function RecoveryReissue({ userId }: { userId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (code) {
    return (
      <div className="flex items-center justify-end gap-2">
        <code className="select-all rounded bg-primary-soft px-1.5 py-0.5 text-[13px] font-semibold tracking-wide text-primary">
          {code}
        </code>
        <button
          type="button"
          onClick={() => setCode(null)}
          className="text-[12px] text-ink-soft hover:text-ink"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setError(null);
          const res = await adminReissueRecoveryCode(userId);
          if (res.ok) setCode(res.data.recoveryCode);
          else setError(res.message);
        })
      }
      className="text-[13px] text-primary underline-offset-2 hover:underline disabled:opacity-50"
    >
      {pending ? "발급 중…" : error ? "다시 시도" : "재발급"}
    </button>
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

/** 신고 처리: 확인 완료(조치 없음) 또는 기도제목 숨기기 */
function Reports({ reports }: { reports: AdminReport[] | null }) {
  if (reports === null) {
    return (
      <Empty>
        신고 기능을 쓰려면 DB 마이그레이션(0010_prayer_reports)을 적용해야 해요.
      </Empty>
    );
  }
  if (reports.length === 0) return <Empty>처리할 신고가 없어요.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-soft">
        신고한 사람은 작성자에게 알리지 않아요. 숨긴 기도제목은 작성자와 함께
        기도하는 사람 모두에게서 사라져요.
      </p>
      {reports.map((r) => (
        <ReportCard key={r.reportId} report={r} />
      ))}
    </div>
  );
}

function ReportCard({ report: r }: { report: AdminReport }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmHide, setConfirmHide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) router.refresh();
      else setError(res.message ?? "잠시 후 다시 시도해주세요.");
    });
  }

  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-pill bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          {reportReasonLabel(r.reason)}
        </span>
        <span className="text-xs text-ink-soft">{formatKoreanDate(r.createdAt.slice(0, 10))}</span>
      </div>
      {r.detail && (
        <p className="whitespace-pre-wrap rounded-card bg-canvas px-3 py-2 text-sm text-ink">
          {r.detail}
        </p>
      )}
      <div className="border-t border-line pt-2">
        <p className="text-xs text-ink-soft">
          작성자 <span className="font-medium text-ink">{r.ownerName ?? "-"}</span>
          {r.ownerUsername && <span className="text-ink-soft/70"> ({r.ownerUsername})</span>}
          {" · "}신고자 <span className="font-medium text-ink">{r.reporterName ?? "-"}</span>
          {r.reporterUsername && <span className="text-ink-soft/70"> ({r.reporterUsername})</span>}
        </p>
        <p className="mt-1 font-semibold leading-snug text-ink">{r.prayerTitle}</p>
        {r.prayerDescription && (
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-soft">{r.prayerDescription}</p>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {confirmHide ? (
        <div className="flex flex-col gap-2 rounded-card border border-red-200 p-3">
          <p className="text-sm text-ink">
            이 기도제목을 숨길까요? 작성자와 함께 기도하는 사람 모두 더 이상 볼 수 없어요.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmHide(false)}
              className="min-h-[40px] flex-1 rounded-card border border-line text-sm text-ink-soft"
            >
              취소
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => adminHideReportedPrayer(r.prayerId))}
              className="min-h-[40px] flex-1 rounded-card bg-red-600 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "처리 중…" : "숨기기"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => adminResolveReport(r.reportId))}
            className="min-h-[40px] flex-1 rounded-card border border-line text-sm font-medium text-ink disabled:opacity-50"
          >
            문제없음 · 확인 완료
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmHide(true)}
            className="min-h-[40px] flex-1 rounded-card border border-red-200 text-sm font-semibold text-red-600 disabled:opacity-50"
          >
            기도제목 숨기기
          </button>
        </div>
      )}
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
