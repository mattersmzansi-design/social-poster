# Set up Facebook Page + Instagram

You need: a **Facebook Page** for MMM (not a personal profile) and, for Instagram, an
**Instagram Business or Creator account linked to that Page** (Instagram app →
Settings → Account type; then link it in the Page's settings).

Because only you use this app, it can stay in **Development mode**: you don't need
Meta's App Review.

1. Go to https://developers.facebook.com/apps → **Create app**.
   Choose the use case for managing a Page / **Other → Business** if asked. Any name.
2. In the app, add the products **Facebook Login for Business** (or Facebook Login) and **Instagram Graph API** if offered.
3. Note the **App ID** and **App secret** (App settings → Basic).
4. Open https://developers.facebook.com/tools/explorer:
   - Pick your app (top right).
   - **User or Page → Get User Access Token**, and tick:
     `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
     `instagram_basic`, `instagram_content_publish`, `business_management`.
   - Click **Generate Access Token** and allow it for your MMM Page and Instagram account.
   - Copy the token.
5. Ask Claude to run, or run yourself:
   `python scripts/meta_token.py APP_ID APP_SECRET THE_TOKEN`
   It prints `META_PAGE_ID`, `META_PAGE_TOKEN` and `META_IG_USER_ID`.
6. Add those three as GitHub secrets (repo → Settings → Secrets and variables → Actions).

Page tokens made this way don't expire unless you change your Facebook password,
remove the app, or Meta flags the account, so re-run step 4–6 if posts start failing with a token error.
