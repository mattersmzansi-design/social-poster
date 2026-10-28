import csv
from datetime import datetime

import pytest

from social_poster import run
from social_poster.platforms import meta
from social_poster.queue import SAST, CsvQueue, parse_time

HEADER = ["id", "status", "post_at", "platforms", "text", "media_url", "result", "image_title"]
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
    monkeypatch.setattr(meta, "_get", lambda *a, **k: {
        "permalink": "https://instagram.com/p/abc",
        "images": [{"width": 720, "source": "https://cdn/small.png"}, {"width": 1080, "source": "https://cdn/big.png"}],
    })
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


def test_instagram_without_image_gets_a_generated_one(tmp_path, fake_meta):
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "instagram", "Inflation up 📈\nmore", "", ""]])
    run.main([], now=NOW, queue=q)
    paths = [c[0] for c in fake_meta]
    assert paths == ["123/photos", "456/media", "456/media_publish"]
    assert fake_meta[0][1]["published"] == "false"  # hidden upload, only used as Instagram's image link
    assert fake_meta[1][1]["image_url"] == "https://cdn/big.png"
    assert statuses(q)["a"][0] == "posted"


def test_image_title_makes_facebook_post_a_photo(tmp_path, fake_meta):
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "facebook", "hello", "", "", "Rates | Prime is 10.75%"]])
    run.main([], now=NOW, queue=q)
    path, params = fake_meta[0]
    assert path == "123/photos"
    assert params["message"] == "hello"
    name, png, mime = params["files"]["source"]
    assert png.startswith(b"\x89PNG") and mime == "image/png"


def test_missing_secrets_and_planned_platforms_are_reported(tmp_path, monkeypatch):
    monkeypatch.delenv("META_PAGE_ID", raising=False)
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "facebook, tiktok", "hi", "", ""]])
    run.main([], now=NOW, queue=q)
    status, result = statuses(q)["a"]
    assert status == "failed"
    assert "facebook: not set up (META_PAGE_ID is not set)" in result
    assert "tiktok: coming soon" in result


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
    assert parse_time("2026/10/27 19:00:00") == datetime(2026, 10, 27, 19, 0, tzinfo=SAST)
    assert parse_time("27/10/2026 19:00:00") == datetime(2026, 10, 27, 19, 0, tzinfo=SAST)
    assert parse_time("") is None


def test_meta_secrets_tolerate_pasted_quotes(monkeypatch):
    monkeypatch.setenv("META_PAGE_ID", ' "1106869425834996" ')
    assert meta._cfg("META_PAGE_ID") == "1106869425834996"


def test_render_card_is_square_png_and_drops_emoji():
    import io
    from PIL import Image
    from social_poster.images import clean_title, render_card

    assert clean_title("Inflation up 📈 to 4.5% 🇿🇦") == "Inflation up to 4.5%"
    img = Image.open(io.BytesIO(render_card("Fuel | Petrol price on Wednesday ⛽")))
    assert img.size == (1080, 1080)
    with pytest.raises(ValueError):
        render_card("📈")


class FakeResp:
    def __init__(self, status=200, body=None, headers=None):
        self.status_code, self._body, self.headers = status, body or {}, headers or {}
        self.content = b"x"
        self.ok = status < 400
        self.text = str(body)

    def json(self):
        return self._body


def test_x_shortens_long_text_and_keeps_hashtags():
    from social_poster.platforms.x import LIMIT, shorten, weighted_length

    text = "Headline 📈\n\n" + "word " * 80 + "\n\n#MzansiMoneyMatters #Inflation"
    short = shorten(text)
    assert weighted_length(short) <= LIMIT
    assert short.startswith("Headline") and short.endswith("#MzansiMoneyMatters #Inflation")
    assert weighted_length(shorten("x" * 400)) <= LIMIT
    lead_in = "Budget in 60 seconds\n\nHere's what matters:\n\n" + "item " * 70 + "\n\n#MMM"
    assert shorten(lead_in) == "Budget in 60 seconds\n\n#MMM"


def test_x_posts_with_uploaded_image(tmp_path, monkeypatch):
    from social_poster.platforms import x

    for k in ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"):
        monkeypatch.setenv(k, "v")
    calls = []

    def fake_post(url, **kw):
        calls.append((url, kw))
        if url.endswith("/media/upload"):
            return FakeResp(200, {"data": {"id": "m1"}})
        return FakeResp(201, {"data": {"id": "t1"}})

    monkeypatch.setattr(x.requests, "post", fake_post)
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "x", "Hello\n\n#MMM", "", "", "Rates | Prime 10.75%"]])
    run.main([], now=NOW, queue=q)
    assert statuses(q)["a"] == ("posted", "x: https://x.com/i/status/t1")
    assert calls[1][1]["json"] == {"text": "Hello\n\n#MMM", "media": {"media_ids": ["m1"]}}


def test_x_error_is_reported(tmp_path, monkeypatch):
    from social_poster.platforms import x

    for k in ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"):
        monkeypatch.setenv(k, "v")
    monkeypatch.setattr(x.requests, "post", lambda url, **kw: FakeResp(402, {"title": "CreditsDepleted"}))
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "x", "Hello", "", ""]])
    run.main([], now=NOW, queue=q)
    assert statuses(q)["a"] == ("failed", "x: FAILED X said (402): CreditsDepleted")


def test_linkedin_little_text_escaping():
    from social_poster.platforms.linkedin import to_little_text

    assert to_little_text("Prime (10.75%) #MzansiMoneyMatters") == "Prime \\(10.75%\\) {hashtag|\\#|MzansiMoneyMatters}"


def test_linkedin_posts_with_image(tmp_path, monkeypatch):
    from social_poster.platforms import linkedin

    monkeypatch.setenv("LINKEDIN_ACCESS_TOKEN", "tok")
    monkeypatch.delenv("LINKEDIN_AUTHOR", raising=False)
    calls = []
    monkeypatch.setattr(linkedin.requests, "get", lambda url, **kw: FakeResp(200, {"sub": "abc"}))
    monkeypatch.setattr(linkedin.requests, "put", lambda url, **kw: calls.append(("PUT", url)) or FakeResp(201))

    def fake_post(url, **kw):
        calls.append(("POST", url, kw.get("json")))
        if "initializeUpload" in url:
            return FakeResp(200, {"value": {"uploadUrl": "https://up", "image": "urn:li:image:1"}})
        return FakeResp(201, {}, {"x-restli-id": "urn:li:share:9"})

    monkeypatch.setattr(linkedin.requests, "post", fake_post)
    q = make_queue(tmp_path, [["a", "approved", "2026-10-21 08:30", "linkedin", "Hi #MMM", "", "", "Rates | Prime"]])
    run.main([], now=NOW, queue=q)
    assert statuses(q)["a"] == ("posted", "linkedin: https://www.linkedin.com/feed/update/urn:li:share:9/")
    post_body = calls[-1][2]
    assert post_body["author"] == "urn:li:person:abc"
    assert post_body["content"]["media"]["id"] == "urn:li:image:1"
    assert ("PUT", "https://up") in calls
