# Set up the Google Sheet (the post queue)

1. Create a Google Sheet. Rename the first tab to **Posts**.
2. Put these headings in row 1, one per column:
   `id | status | post_at | platforms | text | media_url | result`
3. Create a robot account that can edit the sheet:
   1. Go to https://console.cloud.google.com/ and create a project (e.g. "MMM poster").
   2. Search for **Google Sheets API** and click **Enable**.
   3. Go to **IAM & Admin → Service Accounts → Create service account**. Any name. Skip the optional steps.
   4. Open it → **Keys → Add key → Create new key → JSON**. A file downloads. Keep it private.
4. Copy the robot's email (looks like `name@project.iam.gserviceaccount.com`) and **Share** the sheet with it as **Editor**.
5. In GitHub, open the repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SHEET_ID`: the long code in the sheet's link, between `/d/` and `/edit`.
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: paste the whole contents of the downloaded JSON file.

## Using the sheet
| column | what to put |
|---|---|
| id | anything unique, e.g. `2026-10-21-a` |
| status | `draft` while editing. Change to `approved` when it may go out. The tool sets `posting`, `posted` or `failed`. |
| post_at | South African time, e.g. `2026-10-21 08:30` |
| platforms | e.g. `facebook, instagram` |
| text | the post |
| media_url | a public image link (needed for Instagram) |
| result | leave empty: the tool writes the post links or the error here |

A `failed` row never retries by itself. Fix the problem, then set it back to `approved`.
If a row is `failed` but some platforms show links in `result`, those already posted: remove them from `platforms` before re-approving, or they post twice.
