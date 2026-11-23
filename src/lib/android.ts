/**
 * 안드로이드 앱(TWA, android/) 연결 정보.
 *
 * 크롬은 앱을 열 때 https://<도메인>/.well-known/assetlinks.json 을 읽어
 * "이 사이트가 이 앱을 인정한다"는 것을 확인한 뒤에야 주소창 없이 전체화면으로 띄운다.
 * 여기 지문이 빠져 있으면 앱 상단에 주소창이 보인다.
 */

/** android/app/build.gradle 의 packageId 와 같아야 한다. */
export const ANDROID_PACKAGE_NAME = "com.luckeyo.prayertogether";

/**
 * 앱 서명 인증서 SHA-256 지문.
 * - 업로드 키: 직접 설치(사이드로드)한 테스트 빌드용
 * - Play 앱 서명 키: 플레이스토어에서 받은 앱용 — Play Console → 테스트 및 출시 →
 *   설정 → 앱 서명 → "앱 서명 키 인증서"의 SHA-256 을 여기 추가한다.
 *   (코드 수정 없이 Cloudflare 변수 ANDROID_SHA256_FINGERPRINTS 로도 추가 가능)
 */
export const ANDROID_SHA256_FINGERPRINTS: readonly string[] = [
  // 업로드 키 (upload-keystore.jks, alias: upload)
  "54:5C:C6:BA:7A:EA:BC:29:F7:94:A1:25:29:9E:3E:F0:3E:1B:01:0B:B9:CD:D0:39:1C:DF:F4:A2:71:19:9F:BB",
];

const FINGERPRINT_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** "AA:BB:..." 형식으로 정규화. 형식이 틀리면 null. */
export function normalizeFingerprint(raw: string): string | null {
  const hex = raw.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  if (hex.length !== 64) return null;
  const fp = hex.match(/.{2}/g)!.join(":");
  return FINGERPRINT_RE.test(fp) ? fp : null;
}

/** 코드의 지문 + 추가 지문(콤마/공백 구분 문자열)을 합쳐 중복 없이 반환. */
export function collectFingerprints(extra?: string | null): string[] {
  const fromEnv = (extra ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(normalizeFingerprint)
    .filter((v): v is string => v !== null);
  const all = [...ANDROID_SHA256_FINGERPRINTS, ...fromEnv]
    .map(normalizeFingerprint)
    .filter((v): v is string => v !== null);
  return [...new Set(all)];
}

/** Digital Asset Links 문서 (assetlinks.json 본문) */
export function buildAssetLinks(fingerprints: string[]) {
  return [
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds",
      ],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
