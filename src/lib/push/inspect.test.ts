import { describe, expect, it } from "vitest";
import { cleanSecret, explainPushStatus, inspectVapid } from "./inspect";

async function newPair(): Promise<{ pub: string; priv: string }> {
  const k = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey));
  const b = (u: Uint8Array) =>
    btoa(String.fromCharCode(...u))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const jwk = await crypto.subtle.exportKey("jwk", k.privateKey);
  return { pub: b(raw), priv: jwk.d as string };
}

describe("cleanSecret", () => {
  it("앞뒤 공백·줄바꿈 제거를 알려준다", () => {
    expect(cleanSecret(" abc\n")).toEqual({
      value: "abc",
      hadWhitespace: true,
    });
    expect(cleanSecret("abc")).toEqual({ value: "abc", hadWhitespace: false });
    expect(cleanSecret(undefined)).toEqual({ value: "", hadWhitespace: false });
  });
});

describe("inspectVapid", () => {
  it("정상 키 한 쌍", async () => {
    const { pub, priv } = await newPair();
    const r = await inspectVapid({
      publicKey: pub,
      privateKey: priv,
      subject: "mailto:a@b.com",
    });
    expect(r.publicKey.ok && r.privateKey.ok && r.pair.ok && r.subject.ok).toBe(
      true,
    );
  });

  it("공백·줄바꿈이 섞여도 통과하고 알려준다", async () => {
    const { pub, priv } = await newPair();
    const r = await inspectVapid({ publicKey: ` ${pub}\n`, privateKey: priv });
    expect(r.publicKey.ok).toBe(true);
    expect(r.publicKey.message).toContain("공백");
    expect(r.pair.ok).toBe(true);
  });

  it("값이 없으면 없다고", async () => {
    const r = await inspectVapid({ publicKey: "", privateKey: undefined });
    expect(r.publicKey.ok).toBe(false);
    expect(r.privateKey.ok).toBe(false);
    expect(r.pair.ok).toBe(false);
  });

  it("다른 때 만든 키끼리는 짝이 아니라고", async () => {
    const a = await newPair();
    const b = await newPair();
    const r = await inspectVapid({ publicKey: a.pub, privateKey: b.priv });
    expect(r.publicKey.ok && r.privateKey.ok).toBe(true);
    expect(r.pair.ok).toBe(false);
  });

  it("형식이 틀리면 바이트 수와 함께", async () => {
    const r = await inspectVapid({ publicKey: "abc", privateKey: "x!y" });
    expect(r.publicKey.ok).toBe(false);
    expect(r.publicKey.message).toContain("65바이트");
    expect(r.privateKey.ok).toBe(false);
  });

  it("subject 형식", async () => {
    const { pub, priv } = await newPair();
    expect(
      (
        await inspectVapid({
          publicKey: pub,
          privateKey: priv,
          subject: "hello",
        })
      ).subject.ok,
    ).toBe(false);
    expect(
      (
        await inspectVapid({
          publicKey: pub,
          privateKey: priv,
          subject: "https://example.com",
        })
      ).subject.ok,
    ).toBe(true);
  });
});

describe("explainPushStatus", () => {
  it("상태 코드별 안내", () => {
    expect(explainPushStatus(201)).toContain("받았어요");
    expect(explainPushStatus(403)).toContain("키");
    expect(explainPushStatus(410)).toContain("만료");
    expect(explainPushStatus(0)).toContain("연결");
  });
});
