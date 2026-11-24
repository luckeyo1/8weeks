# 기도 동행 — 안드로이드 앱 (구글 플레이스토어)

웹앱 `https://8weeks.luckeyo.workers.dev` 를 **TWA(Trusted Web Activity)** 로 감싼 안드로이드 앱입니다.
앱은 크롬 엔진으로 웹앱을 주소창 없이 전체화면으로 띄웁니다. 그래서:

- **화면·기능 수정은 지금처럼 웹만 배포하면 앱에 바로 반영됩니다.** (앱 재출시 불필요)
- 앱을 다시 올려야 하는 경우는 `android/` 폴더를 바꿀 때뿐입니다 (아이콘, 이름, 도메인, SDK 버전 등).
- 웹 푸시 기도 리마인더는 앱 알림으로 표시되고, 공유 링크(`/join/...`)는 앱에서 바로 열립니다.

| 항목 | 값 |
| --- | --- |
| 패키지 이름 | `com.luckeyo.prayertogether` (출시 후 변경 불가) |
| 연결 도메인 | `8weeks.luckeyo.workers.dev` (`app/build.gradle` 의 `hostName`) |
| 시작 주소 | `/home` (로그인 안 되어 있으면 웹앱이 로그인 화면으로 보냄) |
| minSdk / targetSdk | 24 (Android 7.0) / 36 (Android 16) |

---

## 1. 업로드 키 → GitHub Secrets 등록 (최초 1회)

업로드 키(`upload-keystore.jks`)와 비밀번호는 저장소에 없습니다. 따로 받은 파일
`README-업로드키.txt` 를 보고 GitHub 저장소 → **Settings → Secrets and variables → Actions →
New repository secret** 에 4개를 등록합니다.

| Secret 이름 | 값 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `upload-keystore.jks.base64.txt` 내용 전체 |
| `ANDROID_KEYSTORE_PASSWORD` | 키 비밀번호 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 (위와 같음) |

> 키 파일과 비밀번호는 **비밀번호 관리자 등 안전한 곳에 꼭 백업**하세요.
> 잃어버려도 Play App Signing 덕분에 Play Console 에서 업로드 키 재설정을 요청할 수 있지만 며칠 걸립니다.

## 2. 앱 빌드 (.aab)

1. GitHub → **Actions → Android app → Run workflow** (또는 `android/` 를 수정해 push)
2. 완료된 실행 화면 아래 **Artifacts** 에서 내려받기
   - `prayer-together-signed-aab-vN` → 플레이스토어 업로드용 `app-release.aab`
   - `prayer-together-apk-vN` → 폰에 직접 설치해 보는 테스트용 `.apk`
3. 버전 코드는 실행 번호(`vN`)로 자동 증가합니다. 사용자에게 보이는 버전 이름은
   `gradle.properties` 의 `appVersionName` 을 올려주세요.

Secrets 가 없으면 서명 안 된 `unsigned-aab` 만 나옵니다 (플레이스토어 업로드 불가).

로컬(Android Studio)에서 빌드하려면 `android/keystore.properties` 를 만들고(git 제외됨)
`./gradlew bundleRelease` 를 실행합니다.

```properties
storeFile=/절대경로/upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

## 3. 웹 배포 — 앱 인증 파일 (assetlinks.json)

크롬은 `https://8weeks.luckeyo.workers.dev/.well-known/assetlinks.json` 에 앱 서명 지문이 있어야
앱을 **주소창 없이** 엽니다. 지문이 맞지 않으면 앱 상단에 주소창이 보입니다.

- 지문 목록: `src/lib/android.ts` (`ANDROID_SHA256_FINGERPRINTS`)
- 코드 수정 없이 추가: Cloudflare 대시보드 → Workers → `8weeks` → Settings → Variables 에
  `ANDROID_SHA256_FINGERPRINTS` = `AA:BB:...` (여러 개는 콤마로 구분)

필요한 지문은 2개입니다.

1. **업로드 키** — 이미 코드에 들어 있음 (직접 설치한 테스트 apk 용)
2. **Play 앱 서명 키** — 플레이스토어에서 받은 앱용. 아래 4-③ 에서 확인 후 추가

## 4. Play Console 출시 순서

1. **개발자 계정** 만들기 — https://play.google.com/console (등록비 USD 25, 본인 인증)
2. **앱 만들기** — 앱 이름 `기도 동행`, 기본 언어 한국어, 앱 / 무료
3. **내부 테스트**(테스트 및 출시 → 테스트 → 내부 테스트) → 새 버전 만들기 →
   `app-release.aab` 업로드. 첫 업로드 때 **Play 앱 서명**이 자동으로 켜집니다.
   - 업로드 후 **Google Play로 보호됨(앱 무결성) → Play 앱 서명** 에서
     **모든 인증서 지문 복사 ▾ → SHA-256** 을 복사해 3번 방법으로 assetlinks 에 추가 → 웹 배포
     (주소창에서 `.../app/<번호>/keymanagement` 로 바로 갈 수도 있음)
   - ✅ 2026-11-23 등록 완료 (`src/lib/android.ts`)
4. **스토어 등록정보** — 짧은 설명(80자), 자세한 설명(4000자), 앱 아이콘
   `android/store/icon-512.png`, 그래픽 이미지 1024×500, 휴대전화 스크린샷 2장 이상
5. **앱 콘텐츠** 설문
   - 개인정보처리방침: `https://8weeks.luckeyo.workers.dev/privacy`
   - 앱 액세스 권한: 로그인이 필요하므로 **심사용 테스트 계정**(아이디/비밀번호)을 적어야 합니다
   - 광고: 없음 / 콘텐츠 등급 설문 / 타겟층 / 데이터 보안(아이디·이름·교회명·기도제목 등
     사용자가 입력한 정보, 알림 구독 정보) / **계정 삭제 안내 URL**
6. **비공개 테스트 → 프로덕션**
   - 2023-11-13 이후 만든 **개인** 개발자 계정은 프로덕션 신청 전에
     **비공개 테스트에 테스터 12명 이상이 14일 연속 참여**해야 합니다.
   - 그 뒤 프로덕션 액세스 신청 → 심사(보통 며칠) → 출시

## 5. 문제 해결

- **앱 위에 주소창이 보여요** → assetlinks 지문 불일치. 설치 경로(Play / 직접 설치)에 맞는
  지문이 `/.well-known/assetlinks.json` 에 있는지, 웹이 배포됐는지 확인하세요.
  확인 도구: https://developers.google.com/digital-asset-links/tools/generator
- **알림이 안 와요** → 앱 설정에서 알림 허용 여부 확인. 앱 안의 "내 정보 → 알림" 에서 다시 켜기.
- **매년 8월 targetSdk 요구사항** — 구글이 해마다 최소 targetSdk 를 올립니다.
  `app/build.gradle` 의 `compileSdk`/`targetSdk` 를 올리고 다시 출시해야 합니다.

## 파일 구조

```
android/
  app/build.gradle            앱 설정 (패키지명·도메인·SDK·서명)
  app/src/main/AndroidManifest.xml
  app/src/main/java/.../LauncherActivity.java   진입점 (TWA 실행)
  app/src/main/java/.../DelegationService.java  웹 푸시 → 앱 알림
  app/src/main/res/           아이콘·스플래시·색상·앱 이름
  store/icon-512.png          플레이스토어 고해상도 아이콘
scripts/android/gen_icons.py  아이콘 일괄 생성 (원본: public/icons/icon-512.png)
src/lib/android.ts            assetlinks 지문 목록
src/app/.well-known/assetlinks.json/route.ts
.github/workflows/android.yml 빌드 워크플로
```
