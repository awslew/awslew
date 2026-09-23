#!/usr/bin/env python
"""Playwright 截图预览：桌面 + 移动、深色 + 浅色，用于视觉验收。"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_preview"
OUT.mkdir(exist_ok=True)

SHOTS = [
    ("preview-dark.html", "dark", 1280, 900, "desktop-dark"),
    ("preview-light.html", "light", 1280, 900, "desktop-light"),
    ("preview-dark.html", "dark", 414, 900, "mobile-dark"),
]


def main() -> int:
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for html, scheme, w, h, tag in SHOTS:
            ctx = browser.new_context(
                viewport={"width": w, "height": h},
                color_scheme=scheme,
                device_scale_factor=2,
            )
            page = ctx.new_page()
            page.on("requestfailed", lambda r: errors.append(f"{r.url[:90]} -> {r.failure}"))
            page.goto((ROOT / html).as_uri(), wait_until="load")
            # 等图片与远程 CSS 落地
            page.wait_for_timeout(4500)
            # 全页截图
            page.screenshot(path=str(OUT / f"{tag}-full.png"), full_page=True)
            # 首屏截图（判断「第一眼」效果）
            page.screenshot(path=str(OUT / f"{tag}-fold.png"))
            broken = page.evaluate(
                """() => Array.from(document.images)
                     .filter(i => !i.complete || i.naturalWidth === 0)
                     .map(i => (i.currentSrc || i.src).slice(0, 110))"""
            )
            print(f"[{tag}] 尺寸 {w}x{h}  破图 {len(broken)}")
            for b in broken:
                print(f"    BROKEN: {b}")
            ctx.close()
        browser.close()

    if errors:
        print("\n请求失败:")
        for e in dict.fromkeys(errors):
            print("   ", e)
    print(f"\n截图目录: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
