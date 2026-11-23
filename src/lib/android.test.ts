import { describe, expect, it } from "vitest";
import {
  ANDROID_PACKAGE_NAME,
  ANDROID_SHA256_FINGERPRINTS,
  buildAssetLinks,
  collectFingerprints,
  normalizeFingerprint,
} from "./android";

const SAMPLE =
  "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89";

describe("normalizeFingerprint", () => {
  it("콜론 형식을 그대로 받는다", () => {
    expect(normalizeFingerprint(SAMPLE)).toBe(SAMPLE);
  });

  it("소문자·콜론 없는 형식도 정규화한다", () => {
    expect(normalizeFingerprint(SAMPLE.replace(/:/g, "").toLowerCase())).toBe(SAMPLE);
  });

  it("길이가 틀리면 null", () => {
    expect(normalizeFingerprint("AB:CD")).toBeNull();
    expect(normalizeFingerprint("")).toBeNull();
  });
});

describe("collectFingerprints", () => {
  it("코드의 지문은 모두 올바른 형식이다", () => {
    expect(ANDROID_SHA256_FINGERPRINTS.length).toBeGreaterThan(0);
    for (const fp of ANDROID_SHA256_FINGERPRINTS) {
      expect(normalizeFingerprint(fp)).toBe(fp);
    }
  });

  it("추가 지문을 합치고, 중복·잘못된 값은 버린다", () => {
    const base = ANDROID_SHA256_FINGERPRINTS[0]!;
    const result = collectFingerprints(`${SAMPLE}, ${base.toLowerCase()} , nope`);
    expect(result).toEqual([...ANDROID_SHA256_FINGERPRINTS, SAMPLE]);
  });

  it("추가 지문이 없으면 코드의 지문만", () => {
    expect(collectFingerprints(undefined)).toEqual([...ANDROID_SHA256_FINGERPRINTS]);
  });
});

describe("buildAssetLinks", () => {
  it("패키지 이름과 지문을 담은 assetlinks 문서를 만든다", () => {
    const statement = buildAssetLinks([SAMPLE])[0]!;
    expect(statement.relation).toContain("delegate_permission/common.handle_all_urls");
    expect(statement.target).toEqual({
      namespace: "android_app",
      package_name: ANDROID_PACKAGE_NAME,
      sha256_cert_fingerprints: [SAMPLE],
    });
  });

  it("패키지 이름이 안드로이드 프로젝트와 같다", () => {
    expect(ANDROID_PACKAGE_NAME).toBe("com.luckeyo.prayertogether");
  });
});
