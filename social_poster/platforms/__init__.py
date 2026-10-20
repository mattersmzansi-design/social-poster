"""Each platform module exposes `publish(post) -> str` returning a link to the live post.

Platforms read their own credentials from environment variables, so a platform
whose secrets are not set yet is simply reported as "not set up" for that row.
"""
from __future__ import annotations

from . import meta


class PlatformError(Exception):
    pass


class NotConfigured(PlatformError):
    pass


PUBLISHERS = {
    "facebook": meta.publish_facebook,
    "instagram": meta.publish_instagram,
}

PLANNED = {"x", "linkedin", "youtube", "tiktok"}
