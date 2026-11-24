/**
 * 알림 설정 점검 (관리자 점검 화면용). 키 값은 절대 돌려주지 않고 상태만 알려준다.
 * Web Crypto 만 써서 Workers·Node·테스트에서 똑같이 동작한다.
 */

export type Check = { ok: boolean; message: string };

/** 대시보드에 붙여 넣을 때 섞여 들어간 앞뒤 공백·줄바꿈 제거 */
export function cleanSecret(v: string | null | undefined): {
  value: string;
  hadWhitespace: boolean;
} {
  const raw = v ?? "";
  const value = raw.trim();
  return { value, hadWhitespace: value.length > 0 && value !== raw };
}

export function decodeB64url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(s)) return null;
  try {
    const b64 = s.replace(/=+$/, "").replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function encodeB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const ws = (had: boolean) => (had ? " (앞뒤 공백은 자동으로 제거했어요)" : "");

/** VAPID 공개키·개인키·짝·subject 점검 */
export async function inspectVapid(input: {
  publicKey?: string | null;
  privateKey?: string | null;
  subject?: string | null;
}): Promise<{
  publicKey: Check;
  privateKey: Check;
  pair: Check;
  subject: Check;
}> {
  const pub = cleanSecret(input.publicKey);
  const priv = cleanSecret(input.privateKey);
  const sub = cleanSecret(input.subject);

  const point = pub.value ? decodeB64url(pub.value) : null;
  const publicKey: Check = !pub.value
    ? { ok: false, message: "VAPID_PUBLIC_KEY 가 없어요(또는 비어 있어요)." }
    : !point || point.length !== 65 || point[0] !== 0x04
      ? {
          ok: false,
          message: `VAPID_PUBLIC_KEY 형식이 달라요(${point ? point.length : 0}바이트, 65바이트여야 해요). 값을 다시 복사해 넣어 주세요.`,
        }
      : { ok: true, message: `형식 정상${ws(pub.hadWhitespace)}` };

  const d = priv.value ? decodeB64url(priv.value) : null;
  const privateKey: Check = !priv.value
    ? { ok: false, message: "VAPID_PRIVATE_KEY 가 없어요(또는 비어 있어요)." }
    : !d || d.length !== 32
      ? {
          ok: false,
          message: `VAPID_PRIVATE_KEY 형식이 달라요(${d ? d.length : 0}바이트, 32바이트여야 해요).`,
        }
      : { ok: true, message: `형식 정상${ws(priv.hadWhitespace)}` };

  let pair: Check = {
    ok: false,
    message: "공개키·개인키를 먼저 바로잡아야 확인할 수 있어요.",
  };
  if (publicKey.ok && privateKey.ok && point) {
    try {
      const signKey = await crypto.subtle.importKey(
        "jwk",
        {
          kty: "EC",
          crv: "P-256",
          x: encodeB64url(point.slice(1, 33)),
          y: encodeB64url(point.slice(33, 65)),
          d: priv.value,
          ext: true,
        },
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"],
      );
      const verifyKey = await crypto.subtle.importKey(
        "raw",
        point as BufferSource,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"],
      );
      const msg = new TextEncoder().encode("vapid-check");
      const sig = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        signKey,
        msg,
      );
      const ok = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        verifyKey,
        sig,
        msg,
      );
      pair = ok
        ? { ok: true, message: "공개키와 개인키가 한 쌍이에요." }
        : {
            ok: false,
            message:
              "공개키와 개인키가 한 쌍이 아니에요. 같은 때 만든 두 값을 함께 다시 넣어 주세요.",
          };
    } catch {
      pair = {
        ok: false,
        message:
          "공개키와 개인키가 한 쌍이 아니에요. 같은 때 만든 두 값을 함께 다시 넣어 주세요.",
      };
    }
  }

  const subject: Check = !sub.value
    ? {
        ok: true,
        message:
          "비어 있어 기본값을 써요. mailto:운영자이메일 을 넣는 걸 권해요.",
      }
    : /^(mailto:\S+@\S+|https:\/\/\S+)$/.test(sub.value)
      ? { ok: true, message: `형식 정상${ws(sub.hadWhitespace)}` }
      : {
          ok: false,
          message:
            "VAPID_SUBJECT 는 mailto:이메일 또는 https:// 주소여야 해요.",
        };

  return { publicKey, privateKey, pair, subject };
}

/** 푸시 서비스 응답 코드 → 사람이 읽을 설명 */
export function explainPushStatus(status: number): string {
  if (status >= 200 && status < 300)
    return "푸시 서비스가 받았어요. 몇 초 안에 이 기기에 알림이 떠야 해요.";
  if (status === 401 || status === 403)
    return "푸시 서비스가 거절했어요. 구독할 때 쓴 키와 지금 키가 달라요 — 알림을 껐다가 다시 켜 주세요.";
  if (status === 404 || status === 410)
    return "만료된 구독이라 지웠어요. 알림을 껐다가 다시 켜 주세요.";
  if (status === 413) return "요청이 너무 커요(정상이라면 생기지 않아요).";
  if (status === 429)
    return "잠시 너무 많이 보냈어요. 조금 뒤 다시 시도해 주세요.";
  if (status === 0)
    return "푸시 서비스에 연결하지 못했어요(네트워크 또는 키 형식 문제).";
  return `푸시 서비스 오류(${status}). 잠시 뒤 다시 시도해 주세요.`;
}
