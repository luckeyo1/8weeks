import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/** 서비스 스타일 안내 (명세 79) */
export default function NotFound() {
  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col justify-center px-6">
        <EmptyState
          title="찾을 수 없는 페이지예요."
          description="주소가 바뀌었거나 사라진 것 같아요."
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
