import "server-only";

/**
 * VAPID (RFC 8292) 서명 — Web Crypto(ES256)만 사용해 Cloudflare Workers 에서 동작.
 * 페이로드 암호화(RFC 8291)는 하지 않고 "데이터 없는 푸시"만 보낸다.
 * → 서비스워커가 고정 리마인더 문구로 알림을 띄우므로 암호화가 필요 없다.
 */

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeString(s: string): string {
  return b64urlEncode(new TextEncoder().encode(s));
}

export type VapidKeys = {
  publicKey: string; // base64url, 65바이트 EC 포인트
  privateKey: string; // base64url, 32바이트 d
  subject: string; // mailto:... 또는 https URL
};

/** 공개키(65바이트 포인트) + 개인키(d) 로 ECDSA 서명키를 만든다 */
async function importSigningKey(keys: VapidKeys): Promise<CryptoKey> {
  const point = b64urlDecode(keys.publicKey);
  if (point.length !== 65 || point[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY 형식이 올바르지 않습니다(65바이트 EC 포인트).");
  }
  const x = b64urlEncode(point.slice(1, 33));
  const y = b64urlEncode(point.slice(33, 65));
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d: keys.privateKey,
    ext: true,
    key_ops: ["sign"],
  };
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

/**
 * 특정 푸시 엔드포인트에 대한 Authorization 헤더 값을 만든다.
 * 반환: "vapid t=<jwt>, k=<publicKey>"
 */
export async function buildVapidAuth(
  endpoint: string,
  keys: VapidKeys,
): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = b64urlEncodeString(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = b64urlEncodeString(
    JSON.stringify({
      aud,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12시간
      sub: keys.subject,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const key = await importSigningKey(keys);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput) as BufferSource,
  );
  const jwt = `${signingInput}.${b64urlEncode(new Uint8Array(sig))}`;
  return `vapid t=${jwt}, k=${keys.publicKey}`;
}
