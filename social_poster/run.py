"""Post every approved row whose time has come, then record the outcome in the sheet.

Run: python -m social_poster.run            (posts for real)
     python -m social_poster.run --dry-run  (shows what would post, changes nothing)
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from datetime import datetime

from .drafts import import_drafts, latest_draft
from .images import render_card
from .platforms import PLANNED, PUBLISHERS, NotConfigured
from .queue import SAST, queue_from_env


MAX_SLIDES = 10


def make_images(post) -> list[bytes]:
    """Carousel slides, or one card, or nothing (video, media_url or text-only posts)."""
    if post.video_file:
        return []
    if post.slides:
        if len(post.slides) > MAX_SLIDES:
            raise ValueError(f"{len(post.slides)} slides; the most a carousel takes is {MAX_SLIDES}")
        n = len(post.slides)
        return [render_card(s, page=i + 1, total=n) for i, s in enumerate(post.slides)]
    if not post.media_url and (post.image_title or "instagram" in post.platforms):
        return [render_card(post.image_title or post.text.strip().splitlines()[0])]
    return []


def publish_post(post) -> tuple[str, str]:
    """Returns (status, result). A post is 'posted' only if every platform succeeded."""
    if not post.platforms:
        return "failed", "no platforms listed"
    if post.video_file and not Path(post.video_file).is_file():
        return "failed", f"video_file not found in the repo: {post.video_file}"
    if not post.text and not post.media_url and not post.video_file:
        return "failed", "nothing to post: text and media_url are both empty"
    try:
        post.images = make_images(post)
    except Exception as e:
        return "failed", f"image: could not make it ({e})"
    results, ok, skipped = [], True, 0
    for name in post.platforms:
        publisher = PUBLISHERS.get(name)
        if publisher is None:
            reason = "coming soon" if name in PLANNED else "unknown platform"
            results.append(f"{name}: {reason}")
            ok = False
            continue
        try:
            results.append(f"{name}: {publisher(post)}")
        except NotConfigured as e:
            # A platform you haven't connected yet is skipped, not a failure,
            # so drafts can list every platform while setup is still under way.
            results.append(f"{name}: skipped, not set up ({e})")
            skipped += 1
        except Exception as e:  # one platform failing must not stop the rest
            results.append(f"{name}: FAILED {e}")
            ok = False
    if skipped == len(post.platforms):
        ok = False  # nothing was actually posted
    return ("posted" if ok else "failed"), " | ".join(results)


def refresh_from_draft(post, draft: dict | None) -> None:
    """Use the repo's latest wording: the sheet keeps the text from when a draft was first imported."""
    if not draft:
        return
    for field in ("text", "image_title", "x_text", "video_file", "media_url"):
        if field in draft:
            setattr(post, field, draft[field])
    if "slides" in draft:
        post.slides = [s.strip() for s in draft["slides"].split("||") if s.strip()]


def main(argv: list[str] | None = None, now: datetime | None = None, queue=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--import-drafts", metavar="FOLDER", help="first add new draft files from FOLDER to the sheet")
    parser.add_argument("--post-now", metavar="ID", help="post this row immediately (the owner's direct approval), ignoring status and time")
    parser.add_argument("--platforms", help="with --post-now: only these platforms, comma-separated")
    args = parser.parse_args(argv)

    now = now or datetime.now(SAST)
    queue = queue or queue_from_env()
    if args.import_drafts:
        import_drafts(queue, args.import_drafts, dry_run=args.dry_run)
    posts = queue.load()

    for post in posts:
        if post.status == "approved" and post.post_at is None:
            print(f"[{post.id}] skipped: post_at is empty or not a date like 2026-10-21 08:30")
            if not args.dry_run:
                queue.mark(post, "failed", "post_at is empty or not a date like 2026-10-21 08:30")

    if args.post_now:
        # one id, or several separated by commas
        due = []
        for pid in [x.strip() for x in args.post_now.split(",") if x.strip()]:
            match = [p for p in posts if p.id == pid]
            if not match:
                print(f"[{pid}] not found in the sheet")
                continue
            post = match[0]
            if args.import_drafts:
                refresh_from_draft(post, latest_draft(args.import_drafts, post.id))
            if post.status == "posted" and not args.platforms:
                print(f"[{post.id}] already posted")
                continue
            if args.platforms:
                post.platforms = [p.strip().lower() for p in args.platforms.split(",") if p.strip()]
            due.append(post)
    else:
        due = [p for p in posts if p.is_due(now)]
    print(f"{len(posts)} rows, {len(due)} approved and due at {now:%Y-%m-%d %H:%M} SAST")
    for post in due:
        if args.dry_run:
            print(f"[{post.id}] would post to {', '.join(post.platforms)}: {post.text[:60]!r}")
            continue
        # Mark first so a crash mid-post can't cause a double post on the next run.
        queue.mark(post, "posting", "")
        status, result = publish_post(post)
        if args.post_now and post.result and args.platforms:
            # posting an extra platform later: keep the earlier links
            result = post.result + " | " + result
            # the row stays "posted" for what already went out; a failure shows in result
        queue.mark(post, status, result)
        print(f"[{post.id}] {status}: {result}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
