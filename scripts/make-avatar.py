#!/usr/bin/env python
"""下载头像并处理成 88x88 圆形 PNG（hero.svg 会以 base64 内嵌它）。

优先用已有的 assets/avatar-raw.png；不存在则从 GitHub 下载。
"""
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)
raw = ASSETS / "avatar-raw.png"
dst = ASSETS / "avatar.png"
USER = "awslew"

SIZE = 88
SS = 4  # 超采样倍数，抗锯齿


def ensure_raw() -> None:
    if raw.exists() and raw.stat().st_size > 1024:
        return
    url = f"https://avatars.githubusercontent.com/{USER}?v=4&s=460"
    print(f"→ 下载头像 {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "profile-readme-builder"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw.write_bytes(resp.read())


def main() -> int:
    ensure_raw()
    im = Image.open(raw).convert("RGBA")
    side = min(im.size)
    left = (im.width - side) // 2
    top = (im.height - side) // 2
    im = im.crop((left, top, left + side, top + side))

    mask = Image.new("L", (SIZE * SS, SIZE * SS), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, SIZE * SS - 1, SIZE * SS - 1), fill=255)
    mask = mask.resize((SIZE, SIZE), Image.LANCZOS)

    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(im.resize((SIZE, SIZE), Image.LANCZOS), (0, 0), mask)
    out.save(dst, "PNG", optimize=True)

    kb = dst.stat().st_size / 1024
    print(f"OK avatar.png {SIZE}x{SIZE} {kb:.1f} KB")
    if kb > 40:
        print("WARN: 超过 40KB，hero.svg 会偏大", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
