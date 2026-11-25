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
| 프레임워크 | Next.js 16 (App Router) + React 18 |
| 언어 | TypeScript (strict) |
| 스타일 | Tailwind CSS, Pretendard |
| 호스팅 | **Cloudflare Workers** (OpenNext 어댑터) |
| DB | **Cloudflare D1** (SQLite) |
| 인증 | **아이디/비밀번호(PBKDF2) + 카카오 로그인(OAuth 2.0)**, 서명된 세션 쿠키(HMAC) |
| 폼/검증 | React Hook Form + Zod (클라이언트 + 서버 이중 검증) |
| QR | qrcode.react |
| PWA | manifest + service worker |
| 테스트 | Vitest(단위) + Playwright(E2E) |

> **참고:** 명세의 매직링크 로그인은 이메일 발송 인프라가 필요해 Cloudflare 단독
> 구성에서는 제외했습니다. "비밀번호 없는 로그인"은 카카오 로그인으로 제공합니다.

---

## 사전 준비

- Node.js 20+ (권장 22)
- Cloudflare 계정 + [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
  (`npx wrangler`)
- (선택) 카카오 로그인용 Kakao Developers 앱 (아래 설정 참고)

### 카카오 로그인 설정 (선택)

키를 등록하지 않으면 카카오 버튼이 숨겨지고 아이디 로그인만 동작합니다.

1. [Kakao Developers](https://developers.kakao.com/) → 내 애플리케이션 → 애플리케이션 추가
2. **앱 키 → REST API 키** 를 `KAKAO_REST_API_KEY` 로 사용
3. **플랫폼 → Web** 에 사이트 도메인 등록 (`https://<배포도메인>`, 로컬은 `http://localhost:3000`)
4. **카카오 로그인 → 활성화 ON**, **Redirect URI** 등록:
   - 배포: `https://<배포도메인>/auth/kakao/callback`
   - 로컬: `http://localhost:3000/auth/kakao/callback`
5. **동의항목 → 닉네임(profile_nickname)** 을 필수 동의로 설정 (이름으로 사용).
   이메일·프로필 사진 등 다른 항목은 받지 않습니다.
6. (보안 권장) **Client Secret** 을 "사용함"으로 켰다면 `KAKAO_CLIENT_SECRET` 등록
7. (선택) 회원 탈퇴 시 카카오 연결 끊기: **앱 키 → 어드민 키** 를 `KAKAO_ADMIN_KEY` 로
   등록 (서버 비밀키 — 절대 클라이언트에 노출 금지)
8. D1 에 `migrations/0011_kakao_login.sql` 적용 (`users.kakao_id`)

계정 연결 원칙: 카카오 회원번호로만 계정을 찾습니다(이메일로 자동 병합하지 않음).
기존 아이디 사용자는 **내 정보 → 카카오 계정 연결하기** 로 직접 연결합니다.

---

## 로컬 개발

```bash
npm install

# 1) 공개 값 (.env.local)
cp .env.example .env.local        # NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 2) 서버 비밀키 (.dev.vars) — 세션키 (+ 선택: 카카오)
cp .dev.vars.example .dev.vars    # SESSION_SECRET (+ KAKAO_REST_API_KEY 등) 채우기

# 3) 로컬 D1 준비 (SQLite)
npm run db:migrate:local          # 스키마 적용 (migrations/0001_init.sql)
npm run db:seed:local             # 개발용 seed (선택)

# 4) 개발 서버
npm run dev                       # http://localhost:3000
```

`next dev` 는 OpenNext 의 `initOpenNextCloudflareForDev()` 로 D1(로컬 SQLite)과
`.dev.vars` 를 주입합니다.

---

## 매일 알림 (웹 푸시)

사용자가 **내 정보 → 매일 알림**을 켜고 시간을 고르면(04:00~23:30, 30분 단위, 기본 08:00)
매일 그 시간에 한 번 알림이 갑니다.

- **스케줄:** `worker.ts` 가 OpenNext 생성 워커를 감싸 `scheduled()` 를 추가하고,
  `wrangler.jsonc` 의 `triggers.crons`(`*/15 * * * *`, 15분마다)로 실행됩니다. 크론은
  `/api/push/run` 을 같은 워커 안에서 호출하고, 정한 시각이 지났고(2시간 이내) 오늘 아직
  안 보낸 사람에게만 보냅니다(`users.reminder_sent_date` 로 하루 한 번).
- **개인정보:** 푸시 서비스(Google·Apple)에는 데이터 없는 푸시만 보냅니다. 기기의
  서비스워커가 `/api/push/message` 에서 로그인 세션으로 문구를 직접 받아 띄웁니다
  (기도할 제목 개수 + 오늘의 말씀, 기도 제목·내용은 넣지 않음).
- **필요한 설정 (Cloudflare Secrets):**

  ```bash
  npx web-push generate-vapid-keys        # 공개키/개인키 생성 (로컬에서 한 번)
  npx wrangler secret put VAPID_PUBLIC_KEY
  npx wrangler secret put VAPID_PRIVATE_KEY
  npx wrangler secret put VAPID_SUBJECT     # 예: mailto:운영자@도메인
  npx wrangler secret put CRON_SECRET       # 임의의 긴 문자열 (openssl rand -hex 24)
  ```
- **DB:** `migrations/0012_reminder_time.sql` (`users.reminder_time`, `reminder_sent_date`).
  적용 전에는 시간 선택이 숨겨지고 크론은 발송하지 않습니다.
- **로컬 테스트:** `npx wrangler dev --test-scheduled` 후
  `curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=*%2F15+*+*+*+*"`.
  개발 모드에서는 `/api/push/run?now=<ISO 시각>` 으로 시각을 지정할 수 있습니다.

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
npx wrangler secret put SESSION_SECRET
# (선택) 카카오 로그인
npx wrangler secret put KAKAO_REST_API_KEY
npx wrangler secret put KAKAO_CLIENT_SECRET   # Client Secret 사용 시
npx wrangler secret put KAKAO_ADMIN_KEY       # 탈퇴 시 연결 끊기 사용 시
#   공개 값 NEXT_PUBLIC_SITE_URL 은 wrangler.jsonc 의 "vars" 또는 대시보드에 등록

# 4) 배포
npm run cf:deploy
```

배포 후:

- 워커 도메인(`https://<name>.<계정>.workers.dev` 또는 커스텀 도메인)을
  `NEXT_PUBLIC_SITE_URL` 로 설정
- (카카오 사용 시) Kakao Developers Redirect URI 에 `https://<도메인>/auth/kakao/callback` 추가

> **대시보드 연동 배포**: Workers & Pages → *Import a repository* → 빌드 명령
> `npx opennextjs-cloudflare build`, 배포 명령 `npx opennextjs-cloudflare deploy`.
> Variables and Secrets 에 위 값들을 등록하고, D1 바인딩 `DB` 를 연결합니다.

관련 파일: `wrangler.jsonc`, `open-next.config.ts`, `migrations/`, `seed.sql`,
`.dev.vars.example`.

## 안드로이드 앱 (구글 플레이스토어)

`android/` 에 웹앱을 TWA(Trusted Web Activity)로 감싼 안드로이드 앱이 있습니다.
화면·기능은 웹 배포만으로 앱에 반영되고, `android/` 를 바꿀 때만 앱을 다시 올립니다.
빌드는 GitHub Actions(`.github/workflows/android.yml`)가 하고, 앱 인증 파일
`/.well-known/assetlinks.json` 은 `src/lib/android.ts` 의 서명 지문으로 응답합니다.
출시 절차는 [`android/README.md`](android/README.md) 를 참고하세요.

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
    auth/kakao/             #   카카오 로그인 시작 (state 쿠키 → 동의 화면)
    auth/kakao/callback/    #   code 교환 → 회원번호로 계정 찾기/만들기(또는 연결) → 세션
    manifest.ts robots.ts
  components/               # 공통 UI
  features/                 # auth / prayer / participant / check / bible
  services/                 # D1 데이터 접근 레이어 (권한 필터링)
  lib/
    cf.ts                   #   Cloudflare 컨텍스트(D1/secret) 접근
    db.ts                   #   D1 얇은 쿼리 헬퍼
    auth/session.ts         #   HMAC 서명 세션 토큰
    auth/kakao.ts           #   카카오 OAuth 헬퍼 (URL·토큰·프로필·연결 끊기)
    date.ts token.ts status.ts errors.ts
    bible/                  #   오늘의 말씀(verses.ts, 자동 생성) · 66권/장 도우미(books.ts)
  types/                    # db(Row) / domain(화면용) 타입
worker.ts                   # Workers 진입점: OpenNext 워커 + 크론(매일 알림)
migrations/0001_init.sql    # D1 스키마 (SQLite) — 이후 0002~0013 증분
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

- [x] 가입: 아이디/비밀번호(+복구 코드) 또는 카카오 로그인, 기존 계정에 카카오 연결
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
- [x] 홈 "오늘의 말씀" (날마다 바뀌는 구절, 개역한글) + 성경 읽기 습관 체크
  (하루 1회, 이번 주 일~토 표시, 본인만 보임 — 연속 기록/끊김 경고 없음)
- [x] 성경 읽은 곳 기록 (책·장 선택, 지난번 다음 장 미리 선택) + 통독 현황 페이지(`/bible`)
- [x] 초대 흐름: 초대 페이지(누가·무엇을·비공개 안내) → 가입(초대 배너) → 초대 페이지로 복귀
- [x] 공유: 기기 공유 시트(카카오톡 등) / 초대 메시지 복사 / QR, 만든 직후 초대 안내
- [x] 홈 "시작하기" 체크리스트(가입 → 첫 기도제목 → 초대), 내 기도에 함께하는 사람 표시
- [x] 성경 탭 · 성경 읽기 (개역한글 66권 전체, 장 단위 읽기 화면, 글자 크기, 이전/다음 장,
  "이 장 다 읽었어요" → 읽은 곳 기록에 반영, 이어 읽기, 오늘의 말씀 → 해당 절로 이동,
  한 번 읽은 장은 오프라인에서도 열림)
- [x] 성경 듣기 (기기 내장 음성으로 한 장을 소리로 읽기 — 읽는 절 표시·따라가기, 일시정지/이어 듣기,
  이전/다음 절, 속도 0.8~1.5배, 읽는 동안 화면 켜 둠, 끝나면 "다 읽었어요"·다음 장 듣기 권유,
  목소리 고르기·들어보기 + 기기별 고음질 음성 받는 법 안내)
- [x] 이용 통계 (기능별 하루 사용 횟수 합계만, 누가 썼는지 저장 안 함 → 관리자 › 이용 통계, migrations/0013)
- [x] 기도제목 신고 (함께 기도하는 사람 → 운영자 관리 화면에서 확인 완료/숨기기,
  구글 플레이 사용자 제작 콘텐츠 정책 대응, migrations/0010)
- [x] 계정 삭제 안내 페이지(`/account-deletion`, 플레이스토어 '계정 삭제 URL')

---

## 오늘의 말씀 데이터

- 본문: **성경전서 개역한글판 (대한성서공회)** — 저작재산권 보호기간 만료(퍼블릭
  도메인). 개역개정·새번역 등은 저작권이 있어 허가 없이 쓸 수 없습니다.
- `src/lib/bible/verses.ts` 는 `scripts/bible/gen_verses.py` 가 만든 파일입니다.
  본문을 손으로 고치지 말고(동일성유지권), 구절을 바꾸려면 스크립트의 `REFS` 를
  수정해 다시 생성합니다. 스크립트는 holybible.or.kr 정본을 bible.bskorea.or.kr 본과
  대조해 **두 본문이 일치하는 구절만** 채택합니다.

  ```bash
  git clone --depth 1 https://github.com/crizin/bible-db /tmp/bible-db
  python3 scripts/bible/gen_verses.py \
    /tmp/bible-db/data/krv/krv_holybible.jsonl \
    /tmp/bible-db/data/krv/krv_bskorea.jsonl \
    src/lib/bible/verses.ts
  ```
- 같은 날에는 모든 사용자에게 같은 구절이 보이고, 날마다 다음 구절로 넘어갑니다
  (현재 210구절 → 약 7개월 주기).
- **성경 읽기(본문 전체)**: `public/bibledata/krv/<책>/<장>.json` (장별 1,189개, 31,101절)은
  `scripts/bible/gen_chapters.py` 가 만든 파일입니다. 정본(holybible.or.kr)을 그대로 쓰고 앞뒤 공백만
  정리합니다. 본문을 손으로 고치지 마세요. 화면 하단에 "성경전서 개역한글판 (대한성서공회)"를 표기합니다.

  ```bash
  python3 scripts/bible/gen_chapters.py \
    /tmp/bible-db/data/krv/krv_holybible.jsonl public/bibledata/krv
  ```
- **성경 듣기(TTS)**: 휴대폰·PC에 들어 있는 음성 합성(Web Speech API)을 씁니다 — 서버·키·비용 없음,
  한 번 열린 장은 오프라인에서도 들을 수 있습니다(기기 음성이 오프라인 지원일 때).
  - 절마다(긴 절은 자연스러운 곳에서 100자 이하로 나눠) 읽습니다. 일부 브라우저가 긴 문장을 중간에 끊기 때문입니다.
  - `(없음)`, `(3절에 포함되어 있음)` 같은 빈 절은 건너뛰고, 괄호·낫표 기호는 읽지 않습니다(본문은 그대로).
  - 한국어 음성이 없는 기기는 영어 음성으로 읽지 않고 내려받는 방법을 안내합니다. 음성 합성이 없는 브라우저
    (일부 앱 안 브라우저)에서는 듣기 버튼이 보이지 않습니다.
  - 들은 장을 자동으로 기록하지 않습니다. 끝까지 들으면 "다 읽었어요" 버튼을 권할 뿐입니다.
  - 목소리: 기기에 있는 한국어 음성 중에서 고르고 들어 볼 수 있습니다("목소리" 버튼). 고른 목소리는
    기기에 기억하고(`pt-bible-voice`), 그 음성이 사라지면 자동으로 고릅니다.
  - 코드: `src/lib/bible/speech.ts`(문장 나누기·음성 고르기, 테스트 있음),
    `src/features/bible/useChapterSpeech.ts`(재생), `ListenBar.tsx`(조절 막대), `VoiceSheet.tsx`(목소리).
- **이용 통계**: `track()`(`src/lib/analytics.ts`)이 이벤트 이름만 `/api/track` 으로 보내고, 서버는
  `usage_events`(날짜, 이벤트, 횟수)에 합계만 올립니다. 사용자 id·기도 정보는 저장하지 않으며 로그인한
  요청만 셉니다. 관리자 화면 › 이용 통계에서 최근 7일/그 전 7일과 듣기 비율을 봅니다.
  - 새 이벤트는 `ANALYTICS_EVENTS`(허용 목록)와 `ANALYTICS_EVENT_LABELS` 에 함께 추가합니다.
  - `0013_usage_events` 적용 전에는 아무것도 쌓이지 않을 뿐 앱은 그대로 동작합니다. D1 콘솔에서는 한 줄로:

    ```sql
    create table if not exists usage_events (day text not null, event text not null, count integer not null default 0, primary key (day, event));
    ```
- **성경 읽은 곳 기록**: 정해진 읽기표 없이, 읽은 장을 직접 골라 기록합니다(본인만 보임).
  `bible_chapter_reads`(장 단위, migrations/0009) + `bible_readings`(읽은 날, 0008).
- **신고 기능**은 `0010_prayer_reports` 를 적용해야 동작합니다(적용 전에는 "준비 중" 안내).
  문의 이메일은 `src/lib/contact.ts` 의 `CONTACT_EMAIL` 에 둡니다.
- **배포 시** `npm run db:migrate:remote` 로 `0008`·`0009` 를 적용해야 읽은 곳 기록이
  나타납니다. 적용 전에는 말씀만 보이고 기록 UI 는 숨겨집니다. D1 콘솔에서 직접
  실행할 때는 콘솔이 한 줄 입력이라 **주석(`--`)을 빼고** create 문만 붙여 넣으세요.

## Known issues / 향후 과제

- **매직링크 로그인 미포함.** Cloudflare 단독 구성이라 이메일 발송 인프라가 없어
  카카오 로그인으로 대체했습니다.
- **카카오 버튼 심볼**은 디자인 가이드 형태를 따른 SVG 입니다. 공식 리소스(PNG)로
  바꾸려면 Kakao Developers → 도구 → 리소스 다운로드에서 받아 교체하세요.
- **이름 변경 미구현.** 카카오 가입자는 카카오 닉네임이 이름으로 쓰입니다.
- **프로필 이미지 업로드 미구현.** 닉네임 첫 글자를 아바타로 씁니다.
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
