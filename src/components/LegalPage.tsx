import Link from "next/link";
import Image from "next/image";

/** 개인정보 처리방침 / 이용약관 등 정적 안내 페이지 공통 셸 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col px-6 pb-16 pt-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-md"
          />
          <span className="font-semibold text-ink">기도 동행</span>
        </Link>

        <h1 className="text-xl font-bold text-ink">{title}</h1>
        <p className="mt-1 text-[13px] text-ink-soft">최종 업데이트 · {updatedAt}</p>

        <div className="legal-body mt-6 flex flex-col gap-6 text-[15px] leading-relaxed text-ink-soft">
          {children}
        </div>

        <nav className="mt-10 flex items-center gap-3 border-t border-line pt-6 text-[13px] text-ink-soft">
          <Link href="/privacy" className="hover:text-ink">
            개인정보 처리방침
          </Link>
          <span aria-hidden className="text-line">·</span>
          <Link href="/terms" className="hover:text-ink">
            이용약관
          </Link>
        </nav>
      </div>
    </main>
  );
}

/** 섹션 제목 + 본문 */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[16px] font-semibold text-ink">{heading}</h2>
      {children}
    </section>
  );
}
