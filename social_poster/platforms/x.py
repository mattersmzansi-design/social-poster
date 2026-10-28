"""X (Twitter) posting via the X API v2, as the account that owns the access token.

X bills posting per post (pay-per-use); keep credit in the developer portal.

Secrets (from the X developer portal, app with Read and Write permission):
  X_API_KEY, X_API_SECRET              - the app's consumer keys
  X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET - your account's access token pair

Text: the optional `x_text` column is used as-is; otherwise a short version of
`text` is built to fit X's 280-character limit.
"""
from __future__ import annotations

import os

import requests

from .media import images

API = "https://api.x.com/2"
LIMIT = 280
MAX_IMAGES = 4  # X's limit; longer carousels post their first 4 slides
TIMEOUT = 60


def _cfg(name: str) -> str:
    from . import NotConfigured

    value = os.environ.get(name, "").strip().strip("'\"").strip()
    if not value:
        raise NotConfigured(f"{name} is not set")
    return value


def _auth():
    from requests_oauthlib import OAuth1

    return OAuth1(_cfg("X_API_KEY"), _cfg("X_API_SECRET"), _cfg("X_ACCESS_TOKEN"), _cfg("X_ACCESS_TOKEN_SECRET"))


def weighted_length(text: str) -> int:
    """X counts most non-Latin characters, including emoji, as 2; overestimating is safe."""
    total = 0
    for ch in text:
        o = ord(ch)
        if o in (0xFE0F, 0x200D):
            continue
        light = o <= 0x10FF or 0x2000 <= o <= 0x200D or 0x2010 <= o <= 0x201F or 0x2032 <= o <= 0x2037
        total += 1 if light else 2
    return total


def shorten(text: str, limit: int = LIMIT) -> str:
    """Opening paragraph(s) plus the hashtag line, within the limit."""
    paragraphs = [p.strip() for p in text.strip().split("\n\n") if p.strip()]
    if not paragraphs:
        return ""
    tags = paragraphs.pop() if paragraphs[-1].startswith("#") and len(paragraphs) > 1 else ""
    body = paragraphs[0]
    if weighted_length(body) > limit:
        while weighted_length(body + "…") > limit:
            body = body[:-1]
        return body.rstrip() + "…"
    kept = [body]
    for para in paragraphs[1:]:
        candidate = "\n\n".join(kept + [para])
        if weighted_length(candidate + (f"\n\n{tags}" if tags else "")) > limit:
            break
        kept.append(para)
    # Don't end on a lead-in like "Here's what matters:" whose list didn't fit.
    while len(kept) > 1 and kept[-1].endswith(":"):
        kept.pop()
    body = "\n\n".join(kept)
    if tags and weighted_length(f"{body}\n\n{tags}") <= limit:
        body = f"{body}\n\n{tags}"
    return body


def _check(resp: requests.Response) -> dict:
    from . import PlatformError

    body = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        detail = body.get("detail") or body.get("title") or resp.text[:300]
        raise PlatformError(f"X said ({resp.status_code}): {detail}")
    return body


def publish_x(post) -> str:
    from . import PlatformError

    auth = _auth()
    text = post.x_text or shorten(post.text)
    if weighted_length(text) > LIMIT:
        raise PlatformError(f"x_text is too long for X ({weighted_length(text)}/{LIMIT})")
    payload: dict = {"text": text}

    media_ids = []
    for data, mime in images(post)[:MAX_IMAGES]:
        uploaded = _check(requests.post(
            f"{API}/media/upload", auth=auth, timeout=TIMEOUT,
            files={"media": ("post", data, mime)}, data={"media_category": "tweet_image"},
        ))
        media_ids.append(uploaded["data"]["id"])
    if media_ids:
        payload["media"] = {"media_ids": media_ids}

    created = _check(requests.post(f"{API}/tweets", auth=auth, json=payload, timeout=TIMEOUT))
    return f"https://x.com/i/status/{created['data']['id']}"
