import Link from "next/link";
import { getAuthUser } from "@/features/auth/service";
import { Button } from "@/components/ui/Button";

/** 랜딩 (명세 61~63). 색인 허용(기본 metadata). */
const FEATURES = [
  {
    title: "기도제목을 나눠요",
    body: "QR이나 링크로 간단하게 전달합니다.",
  },
  {
    title: "매일 함께 기억해요",
    body: "오늘 기도할 사람을 확인하고 기도합니다.",
  },
  {
    title: "다음 만남을 이어가요",
    body: "기간이 끝나면 변화와 응답을 나눕니다.",
  },
];

export default async function LandingPage() {
  const user = await getAuthUser();
  const ctaHref = user ? "/home" : "/login";

  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col px-6 pb-16 pt-16">
        {/* Hero */}
        <section className="flex flex-col gap-4">
          <h1 className="text-[28px] font-bold leading-snug text-ink">
            한 번 나눈 기도제목을,
            <br />
            다음 만남까지 함께 품어요.
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            기도제목을 나누고, 매일 함께 기억하고, 다시 만났을 때 그 이후를
            물어볼 수 있어요.
          </p>
        </section>

        {/* 데모 mockup 3개 (명세 63) */}
        <section
          aria-hidden
          className="my-10 flex items-end justify-center gap-3"
        >
          {["기도제목 공유", "오늘의 기도", "기도 응답"].map((label, i) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2"
              style={{ transform: i === 1 ? "translateY(-8px)" : undefined }}
            >
              <div className="flex h-40 w-24 flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card">
                <div className="h-2 w-2/3 rounded-full bg-line" />
                <div className="h-8 rounded-lg bg-primary-soft" />
                <div className="h-2 w-full rounded-full bg-line" />
                <div className="h-2 w-4/5 rounded-full bg-line" />
                <div className="mt-auto h-6 rounded-lg bg-primary/80" />
              </div>
              <span className="text-[11px] text-ink-soft">{label}</span>
            </div>
          ))}
        </section>

        {/* 핵심 3가지 */}
        <section className="flex flex-col gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-4">
              <p className="font-semibold text-ink">{f.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{f.body}</p>
            </div>
          ))}
        </section>

        <div className="mt-10">
          <Link href={ctaHref}>
            <Button size="lg" fullWidth>
              시작하기
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
