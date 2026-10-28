"""Facebook Page and Instagram (Business/Creator) posting via Meta's Graph API.

Secrets:
  META_PAGE_ID            - the Facebook Page's numeric ID
  META_PAGE_TOKEN         - a long-lived Page access token
  META_IG_USER_ID         - the Instagram account ID linked to that Page (Instagram only)
  META_GRAPH_VERSION      - optional, e.g. v26.0
"""
from __future__ import annotations

import json
import os
import time

import requests

TIMEOUT = 60


def _cfg(name: str) -> str:
    from . import NotConfigured

    # Tolerate values pasted with surrounding quotes or spaces, e.g. "1106...".
    value = os.environ.get(name, "").strip().strip("'\"").strip()
    if not value:
        raise NotConfigured(f"{name} is not set")
    return value


def _graph(path: str, files=None, **params) -> dict:
    from . import PlatformError

    version = os.environ.get("META_GRAPH_VERSION", "v26.0")
    params["access_token"] = _cfg("META_PAGE_TOKEN")
    resp = requests.post(f"https://graph.facebook.com/{version}/{path}", data=params, files=files, timeout=TIMEOUT)
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


def _png(png: bytes) -> dict:
    return {"source": ("post.png", png, "image/png")}


def _upload_unpublished(png: bytes) -> str:
    """Upload to the Page without showing it to followers; returns the photo id."""
    return _graph(f"{_cfg('META_PAGE_ID')}/photos", files=_png(png), published="false")["id"]


def _host_image(png: bytes) -> str:
    """Instagram fetches images by URL, so upload the generated image to the Page
    unpublished (invisible to followers) and hand Instagram Meta's own link to it."""
    from . import PlatformError

    images = _get(_upload_unpublished(png), fields="images").get("images") or []
    if not images:
        raise PlatformError("uploaded the image but Meta returned no link to it")
    return max(images, key=lambda i: i.get("width", 0))["source"]


def publish_facebook(post) -> str:
    page_id = _cfg("META_PAGE_ID")
    if len(post.images) > 1:
        photo_ids = [_upload_unpublished(png) for png in post.images]
        attached = {f"attached_media[{i}]": json.dumps({"media_fbid": pid}) for i, pid in enumerate(photo_ids)}
        post_id = _graph(f"{page_id}/feed", message=post.text, **attached)["id"]
    elif post.images and not post.media_url:
        body = _graph(f"{page_id}/photos", files=_png(post.images[0]), message=post.text)
        post_id = body.get("post_id") or body["id"]
    elif post.media_url:
        body = _graph(f"{page_id}/photos", url=post.media_url, message=post.text)
        post_id = body.get("post_id") or body["id"]
    else:
        post_id = _graph(f"{page_id}/feed", message=post.text)["id"]
    return f"https://www.facebook.com/{post_id}"


def publish_instagram(post) -> str:
    from . import PlatformError

    ig_user = _cfg("META_IG_USER_ID")
    if len(post.images) > 1:
        children = [
            _graph(f"{ig_user}/media", image_url=_host_image(png), is_carousel_item="true")["id"]
            for png in post.images
        ]
        container = _graph(f"{ig_user}/media", media_type="CAROUSEL", children=",".join(children), caption=post.text)["id"]
    else:
        if post.media_url:
            image_url = post.media_url
        elif post.images:
            image_url = _host_image(post.images[0])
        else:
            raise PlatformError("Instagram needs an image: fill in image_title, slides or media_url")
        container = _graph(f"{ig_user}/media", image_url=image_url, caption=post.text)["id"]
    # Instagram may still be fetching the image; give it a few short retries.
    for attempt in range(4):
        try:
            media_id = _graph(f"{ig_user}/media_publish", creation_id=container)["id"]
            break
        except PlatformError:
            if attempt == 3:
                raise
            time.sleep(5)
    return _get(media_id, fields="permalink").get("permalink") or f"instagram media {media_id}"
