# 기도 동행 (Prayer Together)

> 한 번 나눈 기도제목을 다음 만남까지 함께 품는 서비스.

기독교인이 서로의 기도제목을 나누고, 일정 기간 함께 기도하며, 매일 기도 여부를
기록하고, 기간이 끝나면 변화나 응답을 확인할 수 있는 **관계 중심**의 기도 웹앱입니다.
공개 피드·좋아요·팔로워 같은 SNS 요소는 넣지 않았습니다. 기도제목은 기본 비공개이며,
링크 또는 QR을 받은 사람만 볼 수 있습니다.

핵심 루프:

```
만남 → 기도제목 작성 → QR/링크 공유 → 상대방 수락 → 매일 중보기도
     → 기간 종료 → 업데이트(연장/변화/응답/마침) → 다시 만남
```

---

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 15 (App Router) + React 18 |
| 언어 | TypeScript (strict) |
| 스타일 | Tailwind CSS, Pretendard |
| 인증 | Supabase Auth (Google OAuth / 이메일 매직링크, 비밀번호 미사용) |
| DB | Supabase PostgreSQL + Row Level Security |
| 폼/검증 | React Hook Form + Zod (클라이언트 + 서버 이중 검증) |
| QR | qrcode.react |
| 날짜 | date-fns / Intl |
| PWA | manifest + service worker |
| 배포 | Vercel |
| 테스트 | Vitest(단위) + Playwright(E2E) |

---

## 빠른 시작 (로컬)

### 1. 사전 준비

- Node.js 20+ (권장 22)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (로컬 DB 사용 시)

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수

`.env.example` 를 복사해 `.env.local` 을 만듭니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용.** service role key. 절대 클라이언트에 노출 금지 |
| `NEXT_PUBLIC_SITE_URL` | 공유 링크/QR/OG 에 쓰는 서비스 주소 (배포 시 실제 도메인) |
| `NEXT_PUBLIC_APP_TIME_ZONE` | (선택) "오늘" 판정 기준 timezone. 기본 `Asia/Seoul` |

### 4. Supabase 설정

**A) Supabase CLI 로 로컬 DB (권장, 개발용)**

```bash
supabase start           # 로컬 스택 기동
supabase db reset        # migrations + seed 적용
```

`supabase start` 가 출력하는 `API URL`, `anon key`, `service_role key` 를
`.env.local` 에 넣습니다.

**B) Supabase 클라우드 프로젝트**

1. 프로젝트 생성 후 Settings → API 에서 URL/키 확인 → `.env.local`
2. SQL Editor 에서 순서대로 실행:
   - `supabase/migrations/0001_init.sql` (스키마)
   - `supabase/migrations/0002_rls.sql` (RLS 정책)
   - (개발 데이터가 필요하면) `supabase/seed.sql`
3. Authentication → Providers 에서 **Google** 활성화, **Email(매직링크)** 활성화
4. Authentication → URL Configuration 의 Redirect URLs 에 다음 추가:
   - `http://localhost:3000/auth/callback`
   - `https://<배포도메인>/auth/callback`

### 5. 실행

```bash
npm run dev      # http://localhost:3000
```

---

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 타입 검사 (`tsc --noEmit`) |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:e2e` | E2E 테스트 (Playwright) |

---

## 프로덕션 빌드 & Vercel 배포

```bash
npm run build && npm run start
```

Vercel:

1. 저장소를 Vercel 에 연결
2. Environment Variables 에 위 4개 변수 등록
   (`SUPABASE_SERVICE_ROLE_KEY` 는 Production/Preview 서버 환경에만)
3. `NEXT_PUBLIC_SITE_URL` 을 실제 배포 도메인으로 설정
4. Supabase Redirect URLs 에 배포 도메인 `/auth/callback` 추가
5. 배포

## Cloudflare 배포 (Vercel 대안)

Cloudflare Workers 에 [OpenNext Cloudflare 어댑터](https://opennext.js.org/cloudflare)로
배포할 수 있습니다. **Cloudflare 는 Next.js 앱을 호스팅**하고, **로그인·DB 는 그대로
Supabase** 를 사용합니다(Cloudflare 가 Supabase 를 대체하지 않음).

```bash
# 1) Cloudflare 로그인 (최초 1회)
npx wrangler login

# 2) 로컬 미리보기 (Workers 런타임으로 실제 실행)
cp .dev.vars.example .dev.vars   # 값 채우기
npm run cf:preview               # http://localhost:8788

# 3) 배포
npm run cf:deploy
```

비밀키는 저장소에 두지 말고 아래처럼 주입합니다.

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# 공개 값(NEXT_PUBLIC_*)은 wrangler.jsonc 의 "vars" 또는
# 대시보드 Settings → Variables and Secrets 에 등록
```

배포 후 워커 도메인(`https://<name>.<계정>.workers.dev` 또는 커스텀 도메인)을
`NEXT_PUBLIC_SITE_URL` 로 설정하고, Supabase Authentication → URL Configuration 의
Redirect URLs 에 `https://<도메인>/auth/callback` 을 추가합니다.

> **대시보드 연동 배포**: Cloudflare 대시보드 → Workers & Pages → *Import a repository*
> 로 GitHub 저장소를 연결하면, 빌드 명령 `npx opennextjs-cloudflare build`,
> 배포 명령 `npx opennextjs-cloudflare deploy` 로 자동 배포됩니다.

관련 파일: `wrangler.jsonc`, `open-next.config.ts`, `.dev.vars.example`.

## PWA 확인

- 빌드/프로덕션 실행 후 모바일 브라우저에서 "홈 화면에 추가"
- standalone 으로 실행되는지, 앱 아이콘/테마 컬러가 적용되는지 확인
- 서비스워커는 `NODE_ENV=production` 에서만 등록됩니다 (`public/sw.js`)
- 아이콘은 `public/icons/*.svg` 사용. 스토어 수준 배포 시 192/512 PNG 추가 권장

---

## 테스트

### 단위 테스트 (Vitest)

`기간 계산 / timezone 날짜 변환 / shareToken 생성 / status transition /
기도 체크 중복 검사` 등 순수 로직을 검증합니다. (명세 89)

```bash
npm test
```

### E2E 테스트 (Playwright)

- `tests/e2e/public.spec.ts` — 로그인 불필요한 공개 흐름(랜딩, 로그인 진입,
  잘못된 초대 토큰, 보호 페이지 리다이렉트)
- `tests/e2e/qa-scenarios.spec.ts` — 명세 69~78 의 핵심 시나리오.
  로그인 세션이 필요하므로 아래 준비 후 `E2E_AUTH_READY=1` 로 활성화합니다.
  - Supabase 테스트 프로젝트에 migration + seed 적용
  - 사용자 A/B 의 사전 로그인 세션(storageState) 준비
  - `E2E_BASE_URL` 로 대상 환경 지정

```bash
npm run build
npm run test:e2e
```

---

## 아키텍처 / 디렉토리

```
src/
  app/                      # 라우트 (App Router)
    (app)/                  #   로그인+온보딩 완료 사용자 영역 (BottomNav)
      home/                 #   홈: 오늘 함께 기도할 사람
      my-prayers/           #   나의 기도 / 함께 기도 중
      prayers/new/          #   기도제목 생성
      prayers/[id]/         #   상세 (작성자/참여자 뷰 분기)
      profile/              #   내 정보
    join/[token]/           #   공유 링크/QR 진입 (공개, noindex)
    login/ onboarding/      #   인증/온보딩
    auth/callback/          #   OAuth/매직링크 콜백 (returnUrl 복귀)
    manifest.ts robots.ts   #   PWA / SEO
  components/               # 공통 UI (Button, Input, Card, Modal, Toast ...)
  features/                 # 기능별 (auth / prayer / participant / check)
  services/                 # DB 접근 레이어 (권한 필터링)
  lib/                      # env, supabase 클라이언트, date, token, status, errors
  types/                    # db(스키마) / domain(화면용) 타입
supabase/
  migrations/               # 0001_init.sql, 0002_rls.sql
  seed.sql                  # 개발용 seed (사용자 4, 기도제목 5)
```

### 보안 모델 (명세 31~33)

- **서버가 권한의 근거.** 모든 조회/변경은 서버(Server Actions/service)에서
  현재 사용자 기준으로 검증합니다. service_role 클라이언트는 서버에서만
  쓰이고, 화면에는 필요한 필드(닉네임/프로필/기도 내용)만 내려갑니다.
  email·내부 id 는 노출하지 않습니다.
- **RLS 는 2차 방어선.** anon key 로의 직접 접근을 owner/participant 기준으로
  차단합니다 (`0002_rls.sql`).
- **shareToken** 은 prayer id 와 분리된 22자 난수(base62)로, 추측 불가능합니다.
- **삭제는 soft delete** (`status = DELETED`) 로 처리하고 화면에서 감춥니다.
- **SEO**: 랜딩만 색인 허용, `join`/`prayers`/`profile` 등은 noindex + robots 차단.
  공유 OG 미리보기에는 실제 기도 내용을 넣지 않습니다.

---

## 기능 목록 (완료 기준, 명세 98)

- [x] 가입 (Google / 매직링크, 비밀번호 없음) + 온보딩(닉네임)
- [x] 기도제목 생성 (제목 50자, 상세 500자, 기간 7/14/30/직접 1~90일)
- [x] shareToken + QR 생성, 링크 복사
- [x] 공유 링크/QR 진입 → 비로그인 미리보기 → 로그인 후 원래 링크 복귀(returnUrl)
- [x] 본인 기도 참여 방지 / 중복 참여 방지 (DB unique + 서버 검증)
- [x] 참여 확인 → 홈 "오늘 함께 기도할 사람" 자동 노출
- [x] 매일 기도 체크 (같은 날 중복 불가 — DB unique, 새로고침 후 유지)
- [x] 종료일 자동 처리 (진입 시 서버 재확인 — cron 비의존)
- [x] 기간 연장 / 변화 / 응답 / 마침 + 참여자에게 결과 표시
- [x] 참여 중단 (체크 기록 유지)
- [x] 기도제목 삭제 (soft delete)
- [x] URL 직접 접근 권한 검증 / 에러·로딩·빈 상태 / 모바일 UI / PWA
- [x] 관계의 숫자화 금지 (개별 기도 횟수 비노출, 기간 aggregate 만 노출)

---

## Known issues / 향후 과제

- **알림 미구현 (명세 21/58/59).** 데이터 구조(`prayer_updates`)는 확장 가능하게
  두었으나, Push/일일 요약 알림은 MVP 범위 밖입니다.
- **프로필 이미지 업로드 미구현.** 컬럼(`profile_image_url`)은 있으나 온보딩에서는
  닉네임만 받습니다. 이미지 없으면 닉네임 첫 글자 아바타로 대체합니다.
- **"오늘" 기준 timezone.** 명세는 "사용자 local timezone"을 말하지만, 서버 검증과
  하이드레이션에서 날짜가 꼬이지 않도록 서버·클라이언트가 **동일한 서비스
  timezone(기본 Asia/Seoul)** 으로 "오늘"을 계산합니다. `NEXT_PUBLIC_APP_TIME_ZONE`
  로 변경할 수 있습니다.
- **종료일 배치.** 만료는 조회 시점에 지연 전환(lazy)합니다. 대량 트래픽에서는
  별도 cron 을 붙일 수 있으나, 조회 시 재확인하므로 cron 실패에도 상태가 꼬이지
  않습니다.
- **PWA 아이콘**은 SVG 만 포함합니다. 앱스토어/일부 구형 iOS 대응이 필요하면
  192/512 PNG 를 추가하세요.
- **E2E 인증 시나리오**는 seed 세션 준비가 필요합니다(위 테스트 항목 참고).

---

## 제품 원칙 (요약)

- SNS 처럼 만들지 않습니다. 기도제목보다 **사람**이 먼저 보입니다.
- 매일 사용은 짧고 부담 없게. 죄책감을 주는 UI(불참일 강조 등)를 쓰지 않습니다.
- 차분하고 현대적인 톤. 과한 종교적 이미지·마케팅 카피·의미 없는 숫자 지표를
  넣지 않습니다.
