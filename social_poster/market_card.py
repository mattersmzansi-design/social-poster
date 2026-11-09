"""Daily market cards (4:5, 1080x1350) in the MMM green-and-gold style.

Usage: python -m social_poster.market_card spec.json out.png

spec.json:
{
  "kind": "morning" | "evening",
  "date": "Tue 10 Nov 2026",
  "rows": [["Rand / US dollar", "R16.48", "-0.4%", "stronger"], ...],   # label, value, change, note
  "us_close": ["Nasdaq 100 +3.1%: chip stocks rebound", ...],           # morning only: the US session in bullets
  "pocket": "What it means for you: ...",
  "source": "Sources: ..."
}
Only facts go in; no buy/sell language (see BANNED).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ASSETS = Path(__file__).resolve().parent.parent / "assets"
FONTS = ASSETS / "fonts"
W, H = 1080, 1350
G1, G2 = (8, 52, 31), (14, 104, 56)
GOLD, LGOLD, WHITE = (224, 178, 59), (243, 214, 130), (255, 255, 255)
BANNED = re.compile(r"\b(buy|sell(?!-off)|should|opportunity|target|recommend|guaranteed)\b", re.I)


def _f(w: str, s: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"Poppins-{w}.ttf"), s)


def check_words(spec: dict) -> list[str]:
    """Return any advice-like words found in the card text."""
    text = " ".join([spec.get("pocket", ""), *spec.get("us_close", []), *[" ".join(r) for r in spec.get("rows", [])]])
    return sorted({m.group(0).lower() for m in BANNED.finditer(text)})


def _wrap(d, text, font, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = f"{cur} {w}".strip()
        if d.textlength(t, font=font) > width and cur:
            lines.append(cur); cur = w
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines


def render(spec: dict) -> Image.Image:
    bad = check_words(spec)
    if bad:
        raise ValueError(f"advice-like words not allowed on market cards: {', '.join(bad)}")
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(G1, G2)))
    logo = ASSETS / "mmm-logo.jpg"
    if logo.exists():
        lg = Image.open(logo).convert("RGB").resize((110, 110))
        m = Image.new("L", lg.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 110, 110), 16, fill=255)
        img.paste(lg, (W - 70 - 110, 60), m)
    morning = spec.get("kind") == "morning"
    d.text((70, 70), "MZANSI MONEY MATTERS", font=_f("SemiBold", 28), fill=GOLD)
    d.rectangle((70, 116, 160, 122), fill=GOLD)
    d.text((70, 150), "Your Money This Morning" if morning else "What Moved Today", font=_f("Bold", 58), fill=WHITE)
    d.text((70, 228), spec.get("date", ""), font=_f("SemiBold", 30), fill=LGOLD)

    y = 290
    for label, value, change, *note in spec.get("rows", []):
        d.rounded_rectangle((60, y, W - 60, y + 74), 14, fill=(20, 84, 52), outline=(60, 130, 92), width=2)
        d.text((90, y + 37), label, font=_f("SemiBold", 30), fill=WHITE, anchor="lm")
        d.text((720, y + 37), value, font=_f("Bold", 34), fill=WHITE, anchor="rm")
        cy = y + (26 if note and note[0] else 37)
        num = change.lstrip("+-")
        d.text((W - 90, cy), num, font=_f("Bold", 30), fill=LGOLD, anchor="rm")
        ax = W - 90 - d.textlength(num, font=_f("Bold", 30)) - 26  # Poppins has no arrow glyphs, so draw them
        if change.startswith("+"):
            d.polygon([(ax, cy + 9), (ax + 18, cy + 9), (ax + 9, cy - 8)], fill=LGOLD)
        elif change.startswith("-"):
            d.polygon([(ax, cy - 8), (ax + 18, cy - 8), (ax + 9, cy + 9)], fill=LGOLD)
        if note and note[0]:
            d.text((W - 90, y + 56), note[0], font=_f("Regular", 19), fill=LGOLD, anchor="rm")
        y += 84

    if spec.get("us_close"):
        y += 14
        d.text((70, y), "Overnight in New York" if morning else "The session", font=_f("Bold", 34), fill=GOLD)
        y += 56
        for b in spec["us_close"]:
            for i, line in enumerate(_wrap(d, b, _f("Regular", 28), W - 190)):
                d.text((100 if i else 70, y), ("•  " if i == 0 else "") + line, font=_f("Regular", 28), fill=WHITE)
                y += 40
            y += 6

    if spec.get("pocket"):
        y += 16
        lines = _wrap(d, spec["pocket"], _f("SemiBold", 30), W - 200)
        box_h = len(lines) * 42 + 40
        d.rounded_rectangle((60, y, W - 60, y + box_h), 18, fill=(224, 178, 59))
        for i, line in enumerate(lines):
            d.text((90, y + 20 + i * 42), line, font=_f("SemiBold", 30), fill=G1)
        y += box_h

    if y > H - 130:
        raise ValueError(f"card content too long ({y}px); shorten the bullets or the pocket line")
    foot = (spec.get("source", "") + "  ·  Education, not financial advice").strip(" ·")
    for i, line in enumerate(_wrap(d, foot, _f("Regular", 20), W - 140)[-3:]):
        d.text((70, H - 110 + i * 28), line, font=_f("Regular", 20), fill=LGOLD)
    return img


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    render(spec).save(sys.argv[2])
    print("saved", sys.argv[2])
