import { BottomNavigation } from "@/components/BottomNavigation";
import { requireProfile } from "@/features/auth/service";

/**
 * 로그인 + 온보딩이 완료된 사용자만 접근 가능한 앱 영역.
 * 하단 네비게이션(명세 35)을 공통으로 렌더링.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile();

  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <BottomNavigation />
    </div>
  );
}
