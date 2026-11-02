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


def _version() -> str:
    return os.environ.get("META_GRAPH_VERSION", "v26.0")


def _publish_facebook_video(post) -> str:
    from . import PlatformError

    page_id = _cfg("META_PAGE_ID")
    with open(post.video_file, "rb") as f:
        resp = requests.post(
            f"https://graph-video.facebook.com/{_version()}/{page_id}/videos",
            data={"description": post.text, "access_token": _cfg("META_PAGE_TOKEN")},
            files={"source": (os.path.basename(post.video_file), f, "video/mp4")},
            timeout=600,
        )
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400 or "error" in body:
        raise PlatformError(f"Meta said: {body.get('error', {}).get('message', resp.text[:300])}")
    return f"https://www.facebook.com/{page_id}/videos/{body['id']}"


def _facebook_hosted_video_url(post) -> str:
    """Upload the video to the Page unpublished and return Meta's own link to the file."""
    from . import PlatformError

    page_id = _cfg("META_PAGE_ID")
    with open(post.video_file, "rb") as f:
        resp = requests.post(
            f"https://graph-video.facebook.com/{_version()}/{page_id}/videos",
            data={"published": "false", "access_token": _cfg("META_PAGE_TOKEN")},
            files={"source": (os.path.basename(post.video_file), f, "video/mp4")},
            timeout=600,
        )
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400 or "error" in body:
        raise PlatformError(f"Meta said: {body.get('error', {}).get('message', resp.text[:300])}")
    for _ in range(36):  # Facebook needs a moment before the file link exists
        src = _get(body["id"], fields="source").get("source")
        if src:
            return src
        time.sleep(5)
    raise PlatformError("Facebook didn't give a link to the uploaded video in time")


def _wait_and_publish(ig_user: str, container: str) -> str:
    from . import PlatformError

    # Instagram processes the video before it can be published; this can take a few minutes.
    for _ in range(60):
        info = _get(container, fields="status_code,status")
        status = info.get("status_code")
        if status == "FINISHED":
            break
        if status in ("ERROR", "EXPIRED"):
            raise PlatformError(f"Instagram couldn't process the video ({status}: {info.get('status', 'no detail')})")
        time.sleep(10)
    else:
        raise PlatformError("Instagram was still processing the video after 10 minutes")
    media_id = _graph(f"{ig_user}/media_publish", creation_id=container)["id"]
    return _get(media_id, fields="permalink").get("permalink") or f"instagram media {media_id}"


def _publish_instagram_reel(post) -> str:
    """Reels: upload straight to Instagram; if Instagram refuses the upload, hand it a link
    to the same file hosted (unpublished) on the Facebook Page instead."""
    from . import PlatformError

    ig_user = _cfg("META_IG_USER_ID")
    try:
        created = _graph(f"{ig_user}/media", media_type="REELS", upload_type="resumable",
                         caption=post.text, share_to_feed="true")
        container = created["id"]
        upload_url = created.get("uri") or f"https://rupload.facebook.com/ig-api-upload/{_version()}/{container}"
        with open(post.video_file, "rb") as f:
            data = f.read()
        resp = requests.post(upload_url, data=data, timeout=600, headers={
            "Authorization": f"OAuth {_cfg('META_PAGE_TOKEN')}",
            "offset": "0",
            "file_size": str(len(data)),
        })
        if resp.status_code >= 400:
            raise PlatformError(f"Instagram video upload failed ({resp.status_code}): {resp.text[:200]}")
        return _wait_and_publish(ig_user, container)
    except PlatformError as direct_error:
        try:
            url = _facebook_hosted_video_url(post)
            container = _graph(f"{ig_user}/media", media_type="REELS", video_url=url,
                               caption=post.text, share_to_feed="true")["id"]
        except Exception as e:  # report both routes' reasons
            raise PlatformError(f"{e} (direct upload also failed: {direct_error})")
    return _wait_and_publish(ig_user, container)


def publish_facebook(post) -> str:
    if post.video_file:
        return _publish_facebook_video(post)
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

    if post.video_file:
        return _publish_instagram_reel(post)
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
