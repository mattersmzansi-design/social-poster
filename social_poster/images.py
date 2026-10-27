"""Branded 1080x1080 post images: green and gold, Mzansi Money Matters.

If assets/template.png exists (e.g. designed in Penpot) it is used as the
background and only the headline is drawn on it, inside HEADLINE_BOX.

Preview: python -m social_poster.images "Kicker | Headline text" out.png
"""
from __future__ import annotations

import io
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZE = 1080
MARGIN = 90
HEADLINE_BOX = (MARGIN, 300, SIZE - MARGIN, 860)  # left, top, right, bottom

GREEN_TOP = (8, 52, 31)
GREEN_BOTTOM = (14, 104, 56)
GOLD = (224, 178, 59)
LIGHT_GOLD = (243, 214, 130)
WHITE = (255, 255, 255)

ASSETS = Path(__file__).resolve().parent.parent / "assets"
FONTS = ASSETS / "fonts"
TEMPLATE = ASSETS / "template.png"


def _font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"Poppins-{weight}.ttf"), size)


def clean_title(text: str) -> str:
    """Drop emoji and other symbols the font can't draw, keep letters and punctuation."""
    kept = []
    for ch in text:
        if ord(ch) > 0xFFFF or 0xFE00 <= ord(ch) <= 0xFE0F or ch == "‍":
            continue
        if unicodedata.category(ch) in ("So", "Cs", "Co", "Cn"):
            continue
        kept.append(ch)
    return " ".join("".join(kept).split())


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, width: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=font) <= width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _fit_headline(draw, text: str, width: int, height: int):
    for size in range(96, 47, -4):
        font = _font("Bold", size)
        lines = _wrap(draw, text, font, width)
        line_height = int(size * 1.18)
        too_wide = any(draw.textlength(l, font=font) > width for l in lines)
        if not too_wide and len(lines) * line_height <= height:
            return font, lines, line_height
    return font, lines[: height // line_height], line_height


def _background() -> Image.Image:
    if TEMPLATE.exists():
        return Image.open(TEMPLATE).convert("RGB").resize((SIZE, SIZE))

    img = Image.new("RGB", (SIZE, SIZE))
    draw = ImageDraw.Draw(img)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        draw.line([(0, y), (SIZE, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(GREEN_TOP, GREEN_BOTTOM)))

    # Faint gold rings in the top-right corner.
    rings = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rings)
    for radius, alpha in ((330, 70), (250, 45), (170, 30)):
        rd.ellipse((SIZE - 120 - radius, 110 - radius, SIZE - 120 + radius, 110 + radius),
                   outline=GOLD + (alpha,), width=6)
    img = Image.alpha_composite(img.convert("RGBA"), rings).convert("RGB")

    draw = ImageDraw.Draw(img)
    draw.text((MARGIN, 92), "MZANSI MONEY MATTERS", font=_font("SemiBold", 30), fill=GOLD)
    draw.rectangle((MARGIN, 146, MARGIN + 90, 152), fill=GOLD)
    draw.rectangle((MARGIN, 930, SIZE - MARGIN, 933), fill=GOLD)
    draw.text((MARGIN, 958), "#MzansiMoneyMatters", font=_font("SemiBold", 30), fill=GOLD)
    tagline = "Money. Economy. Your household."
    tag_font = _font("Regular", 26)
    draw.text((SIZE - MARGIN - draw.textlength(tagline, font=tag_font), 962), tagline,
              font=tag_font, fill=LIGHT_GOLD)
    return img


def render_card(title: str) -> bytes:
    """title: 'Headline' or 'Kicker | Headline'. Returns PNG bytes."""
    kicker, _, headline = title.partition("|") if "|" in title else ("", "", title)
    kicker, headline = clean_title(kicker).upper(), clean_title(headline)
    if not headline:
        raise ValueError("image title is empty after removing emoji")

    img = _background()
    draw = ImageDraw.Draw(img)
    left, top, right, bottom = HEADLINE_BOX
    if kicker:
        draw.text((left, top), kicker, font=_font("SemiBold", 34), fill=GOLD)
        top += 70
    font, lines, line_height = _fit_headline(draw, headline, right - left, bottom - top)
    for i, line in enumerate(lines):
        draw.text((left, top + i * line_height), line, font=font, fill=WHITE)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    Path(sys.argv[2]).write_bytes(render_card(sys.argv[1]))
