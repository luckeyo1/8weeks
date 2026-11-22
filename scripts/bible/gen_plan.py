"""
1년 1독 읽기표 데이터 생성기.
- 장마다 길이가 크게 달라(시편 117편 2절 vs 119편 176절) 장 수가 아니라
  개역한글 본문 글자 수(공백 제외)를 하루 분량의 기준으로 삼는다.
- 창세기 1장 ~ 요한계시록 22장을 순서대로, 하루 1장 이상, 날마다 평균 분량에
  최대한 가깝게(편차 제곱합 최소) 나눈다. 365일·366일(윤년) 두 가지를 미리 계산.
- 결과는 각 날의 "끝 장 인덱스(전체 1189장 기준, exclusive)" 배열.
usage: python3 scripts/bible/gen_plan.py <krv_holybible.jsonl> <out.ts>
"""
import json
import re
import sys

MAX_CHAPTERS_PER_DAY = 20


def load_chapters(path):
    weights = {}
    names = {}
    for line in open(path, encoding="utf-8"):
        d = json.loads(line)
        key = (d["book"], d["chapter"])
        weights[key] = weights.get(key, 0) + len(re.sub(r"\s", "", d["text"]))
        names[d["book"]] = d["name_kr"]
    keys = sorted(weights)
    books = []
    for book_no in sorted(names):
        chapters = [k[1] for k in keys if k[0] == book_no]
        assert chapters == list(range(1, len(chapters) + 1)), (book_no, chapters[:5])
        books.append((names[book_no], len(chapters)))
    return books, [weights[k] for k in keys]


def partition(w, days):
    """편차 제곱합 최소 분할 (DP). 반환: 각 날의 끝 인덱스(exclusive)."""
    n = len(w)
    pre = [0]
    for x in w:
        pre.append(pre[-1] + x)
    avg = pre[-1] / days
    INF = float("inf")
    prev = [INF] * (n + 1)
    prev[0] = 0.0
    choice = []
    for d in range(1, days + 1):
        cur = [INF] * (n + 1)
        arg = [0] * (n + 1)
        lo_i = d  # 하루 1장 이상
        hi_i = n - (days - d)  # 남은 날마다 1장 이상 남기기
        for i in range(lo_i, hi_i + 1):
            best = INF
            best_j = -1
            for j in range(max(d - 1, i - MAX_CHAPTERS_PER_DAY), i):
                if prev[j] == INF:
                    continue
                dev = pre[i] - pre[j] - avg
                c = prev[j] + dev * dev
                if c < best:
                    best = c
                    best_j = j
            cur[i] = best
            arg[i] = best_j
        choice.append(arg)
        prev = cur
    assert prev[n] < INF
    ends = []
    i = n
    for d in range(days, 0, -1):
        ends.append(i)
        i = choice[d - 1][i]
    assert i == 0
    ends.reverse()
    loads = [pre[e] - pre[s] for s, e in zip([0] + ends[:-1], ends)]
    return ends, loads


def main():
    books, w = load_chapters(sys.argv[1])
    assert len(books) == 66 and len(w) == 1189, (len(books), len(w))
    plans = {}
    for days in (365, 366):
        ends, loads = partition(w, days)
        plans[days] = ends
        print(
            f"{days}일: 평균 {sum(loads) / days:.0f}자, 최소 {min(loads)}, 최대 {max(loads)}"
        )

    out = [
        "/**",
        " * 1년 1독 읽기표 데이터 (자동 생성 파일 — scripts/bible/gen_plan.py).",
        " * 하루 분량은 개역한글 본문 글자 수 기준으로 고르게 나눴다(편차 제곱합 최소).",
        " * PLAN_ENDS_xxx[d] = d+1 번째 날까지 읽는 장 수(전체 1189장 기준 누적, exclusive).",
        " */",
        "",
        "/** 성경 66권: [책 이름, 장 수] (창세기 → 요한계시록) */",
        "export const BIBLE_BOOKS: readonly (readonly [string, number])[] = [",
    ]
    for name, count in books:
        out.append(f"  [{json.dumps(name, ensure_ascii=False)}, {count}],")
    out.append("];")
    out.append("")
    for days in (365, 366):
        out.append(f"export const PLAN_ENDS_{days}: readonly number[] = [")
        ends = plans[days]
        for i in range(0, len(ends), 20):
            out.append("  " + ", ".join(str(e) for e in ends[i : i + 20]) + ",")
        out.append("];")
        out.append("")
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write("\n".join(out))


if __name__ == "__main__":
    main()
