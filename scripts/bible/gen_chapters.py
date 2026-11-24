#!/usr/bin/env python3
"""
성경 읽기(본문 전체) 데이터 생성기 — 장별 JSON.

본문: 성경전서 개역한글판 (대한성서공회) — 저작재산권 보호기간 만료(퍼블릭 도메인).
동일성유지권 존중: 본문 표기(옛 맞춤법 포함)를 바꾸지 않는다. 앞뒤 공백만 정리한다.
정본: holybible.or.kr (데이터셋 github.com/crizin/bible-db data/krv/krv_holybible.jsonl).

출력: <out_dir>/<book>/<chapter>.json  (book 1=창세기 … 66=요한계시록)
      내용 {"v": ["1절", "2절", ...]}  — 배열 위치 + 1 이 절 번호
검증: 66권 · 1,189장 · 장마다 1절부터 빈틈없이 이어지는지, 빈 절이 없는지.

usage:
  git clone --depth 1 https://github.com/crizin/bible-db /tmp/bible-db
  python3 scripts/bible/gen_chapters.py /tmp/bible-db/data/krv/krv_holybible.jsonl public/bibledata/krv
"""
import json
import os
import shutil
import sys
from collections import defaultdict

EXPECTED_BOOKS = 66
EXPECTED_CHAPTERS = 1189


def main() -> None:
    src, out_dir = sys.argv[1], sys.argv[2]

    chapters: dict[tuple[int, int], dict[int, str]] = defaultdict(dict)
    names: dict[int, str] = {}
    for line in open(src, encoding="utf-8"):
        d = json.loads(line)
        book, chapter, verse = int(d["book"]), int(d["chapter"]), int(d["verse"])
        text = str(d["text"]).strip()
        if not text:
            raise SystemExit(f"빈 절: {d['code']} {chapter}:{verse}")
        if verse in chapters[(book, chapter)]:
            raise SystemExit(f"중복 절: {d['code']} {chapter}:{verse}")
        chapters[(book, chapter)][verse] = text
        names[book] = d["name_kr"]

    books = sorted({b for b, _ in chapters})
    if books != list(range(1, EXPECTED_BOOKS + 1)):
        raise SystemExit(f"책 수가 맞지 않습니다: {len(books)}")
    if len(chapters) != EXPECTED_CHAPTERS:
        raise SystemExit(f"장 수가 맞지 않습니다: {len(chapters)}")

    # 출력 폴더를 새로 만든다 (이전 생성물 정리)
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)

    total_verses = 0
    for (book, chapter), verses in sorted(chapters.items()):
        numbers = sorted(verses)
        if numbers != list(range(1, len(numbers) + 1)):
            raise SystemExit(f"절 번호가 이어지지 않습니다: {names[book]} {chapter}장")
        path = os.path.join(out_dir, str(book), f"{chapter}.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"v": [verses[n] for n in numbers]}, f, ensure_ascii=False, separators=(",", ":"))
        total_verses += len(numbers)

    print(f"books {len(books)} · chapters {len(chapters)} · verses {total_verses} → {out_dir}")


if __name__ == "__main__":
    main()
