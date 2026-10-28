"""The post's picture as bytes, for platforms that take uploads rather than links."""
from __future__ import annotations

import requests


def image_bytes(post) -> tuple[bytes, str] | None:
    """Returns (data, mime type), or None for a text-only post."""
    from . import PlatformError

    if post.image_png and not post.media_url:
        return post.image_png, "image/png"
    if post.media_url:
        resp = requests.get(post.media_url, timeout=60)
        if not resp.ok:
            raise PlatformError(f"could not download media_url ({resp.status_code})")
        return resp.content, resp.headers.get("Content-Type", "image/jpeg").split(";")[0]
    return None
