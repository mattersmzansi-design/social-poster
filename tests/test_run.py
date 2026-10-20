import csv
from datetime import datetime

import pytest

from social_poster import run
from social_poster.platforms import meta
from social_poster.queue import SAST, CsvQueue, parse_time

HEADER = ["id", "status", "post_at", "platforms", "text", "media_url", "result"]
NOW = datetime(2026, 10, 21, 9, 0, tzinfo=SAST)


def make_queue(tmp_path, rows):
    path = tmp_path / "queue.csv"
    with open(path, "w", newline="") as f:
        csv.writer(f).writerows([HEADER, *rows])
    return CsvQueue(str(path))


def statuses(queue):
    return {p.id: (p.status, queue._read()[p.row - 1][6]) for p in queue.load()}


@pytest.fixture
def fake_meta(monkeypatch):
    calls = []

    def fake_graph(path, **params):
        calls.append((path, params))
        return {"id": f"id-for-{path.split('/')[-1]}"}

    monkeypatch.setattr(meta, "_graph", fake_graph)
    monkeypatch.setattr(meta, "_get", lambda *a, **k: {"permalink": "https://instagram.com/p/abc"})
    monkeypatch.setenv("META_PAGE_ID", "123")
    monkeypatch.setenv("META_PAGE_TOKEN", "tok")
    monkeypatch.setenv("META_IG_USER_ID", "456")
    return calls


def test_only_approved_and_due_rows_post(tmp_path, fake_meta):
    q = make_queue(tmp_path, [
        ["a", "approved", "2026-10-21 08:30", "facebook", "hello", "", ""],
        ["b", "draft", "2026-10-21 08:30", "facebook", "not approved", "", ""],
        ["c", "approved", "2026-10-22 08:30", "facebook", "tomorrow", "", ""],
    ])
    run.main([], now=NOW, queue=q)
    s = statuses(q)
    assert s["a"] == ("posted", "facebook: https://www.facebook.com/id-for-feed")
    assert s["b"][0] == "draft"
    assert s["c"][0] == "approved"
    assert len(fake_meta) == 1


def test_posted_rows_are_not_posted_twice(tmp_path, fake_meta):
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "facebook", "hello", "", ""]])
    run.main([], now=NOW, queue=q)
    run.main([], now=NOW, queue=q)
    assert len(fake_meta) == 1


def test_instagram_uses_container_then_publish(tmp_path, fake_meta):
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "instagram", "hi", "https://x/img.jpg", ""]])
    run.main([], now=NOW, queue=q)
    assert [c[0] for c in fake_meta] == ["456/media", "456/media_publish"]
    assert fake_meta[0][1] == {"image_url": "https://x/img.jpg", "caption": "hi"}
    assert statuses(q)["a"] == ("posted", "instagram: https://instagram.com/p/abc")


def test_instagram_without_image_fails_but_facebook_still_posts(tmp_path, fake_meta):
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "facebook, instagram", "hi", "", ""]])
    run.main([], now=NOW, queue=q)
    status, result = statuses(q)["a"]
    assert status == "failed"
    assert "facebook: https://www.facebook.com/" in result
    assert "instagram: FAILED Instagram needs an image" in result


def test_missing_secrets_and_planned_platforms_are_reported(tmp_path, monkeypatch):
    monkeypatch.delenv("META_PAGE_ID", raising=False)
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "facebook, x", "hi", "", ""]])
    run.main([], now=NOW, queue=q)
    status, result = statuses(q)["a"]
    assert status == "failed"
    assert "facebook: not set up (META_PAGE_ID is not set)" in result
    assert "x: coming soon" in result


def test_dry_run_changes_nothing(tmp_path, fake_meta):
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "facebook", "hello", "", ""]])
    run.main(["--dry-run"], now=NOW, queue=q)
    assert fake_meta == []
    assert statuses(q)["a"][0] == "approved"


def test_bad_date_on_approved_row_is_flagged(tmp_path, fake_meta):
    q = make_queue(tmp_path, [["a", "approved", "next tuesday", "facebook", "hello", "", ""]])
    run.main([], now=NOW, queue=q)
    assert statuses(q)["a"][0] == "failed"
    assert fake_meta == []


def test_parse_time_formats():
    assert parse_time("2026-10-21 08:30") == datetime(2026, 10, 21, 8, 30, tzinfo=SAST)
    assert parse_time("21/10/2026 08:30") == datetime(2026, 10, 21, 8, 30, tzinfo=SAST)
    assert parse_time("") is None
