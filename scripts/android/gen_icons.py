#!/usr/bin/env python3
"""안드로이드(TWA) 앱 아이콘/스플래시/알림 아이콘 + 스토어 아이콘 생성.

원본: public/icons/icon-512.png (올리브 배경 + 오프화이트 두 사람·새싹)
원본에서 전경(오프화이트 그림)을 알파로 뽑아낸 뒤 용도별로 다시 합성한다.

    python3 scripts/android/gen_icons.py

생성물
- android/app/src/main/res/mipmap-*/ic_launcher.png            (구형 런처, 둥근 사각)
- android/app/src/main/res/mipmap-*/ic_launcher_foreground.png (적응형 아이콘 전경)
- android/app/src/main/res/drawable-*/splash.png               (TWA 스플래시)
- android/app/src/main/res/drawable-*/ic_notification_icon.png (알림 상태바 아이콘, 흰색 단색)
- android/store/icon-512.png                                   (플레이스토어 고해상도 아이콘)
- public/icons/maskable-512.png                                (PWA maskable 아이콘)
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/icons/icon-512.png"
RES = ROOT / "android/app/src/main/res"

BG = (107, 124, 97)  # 원본 아이콘 배경색 (#6B7C61)
FG = (249, 247, 244)  # 원본 그림 색 (#F9F7F4)

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}


def extract_foreground() -> Image.Image:
    """원본에서 전경 그림만 알파 마스크로 추출해 (타이트하게 자른) RGBA 로 반환."""
    src = Image.open(SRC).convert("RGB")
    w, h = src.size
    # 둥근 모서리 바깥(흰색)을 피하려고 안쪽만 본다.
    margin = 60
    alpha = Image.new("L", (w, h), 0)
    sp, ap = src.load(), alpha.load()
    bg_l = sum(BG) / 3
    fg_l = sum(FG) / 3
    for y in range(margin, h - margin):
        for x in range(margin, w - margin):
            r, g, b = sp[x, y]
            t = ((r + g + b) / 3 - bg_l) / (fg_l - bg_l)
            # 배경색의 미세한 노이즈는 버린다
            ap[x, y] = 0 if t < 0.08 else min(255, round(t * 255))
    box = alpha.getbbox()
    assert box, "전경을 찾지 못했습니다"
    fg = Image.new("RGBA", (w, h), FG + (0,))
    fg.putalpha(alpha)
    return fg.crop(box)


def max_radius(fg: Image.Image) -> float:
    """전경 중심에서 가장 먼 불투명 픽셀까지의 거리(px)."""
    a = fg.getchannel("A").load()
    cw, ch = fg.size
    cx, cy = cw / 2, ch / 2
    best = 0.0
    for y in range(ch):
        for x in range(cw):
            if a[x, y] > 24:
                best = max(best, math.hypot(x + 0.5 - cx, y + 0.5 - cy))
    return best


def place(fg: Image.Image, size: int, radius_frac: float, bg=None) -> Image.Image:
    """size×size 캔버스 가운데에, 전경의 외접원 반지름이 size*radius_frac 이 되게 배치."""
    scale = size * radius_frac / FG_RADIUS
    nw, nh = max(1, round(fg.width * scale)), max(1, round(fg.height * scale))
    small = fg.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (bg + (255,)) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(small, ((size - nw) // 2, (size - nh) // 2))
    return canvas


def rounded_icon(fg: Image.Image, size: int) -> Image.Image:
    """구형 런처/스플래시용: 투명 모서리의 둥근 사각 배경 + 전경."""
    ss = 4  # 슈퍼샘플링으로 모서리 안티에일리어싱
    big = size * ss
    mask = Image.new("L", (big, big), 0)
    pad = round(big * 0.04)
    ImageDraw.Draw(mask).rounded_rectangle(
        (pad, pad, big - pad - 1, big - pad - 1), radius=round(big * 0.2), fill=255
    )
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), BG + (255,))
    out.putalpha(mask)
    out.alpha_composite(place(fg, size, 0.32))
    return out


def white_silhouette(fg: Image.Image, size: int) -> Image.Image:
    """알림 아이콘: 흰색 + 알파만 (안드로이드가 알파로 틴트한다)."""
    img = place(fg, size, 0.46)
    white = Image.new("RGBA", img.size, (255, 255, 255, 0))
    white.putalpha(img.getchannel("A"))
    return white


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print("wrote", path.relative_to(ROOT), img.size)


fg_full = extract_foreground()
FG_RADIUS = max_radius(fg_full)

for name, d in DENSITIES.items():
    # 구형 런처 아이콘 48dp
    save(rounded_icon(fg_full, round(48 * d)), RES / f"mipmap-{name}/ic_launcher.png")
    # 적응형 아이콘 전경 108dp — 안전영역(지름 66dp) 안쪽, 반지름 26dp
    save(place(fg_full, round(108 * d), 26 / 108), RES / f"mipmap-{name}/ic_launcher_foreground.png")
    # TWA 스플래시 144dp (가운데 표시)
    save(rounded_icon(fg_full, round(144 * d)), RES / f"drawable-{name}/splash.png")
    # 알림 상태바 아이콘 24dp
    save(white_silhouette(fg_full, round(24 * d)), RES / f"drawable-{name}/ic_notification_icon.png")

# 플레이스토어 512 아이콘: 꽉 찬 정사각형(스토어가 모서리를 깎는다), 원본과 같은 비율
save(place(fg_full, 512, 0.34, bg=BG).convert("RGB"), ROOT / "android/store/icon-512.png")
# PWA maskable: 꽉 찬 배경 + 안전영역(지름 80%) 안
save(place(fg_full, 512, 0.33, bg=BG).convert("RGB"), ROOT / "public/icons/maskable-512.png")
