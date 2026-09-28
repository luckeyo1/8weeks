import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/service";
import { requireAdmin } from "@/features/admin/guard";
import {
  getAdminOverview,
  getAdminPrayers,
  getAdminUsers,
} from "@/services/admin";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireProfile();
  await requireAdmin(); // 관리자 아니면 404

  const [overview, users, prayers] = await Promise.all([
    getAdminOverview(),
    getAdminUsers(),
    getAdminPrayers(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink">관리자</h1>
        <p className="mt-1 text-sm text-ink-soft">
          운영 현황과 기도 나눔 관계를 확인해요. 민감정보이니 신중히 다뤄주세요.
        </p>
      </div>
      <AdminDashboard overview={overview} users={users} prayers={prayers} />
    </div>
  );
}
