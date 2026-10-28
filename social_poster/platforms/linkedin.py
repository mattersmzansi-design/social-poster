"""LinkedIn posting to your personal profile via the Posts API.

Secrets:
  LINKEDIN_ACCESS_TOKEN - member token with w_member_social (+ openid, profile).
                          LinkedIn tokens last 60 days; renew before they expire.
  LINKEDIN_AUTHOR       - optional, e.g. urn:li:person:abc123 (looked up from the token if unset)
  LINKEDIN_VERSION      - optional API version, YYYYMM
"""
from __future__ import annotations

import os
import re

import requests

from .media import images

API = "https://api.linkedin.com"
TIMEOUT = 60
RESERVED = set("\\|{}@[]()<>#*_~")
MAX_IMAGES = 20


def _cfg(name: str, default: str | None = None) -> str:
    from . import NotConfigured

    value = os.environ.get(name, "").strip().strip("'\"").strip()
    if value:
        return value
    if default is not None:
        return default
    raise NotConfigured(f"{name} is not set")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_cfg('LINKEDIN_ACCESS_TOKEN')}",
        "LinkedIn-Version": _cfg("LINKEDIN_VERSION", "202609"),
        "X-Restli-Protocol-Version": "2.0.0",
    }


def _check(resp: requests.Response) -> requests.Response:
    from . import PlatformError

    if resp.status_code >= 400:
        try:
            detail = resp.json().get("message", resp.text[:300])
        except ValueError:
            detail = resp.text[:300]
        hint = " (token expired? renew it)" if resp.status_code == 401 else ""
        raise PlatformError(f"LinkedIn said ({resp.status_code}): {detail}{hint}")
    return resp


def to_little_text(text: str) -> str:
    """LinkedIn's commentary format: escape reserved characters, turn #Tags into hashtags."""
    out = []
    for part in re.split(r"(#\w+)", text):
        if re.fullmatch(r"#\w+", part):
            out.append("{hashtag|\\#|" + part[1:] + "}")
        else:
            out.append("".join("\\" + ch if ch in RESERVED else ch for ch in part))
    return "".join(out)


def _author() -> str:
    author = os.environ.get("LINKEDIN_AUTHOR", "").strip()
    if author:
        return author
    info = _check(requests.get(f"{API}/v2/userinfo", headers=_headers(), timeout=TIMEOUT)).json()
    return f"urn:li:person:{info['sub']}"


def _upload_image(author: str, data: bytes) -> str:
    init = _check(requests.post(
        f"{API}/rest/images?action=initializeUpload", headers=_headers(), timeout=TIMEOUT,
        json={"initializeUploadRequest": {"owner": author}},
    )).json()["value"]
    _check(requests.put(init["uploadUrl"], data=data, timeout=TIMEOUT,
                        headers={"Authorization": _headers()["Authorization"]}))
    return init["image"]


def publish_linkedin(post) -> str:
    author = _author()
    body = {
        "author": author,
        "commentary": to_little_text(post.text),
        "visibility": "PUBLIC",
        "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []},
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    alt = post.image_title or "Mzansi Money Matters"
    uploaded = [_upload_image(author, data) for data, _ in images(post)[:MAX_IMAGES]]
    if len(uploaded) == 1:
        body["content"] = {"media": {"id": uploaded[0], "altText": alt}}
    elif uploaded:
        slide_alts = post.slides or [alt] * len(uploaded)
        body["content"] = {"multiImage": {"images": [
            {"id": urn, "altText": a.replace("|", "-")} for urn, a in zip(uploaded, slide_alts)
        ]}}
    resp = _check(requests.post(f"{API}/rest/posts", headers=_headers(), json=body, timeout=TIMEOUT))
    urn = resp.headers.get("x-restli-id", "")
    return f"https://www.linkedin.com/feed/update/{urn}/" if urn else "posted (LinkedIn returned no link)"
