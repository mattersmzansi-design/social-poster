# Weekly drafts (automatic)

Every **Saturday morning** a scheduled Claude session:
1. researches the week's South African money news (official sources first),
2. writes next week's posts (Monday to Sunday) following [the MMM voice guide](brand.md),
   including 1–2 carousels, image headlines and a `sources` note per post,
3. saves them as `drafts/<monday's date>-week.csv` in this repo.

Within the hour, the posting job adds those rows to your Google Sheet as **draft**.
Each drafts file is added only once (see the sheet's **Imported** tab), so you can edit or delete rows freely.

**Your part:** read the drafts, check the `sources`, edit anything, and set `status` to `approved`.
Nothing is ever posted without that.

To stop the weekly drafts, ask Claude to turn off the "MMM weekly drafts" scheduled task.
