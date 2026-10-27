"""The post queue: one row per post, kept in a Google Sheet.

Columns (header row, in any order):
  id        - anything unique, e.g. 2026-10-21-a
  status    - draft | approved | posted | failed
  post_at   - when to post, South African time, e.g. 2026-10-21 08:30
  platforms - comma-separated: facebook, instagram, x, linkedin, youtube, tiktok
  text      - the post text
  media_url - optional public link to an image (required for Instagram)
  result    - filled in by the tool: post links or the error
"""
from __future__ import annotations

import csv
import json
import os
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

SAST = ZoneInfo("Africa/Johannesburg")
COLUMNS = ["id", "status", "post_at", "platforms", "text", "media_url", "result"]


@dataclass
class Post:
    row: int  # 1-based sheet row, used to write the result back
    id: str
    status: str
    post_at: datetime | None
    platforms: list[str]
    text: str
    media_url: str

    def is_due(self, now: datetime) -> bool:
        return self.status == "approved" and self.post_at is not None and self.post_at <= now


def parse_time(value: str) -> datetime | None:
    value = value.strip()
    if not value:
        return None
    # Google Sheets reformats typed dates by locale, often adding seconds.
    for fmt in (
        "%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M", "%Y/%m/%d %H:%M:%S",
        "%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S",
    ):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=SAST)
        except ValueError:
            continue
    raise ValueError(f"post_at '{value}' is not a date like 2026-10-21 08:30")


def rows_to_posts(rows: list[list[str]]) -> list[Post]:
    if not rows:
        return []
    header = [h.strip().lower() for h in rows[0]]
    missing = [c for c in COLUMNS if c not in header]
    if missing:
        raise ValueError(f"sheet is missing columns: {', '.join(missing)}")
    posts = []
    for i, raw in enumerate(rows[1:], start=2):
        cell = {name: (raw[idx].strip() if idx < len(raw) else "") for idx, name in enumerate(header)}
        if not any(cell.values()):
            continue
        try:
            post_at = parse_time(cell["post_at"])
        except ValueError:
            post_at = None  # reported when the row is approved; see run.py
        posts.append(
            Post(
                row=i,
                id=cell["id"],
                status=cell["status"].lower(),
                post_at=post_at,
                platforms=[p.strip().lower() for p in cell["platforms"].split(",") if p.strip()],
                text=cell["text"],
                media_url=cell["media_url"],
            )
        )
    return posts


class GoogleSheetQueue:
    def __init__(self, sheet_id: str, service_account_json: str, worksheet: str = "Posts"):
        import gspread

        client = gspread.service_account_from_dict(json.loads(service_account_json))
        self._ws = client.open_by_key(sheet_id).worksheet(worksheet)
        self._header = [h.strip().lower() for h in self._ws.row_values(1)]

    def load(self) -> list[Post]:
        return rows_to_posts(self._ws.get_all_values())

    def mark(self, post: Post, status: str, result: str) -> None:
        self._ws.update_cell(post.row, self._header.index("status") + 1, status)
        self._ws.update_cell(post.row, self._header.index("result") + 1, result)


class CsvQueue:
    """Local stand-in for the sheet, for testing without Google."""

    def __init__(self, path: str):
        self.path = path

    def _read(self) -> list[list[str]]:
        with open(self.path, newline="", encoding="utf-8") as f:
            return list(csv.reader(f))

    def load(self) -> list[Post]:
        return rows_to_posts(self._read())

    def mark(self, post: Post, status: str, result: str) -> None:
        rows = self._read()
        header = [h.strip().lower() for h in rows[0]]
        row = rows[post.row - 1]
        row += [""] * (len(header) - len(row))
        row[header.index("status")] = status
        row[header.index("result")] = result
        with open(self.path, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(rows)


def queue_from_env():
    if os.environ.get("QUEUE_CSV"):
        return CsvQueue(os.environ["QUEUE_CSV"])
    return GoogleSheetQueue(
        os.environ["SHEET_ID"],
        os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"],
        os.environ.get("SHEET_TAB", "Posts"),
    )
