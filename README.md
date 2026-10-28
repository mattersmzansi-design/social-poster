# MMM Social Poster

Puts MMM on the map: Claude drafts posts, **you approve them**, and this tool
publishes them on schedule to MMM's social accounts.

```
Claude drafts ──► Google Sheet (status: draft)
                       │  you edit + set status: approved
                       ▼
GitHub Actions, every hour ──► posts due rows ──► writes links back to the sheet
```

Nothing is ever posted unless its row says `approved`.

New drafts arrive by themselves every weekend: see [weekly drafts](docs/weekly-drafts.md).
Posts can be single images or [carousels](docs/images.md#carousels-several-slides).

## Platforms
| platform | status |
|---|---|
| Facebook Page | ready |
| Instagram (Business/Creator) | ready: branded images are made automatically ([images](docs/images.md)) |
| LinkedIn (personal profile) | ready: [setup](docs/setup-linkedin.md). Token renews every 60 days |
| X | ready: [setup](docs/setup-x.md). Paid per post by X |
| YouTube | planned |
| TikTok | planned (TikTok must review the app before posts can be public) |

## Setup
1. [Google Sheet queue](docs/setup-google-sheet.md)
2. [Facebook + Instagram](docs/setup-meta.md)
3. [X](docs/setup-x.md) and [LinkedIn](docs/setup-linkedin.md) (optional)
4. Test it: repo → **Actions → Post approved content → Run workflow**, tick *dry run*.
   The log lists what would post, without posting.

## Running locally
```bash
pip install -r requirements-dev.txt
pytest -q
QUEUE_CSV=my-test.csv python -m social_poster.run --dry-run
```

## Costs
GitHub Actions on a private repo includes free minutes each month; an hourly
one-minute run fits comfortably. The platform APIs used here are free at this volume.
