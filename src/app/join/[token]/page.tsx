import type { Metadata } from "next";
import Link from "next/link";
import { getAuthUser } from "@/features/auth/service";
import { getJoinPreview } from "@/services/prayers";
import { isValidShareTokenFormat } from "@/lib/token";
import { AppError } from "@/lib/errors";
import { JoinView } from "@/features/participant/JoinView";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

// 공유 페이지는 검색 색인 금지 (명세 82). OG 에도 실제 기도 내용 미포함 (명세 83).
export const metadata: Metadata = {
  title: "함께 기도해주세요",
  robots: { index: false, follow: false },
  openGraph: {
    title: "함께 기도해주세요",
    description: "누군가 당신에게 기도를 부탁했습니다.",
  },
};

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 잘못된 토큰 → 서비스 스타일 안내 (명세 79)
  if (!isValidShareTokenFormat(token)) {
    return <JoinError message="유효하지 않은 기도 초대예요." />;
  }

  const user = await getAuthUser();

  try {
    const preview = await getJoinPreview(token, user);
    return (
      <main className="app-shell">
        <JoinView preview={preview} isAuthed={Boolean(user)} />
      </main>
    );
  } catch (e) {
    const message =
      e instanceof AppError ? e.message : "기도 초대를 확인할 수 없어요.";
    return <JoinError message={message} />;
  }
}

function JoinError({ message }: { message: string }) {
  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col justify-center px-6">
        <EmptyState
          title={message}
          action={
            <Link href="/">
              <Button variant="secondary">처음으로</Button>
            </Link>
          }
        />
      </div>
    </main>
  );
}
