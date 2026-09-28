import Link from "next/link";
import { getAuthUser } from "@/features/auth/service";
import { Button } from "@/components/ui/Button";

/** 서비스 소개 랜딩 (색인 허용). */
const STEPS = [
  {
    n: "1",
    title: "기도제목을 나눠요",
    body: "함께 기도했으면 하는 마음을 적고, QR이나 링크로 특정한 사람에게만 전해요.",
  },
  {
    n: "2",
    title: "매일 함께 기억해요",
    body: "오늘 함께 기도할 사람을 확인하고, 기도한 뒤 가볍게 체크해요.",
  },
  {
    n: "3",
    title: "다음 만남을 이어가요",
    body: "기간이 끝나면 변화와 응답을 나누고, 다시 만났을 때 그 이후를 물어봐요.",
  },
];

const FEATURES = [
  { title: "사람이 먼저예요", body: "기도제목 개수보다 함께 기도할 사람이 먼저 보여요." },
  { title: "조용하고 부담 없어요", body: "좋아요·팔로워·피드가 없어요. 매일 2번의 탭이면 충분해요." },
  { title: "링크 받은 사람만", body: "기도제목은 비공개예요. 초대받은 사람에게만 보여요." },
];

export default async function LandingPage() {
  const user = await getAuthUser();
  const ctaHref = user ? "/home" : "/signup";

  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col px-6 pb-20 pt-16">
        {/* Hero */}
        <section className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center rounded-pill bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            함께 기도하는 사람들
          </span>
          <h1 className="text-[28px] font-bold leading-snug text-ink">
            한 번 나눈 기도제목을,
            <br />
            다음 만남까지 함께 품어요.
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            기도제목을 나누고, 매일 함께 기억하고, 다시 만났을 때 그 이후를
            물어볼 수 있어요.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <Link href={ctaHref}>
              <Button size="lg" fullWidth>
                {user ? "홈으로" : "시작하기"}
              </Button>
            </Link>
            {!user && (
              <Link
                href="/login"
                className="text-center text-sm text-ink-soft hover:text-ink"
              >
                이미 계정이 있어요 · 로그인
              </Link>
            )}
          </div>
        </section>

        {/* 데모 mockup */}
        <section aria-hidden className="my-12 flex items-end justify-center gap-3">
          {["기도제목 공유", "오늘의 기도", "기도 응답"].map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div
                className="flex h-40 w-24 flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card"
                style={{ transform: i === 1 ? "translateY(-10px)" : undefined }}
              >
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

        {/* 작동 방식 */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-ink">이렇게 함께해요</h2>
          <ol className="flex flex-col gap-3">
            {STEPS.map((s) => (
              <li key={s.n} className="card flex gap-3 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {s.n}
                </span>
                <div>
                  <p className="font-semibold text-ink">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 특징 */}
        <section className="mt-10 flex flex-col gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-4">
              <p className="font-semibold text-ink">{f.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{f.body}</p>
            </div>
          ))}
        </section>

        {/* 마무리 CTA */}
        <section className="mt-12 flex flex-col items-center gap-4 rounded-card bg-primary-soft/60 px-6 py-10 text-center">
          <p className="text-lg font-bold text-ink">
            함께 기도했으면 하는 마음을
            <br />
            나눠보세요.
          </p>
          <Link href={ctaHref} className="w-full max-w-xs">
            <Button size="lg" fullWidth>
              {user ? "홈으로" : "시작하기"}
            </Button>
          </Link>
        </section>
      </div>
    </main>
  );
}
