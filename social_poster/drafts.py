"""Move draft files from the repo's drafts/ folder into the sheet.

Each file is imported once (the sheet's "Imported" tab remembers which). Rows
always arrive as `draft`, so nothing posts until a person approves it. Rows whose
id is already in the sheet are skipped, e.g. a week you imported by hand.
"""
from __future__ import annotations

import csv
from pathlib import Path


def import_drafts(queue, folder: str, dry_run: bool = False) -> list[str]:
    done = queue.imported_files()
    existing = {p.id for p in queue.load()}
    added: list[str] = []
    for path in sorted(Path(folder).glob("*.csv")):
        if path.name in done:
            continue
        with open(path, newline="", encoding="utf-8") as f:
            rows = [{k.strip().lower(): (v or "") for k, v in r.items() if k} for r in csv.DictReader(f)]
        new = [r for r in rows if r.get("id") and r["id"] not in existing]
        for r in new:
            r["status"], r["result"] = "draft", ""
        print(f"drafts: {path.name}: {len(new)} new, {len(rows) - len(new)} already in the sheet")
        if dry_run:
            continue
        if new:
            queue.append(new)
            existing.update(r["id"] for r in new)
            added += [r["id"] for r in new]
        queue.mark_imported(path.name)
    return added
