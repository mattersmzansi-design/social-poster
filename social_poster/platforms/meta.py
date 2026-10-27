"""Facebook Page and Instagram (Business/Creator) posting via Meta's Graph API.

Secrets:
  META_PAGE_ID            - the Facebook Page's numeric ID
  META_PAGE_TOKEN         - a long-lived Page access token
  META_IG_USER_ID         - the Instagram account ID linked to that Page (Instagram only)
  META_GRAPH_VERSION      - optional, e.g. v26.0
"""
from __future__ import annotations

import os

import requests

TIMEOUT = 60


def _cfg(name: str) -> str:
    from . import NotConfigured

    # Tolerate values pasted with surrounding quotes or spaces, e.g. "1106...".
    value = os.environ.get(name, "").strip().strip("'\"").strip()
    if not value:
        raise NotConfigured(f"{name} is not set")
    return value


def _graph(path: str, **params) -> dict:
    from . import PlatformError

    version = os.environ.get("META_GRAPH_VERSION", "v26.0")
    params["access_token"] = _cfg("META_PAGE_TOKEN")
    resp = requests.post(f"https://graph.facebook.com/{version}/{path}", data=params, timeout=TIMEOUT)
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400 or "error" in body:
        message = body.get("error", {}).get("message", resp.text[:300])
        raise PlatformError(f"Meta said: {message}")
    return body


def _get(path: str, **params) -> dict:
    version = os.environ.get("META_GRAPH_VERSION", "v26.0")
    params["access_token"] = _cfg("META_PAGE_TOKEN")
    resp = requests.get(f"https://graph.facebook.com/{version}/{path}", params=params, timeout=TIMEOUT)
    return resp.json() if resp.ok else {}


def publish_facebook(post) -> str:
    page_id = _cfg("META_PAGE_ID")
    if post.media_url:
        body = _graph(f"{page_id}/photos", url=post.media_url, message=post.text)
        post_id = body.get("post_id") or body["id"]
    else:
        post_id = _graph(f"{page_id}/feed", message=post.text)["id"]
    return f"https://www.facebook.com/{post_id}"


def publish_instagram(post) -> str:
    from . import PlatformError

    if not post.media_url:
        raise PlatformError("Instagram needs an image: add a public image link in media_url")
    ig_user = _cfg("META_IG_USER_ID")
    container = _graph(f"{ig_user}/media", image_url=post.media_url, caption=post.text)["id"]
    media_id = _graph(f"{ig_user}/media_publish", creation_id=container)["id"]
    return _get(media_id, fields="permalink").get("permalink") or f"instagram media {media_id}"
