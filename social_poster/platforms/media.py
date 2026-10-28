"""The post's pictures as bytes, for platforms that take uploads rather than links."""
from __future__ import annotations

import requests


def images(post) -> list[tuple[bytes, str]]:
    """Returns [(data, mime type), ...]; empty for a text-only post."""
    from . import PlatformError

    if post.images:
        return [(png, "image/png") for png in post.images]
    if post.media_url:
        resp = requests.get(post.media_url, timeout=60)
        if not resp.ok:
            raise PlatformError(f"could not download media_url ({resp.status_code})")
        return [(resp.content, resp.headers.get("Content-Type", "image/jpeg").split(";")[0])]
    return []
