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

이 저장소는 **Cloudflare 스택**으로 구성되어 있습니다(호스팅·DB·인증 모두 Cloudflare).

---

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 15 (App Router) + React 18 |
| 언어 | TypeScript (strict) |
| 스타일 | Tailwind CSS, Pretendard |
| 호스팅 | **Cloudflare Workers** (OpenNext 어댑터) |
| DB | **Cloudflare D1** (SQLite) |
| 인증 | **Google OAuth 2.0 + 서명된 세션 쿠키(HMAC)** — 비밀번호 없음 |
| 폼/검증 | React Hook Form + Zod (클라이언트 + 서버 이중 검증) |
| QR | qrcode.react |
| PWA | manifest + service worker |
| 테스트 | Vitest(단위) + Playwright(E2E) |

> **참고:** 명세의 매직링크 로그인은 이메일 발송 인프라가 필요해 Cloudflare 단독
> 구성에서는 제외했습니다. "비밀번호 없는 로그인"은 Google OAuth 로 제공합니다.
> (매직링크가 필요하면 Resend 등 이메일 서비스를 붙일 수 있습니다 — Known issues 참고)

---

## 사전 준비

- Node.js 20+ (권장 22)
- Cloudflare 계정 + [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
  (`npx wrangler`)
- Google OAuth 클라이언트 (아래 설정 참고)

### Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/) → **API 및 서비스 →
   사용자 인증 정보 → OAuth 클라이언트 ID 만들기 → 웹 애플리케이션**
2. **승인된 리디렉션 URI** 에 추가:
   - 로컬: `http://localhost:3000/auth/callback`
   - 배포: `https://<배포도메인>/auth/callback`
3. 발급된 **클라이언트 ID / 클라이언트 보안 비밀** 을 아래 환경변수로 사용

---

## 로컬 개발

```bash
npm install

# 1) 공개 값 (.env.local)
cp .env.example .env.local        # NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 2) 서버 비밀키 (.dev.vars) — Google, 세션키
cp .dev.vars.example .dev.vars    # GOOGLE_CLIENT_ID / SECRET / SESSION_SECRET 채우기

# 3) 로컬 D1 준비 (SQLite)
npm run db:migrate:local          # 스키마 적용 (migrations/0001_init.sql)
npm run db:seed:local             # 개발용 seed (선택)

# 4) 개발 서버
npm run dev                       # http://localhost:3000
```

`next dev` 는 OpenNext 의 `initOpenNextCloudflareForDev()` 로 D1(로컬 SQLite)과
`.dev.vars` 를 주입합니다.

---

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (일반 Next) |
| `npm run typecheck` | 타입 검사 |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:e2e` | E2E (Playwright) |
| `npm run cf:build` | Cloudflare 용 빌드 (OpenNext) |
| `npm run cf:preview` | Workers 런타임 로컬 미리보기 |
| `npm run cf:deploy` | 빌드 + Cloudflare 배포 |
| `npm run db:migrate:local` / `:remote` | D1 마이그레이션 적용 |
| `npm run db:seed:local` / `:remote` | D1 seed 실행 |

---

## Cloudflare 배포

```bash
# 0) 로그인
npx wrangler login

# 1) D1 데이터베이스 생성 → 출력된 database_id 를 wrangler.jsonc 에 반영
npx wrangler d1 create prayer-together-db
#   wrangler.jsonc 의 "database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID" 교체

# 2) 원격 D1 마이그레이션 (+ 필요 시 seed)
npm run db:migrate:remote

# 3) 비밀키 등록
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
#   공개 값 NEXT_PUBLIC_SITE_URL 은 wrangler.jsonc 의 "vars" 또는 대시보드에 등록

# 4) 배포
npm run cf:deploy
```

배포 후:

- 워커 도메인(`https://<name>.<계정>.workers.dev` 또는 커스텀 도메인)을
  `NEXT_PUBLIC_SITE_URL` 로 설정
- Google OAuth 승인된 리디렉션 URI 에 `https://<도메인>/auth/callback` 추가

> **대시보드 연동 배포**: Workers & Pages → *Import a repository* → 빌드 명령
> `npx opennextjs-cloudflare build`, 배포 명령 `npx opennextjs-cloudflare deploy`.
> Variables and Secrets 에 위 값들을 등록하고, D1 바인딩 `DB` 를 연결합니다.

관련 파일: `wrangler.jsonc`, `open-next.config.ts`, `migrations/`, `seed.sql`,
`.dev.vars.example`.

## PWA 확인

- 프로덕션 실행 후 모바일 브라우저에서 "홈 화면에 추가"
- standalone 실행 / 아이콘 / 테마 컬러 확인 (`public/icons/*.svg`, `manifest`)
- 서비스워커는 `NODE_ENV=production` 에서만 등록 (`public/sw.js`)

---

## 테스트

### 단위 테스트 (Vitest)

`기간 계산 / timezone 날짜 변환 / shareToken 생성 / status transition` 등 순수
로직을 검증합니다.

```bash
npm test
```

### E2E (Playwright)

- `tests/e2e/public.spec.ts` — 로그인 불필요 흐름(랜딩, 로그인 진입, 잘못된 초대
  토큰, 보호 페이지 리다이렉트)
- `tests/e2e/qa-scenarios.spec.ts` — 명세 69~78 시나리오. 로그인 세션이 필요하며,
  `pt_session` 쿠키를 발급한 storageState 준비 후 `E2E_AUTH_READY=1` 로 활성화합니다.

---

## 아키텍처 / 디렉토리

```
src/
  app/                      # 라우트 (App Router)
    (app)/                  #   로그인+온보딩 완료 사용자 영역 (BottomNav)
      home/ my-prayers/ profile/
      prayers/new/  prayers/[id]/
    join/[token]/           #   공유 링크/QR 진입 (공개, noindex)
    login/ onboarding/
    auth/google/            #   Google 로그인 시작 (state 쿠키 → 동의 화면)
    auth/callback/          #   code 교환 → 사용자 upsert → 세션 쿠키 발급
    manifest.ts robots.ts
  components/               # 공통 UI
  features/                 # auth / prayer / participant / check
  services/                 # D1 데이터 접근 레이어 (권한 필터링)
  lib/
    cf.ts                   #   Cloudflare 컨텍스트(D1/secret) 접근
    db.ts                   #   D1 얇은 쿼리 헬퍼
    auth/session.ts         #   HMAC 서명 세션 토큰
    auth/google.ts          #   Google OAuth 헬퍼
    date.ts token.ts status.ts errors.ts
  types/                    # db(Row) / domain(화면용) 타입
migrations/0001_init.sql    # D1 스키마 (SQLite)
seed.sql                    # 개발용 seed (마이그레이션과 분리)
wrangler.jsonc              # Workers + D1 바인딩
open-next.config.ts
```

### 보안 모델 (명세 31~33)

- **서버가 권한의 근거.** 모든 조회/변경은 서버(Server Actions/service)에서
  현재 사용자 기준으로 검증합니다. D1 에는 RLS 가 없으므로, 클라이언트에서 DB 에
  직접 접근하는 경로 자체를 두지 않고 서버 레이어에서만 접근합니다.
- **세션**은 HMAC-SHA256 으로 서명한 상태 없는 쿠키(`pt_session`, httpOnly)입니다.
  위조 불가하며 만료(exp)를 포함합니다.
- **shareToken** 은 prayer id 와 분리된 22자 난수(base62)로 추측 불가능합니다.
- **삭제는 soft delete**(`status='DELETED'`) 로 처리하고 화면에서 감춥니다.
- **SEO**: 랜딩만 색인 허용, `join`/`prayers`/`profile` 등은 noindex + robots 차단.
  공유 OG 미리보기에는 실제 기도 내용을 넣지 않습니다.

---

## 기능 목록 (완료 기준, 명세 98)

- [x] 가입 (Google 로그인, 비밀번호 없음) + 온보딩(닉네임)
- [x] 기도제목 생성 (제목 50자, 상세 500자, 기간 7/14/30/직접 1~90일)
- [x] shareToken + QR 생성, 링크 복사
- [x] 공유 진입 → 비로그인 미리보기 → 로그인 후 원래 링크 복귀(returnUrl)
- [x] 본인/중복 참여 방지 (서버 검증 + D1 unique)
- [x] 매일 기도 체크 (같은 날 중복 불가, 새로고침 유지)
- [x] 종료일 자동 처리 (진입 시 서버 재확인 — 배치 비의존)
- [x] 기간 연장 / 변화 / 응답 / 마침 + 참여자에게 결과 표시
- [x] 참여 중단 (체크 기록 유지), 소프트 삭제
- [x] URL 직접 접근 권한 검증 / 에러·로딩·빈 상태 / 모바일 UI / PWA
- [x] 관계의 숫자화 금지 (개별 기도 횟수 비노출, 기간 aggregate 만)

---

## Known issues / 향후 과제

- **매직링크 로그인 미포함.** Cloudflare 단독 구성이라 이메일 발송 인프라가 없어
  Google OAuth 로 대체했습니다. 필요하면 Resend/MailChannels 등을 붙여 매직링크를
  추가할 수 있습니다(세션 발급 로직은 그대로 재사용 가능).
- **알림 미구현 (명세 21/58/59).** `prayer_updates` 로 확장 여지는 두었습니다.
- **프로필 이미지 업로드 미구현.** Google 프로필 사진을 기본 아바타로 사용하며,
  없으면 닉네임 첫 글자로 대체합니다.
- **"오늘" 기준 timezone.** 서버·클라 동일한 서비스 timezone(기본 Asia/Seoul)으로
  계산합니다. `NEXT_PUBLIC_APP_TIME_ZONE` 로 변경 가능.
- **종료일 전환**은 조회 시 지연(lazy) 처리합니다. 대량 트래픽에서는 Cron Trigger 로
  주기적 sweep 을 붙일 수 있습니다.
- **E2E 인증 시나리오**는 세션 쿠키 storageState 준비 후 실행합니다.

---

## 제품 원칙 (요약)

- SNS 처럼 만들지 않습니다. 기도제목보다 **사람**이 먼저 보입니다.
- 매일 사용은 짧고 부담 없게. 죄책감을 주는 UI 를 쓰지 않습니다.
- 차분하고 현대적인 톤. 과한 종교적 이미지·마케팅 카피·의미 없는 숫자 지표를
  넣지 않습니다.
