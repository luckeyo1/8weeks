"""
오늘의 말씀 데이터 생성기.
- 정본(holybible) 텍스트를 쓰되, 대조본(bskorea)과 정규화 비교가 일치하는 구절만 채택.
- 불일치/누락 구절은 리포트로 출력하고 제외한다.
usage: python3 scripts/bible/gen_verses.py <krv_holybible.jsonl> <krv_bskorea.jsonl> <out.ts>
"""
import json
import random
import re
import sys

REFS = """
PSA 23:1
PSA 23:4
PSA 46:1
PSA 46:10
PSA 121:1-2
PSA 121:7-8
PSA 37:5-6
PSA 55:22
PSA 27:1
PSA 34:18
PSA 34:8
PSA 62:8
PSA 91:1-2
PSA 103:2
PSA 118:24
PSA 119:105
PSA 145:18
PSA 139:23-24
PSA 4:8
PSA 16:8
PSA 18:1-2
PSA 30:5
PSA 31:24
PSA 32:8
PSA 40:1
PSA 42:5
PSA 50:15
PSA 56:3
PSA 61:2
PSA 63:1
PSA 73:26
PSA 86:5
PSA 90:12
PSA 100:4-5
PSA 107:1
PSA 116:1-2
PSA 126:5
PSA 127:1
PSA 133:1
PSA 138:3
PSA 147:3
PSA 150:6
PSA 5:3
PSA 19:14
PSA 25:4-5
PSA 28:7
PSA 36:7
PSA 141:2
PRO 3:5-6
PRO 16:3
PRO 16:9
PRO 17:17
PRO 4:23
PRO 18:10
PRO 27:17
ISA 40:31
ISA 41:10
ISA 43:1
ISA 43:19
ISA 26:3
ISA 40:8
ISA 53:5
ISA 55:8-9
ISA 58:11
ISA 65:24
ISA 49:15
JER 29:11
JER 29:12-13
JER 33:3
JER 17:7
LAM 3:22-23
DEU 31:6
DEU 31:8
JOS 1:9
NUM 6:24-26
1SA 12:23-24
1SA 16:7
2CH 7:14
NEH 8:10
ZEP 3:17
MIC 6:8
HAB 3:17-18
GEN 28:15
GEN 50:20
EXO 14:14
EXO 15:2
1CH 16:11
1CH 16:34
JOB 23:10
ECC 3:1
ECC 4:9
ECC 4:12
RUT 1:16
MAT 5:4
MAT 5:9
MAT 5:14
MAT 5:44
MAT 6:6
MAT 6:33
MAT 6:34
MAT 7:7
MAT 11:28
MAT 18:19
MAT 18:20
MAT 21:22
MAT 26:41
MAT 28:20
MRK 1:35
MRK 9:23
MRK 10:27
MRK 11:24
LUK 1:37
LUK 6:31
LUK 11:9
LUK 18:1
LUK 22:32
JHN 1:5
JHN 3:16
JHN 8:12
JHN 10:10
JHN 11:25-26
JHN 13:34
JHN 14:1
JHN 14:6
JHN 14:27
JHN 15:5
JHN 15:7
JHN 15:12
JHN 15:13
JHN 16:24
JHN 16:33
ACT 1:8
ACT 2:42
ACT 16:31
ACT 20:35
ROM 5:3-4
ROM 5:8
ROM 8:18
ROM 8:26
ROM 8:28
ROM 8:38-39
ROM 10:17
ROM 12:2
ROM 12:10-11
ROM 12:12
ROM 12:15
ROM 15:7
ROM 15:13
1CO 10:13
1CO 13:4-7
1CO 13:13
1CO 15:58
1CO 16:14
2CO 1:4
2CO 4:16
2CO 4:18
2CO 5:17
2CO 12:9
GAL 2:20
GAL 5:22-23
GAL 6:2
GAL 6:9
EPH 1:16
EPH 2:8
EPH 3:20-21
EPH 4:2-3
EPH 4:32
EPH 6:18
PHP 1:3-5
PHP 1:6
PHP 2:3-4
PHP 4:4
PHP 4:6-7
PHP 4:13
PHP 4:19
COL 3:13-14
COL 3:15
COL 3:23
COL 4:2
1TH 5:11
1TH 5:16-18
1TH 5:25
2TH 3:3
1TI 2:1-2
2TI 1:7
2TI 3:16-17
HEB 4:12
HEB 4:16
HEB 10:24-25
HEB 11:1
HEB 12:2
HEB 13:5
HEB 13:8
JAS 1:5
JAS 1:17
JAS 4:8
JAS 5:13
JAS 5:16
1PE 4:8
1PE 5:7
1PE 5:10
1JN 1:9
1JN 3:18
1JN 4:7-8
1JN 4:11
1JN 4:18
1JN 4:19
1JN 5:14
REV 3:20
REV 21:4
"""


def load(path):
    out = {}
    names = {}
    for line in open(path, encoding="utf-8"):
        d = json.loads(line)
        out[(d["code"], d["chapter"], d["verse"])] = d["text"]
        names[d["code"]] = d["name_kr"]
    return out, names


def norm(s):
    return re.sub(r"[\s\.,;:!?\"'“”‘’()\[\]·…-]", "", s)


def main():
    primary, names = load(sys.argv[1])
    check, _ = load(sys.argv[2])
    out_path = sys.argv[3]

    picked = []
    problems = []
    seen = set()
    for raw in REFS.strip().splitlines():
        raw = raw.strip()
        if not raw:
            continue
        if raw in seen:
            problems.append(f"DUP {raw}")
            continue
        seen.add(raw)
        code, cv = raw.split()
        ch, vs = cv.split(":")
        ch = int(ch)
        if "-" in vs:
            a, b = (int(x) for x in vs.split("-"))
        else:
            a = b = int(vs)
        parts = []
        ok = True
        for v in range(a, b + 1):
            p = primary.get((code, ch, v))
            c = check.get((code, ch, v))
            # 대조본(bskorea)은 표제가 있는 시편에서 표제를 1절로 세어 절 번호가 +1 밀린다.
            if code == "PSA" and (c is None or norm(c) != norm(p or "")):
                shifted = check.get((code, ch, v + 1))
                if shifted is not None and p is not None and norm(shifted) == norm(p):
                    c = shifted
            if p is None:
                problems.append(f"MISSING-primary {raw} v{v}")
                ok = False
                break
            if c is None:
                problems.append(f"MISSING-check {raw} v{v} (primary: {p})")
                ok = False
                break
            if norm(p) != norm(c):
                problems.append(f"MISMATCH {raw} v{v}\n   holy : {p}\n   bsk  : {c}")
                ok = False
                break
            parts.append(p.strip())
        if ok:
            picked.append(
                {
                    "book": names[code],
                    "chapter": ch,
                    "verseStart": a,
                    "verseEnd": b,
                    "text": " ".join(parts),
                }
            )

    # 고정 시드로 섞어 신·구약/주제가 번갈아 나오게 한다 (결과는 커밋되어 고정).
    random.Random(20261122).shuffle(picked)

    lines = [
        "/**",
        " * 오늘의 말씀 — 큐레이션 구절 (자동 생성 파일, 손으로 본문을 고치지 마세요).",
        " *",
        " * 본문: 성경전서 개역한글판 (대한성서공회) — 저작재산권 보호기간 만료(퍼블릭 도메인).",
        " * 동일성유지권 존중: 본문 표기(옛 맞춤법 포함)를 바꾸지 않는다.",
        " * 생성: holybible.or.kr 정본을 bible.bskorea.or.kr 본과 대조해 일치한 구절만 채택",
        " *       (데이터셋: github.com/crizin/bible-db data/krv).",
        " */",
        "",
        'import type { Verse } from "./types";',
        "",
        "export const VERSES: readonly Verse[] = [",
    ]
    for v in picked:
        lines.append(
            "  { book: %s, chapter: %d, verseStart: %d, verseEnd: %d, text: %s },"
            % (
                json.dumps(v["book"], ensure_ascii=False),
                v["chapter"],
                v["verseStart"],
                v["verseEnd"],
                json.dumps(v["text"], ensure_ascii=False),
            )
        )
    lines.append("];")
    lines.append("")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"picked {len(picked)} / {len(seen)}")
    for p in problems:
        print(p)


if __name__ == "__main__":
    main()
