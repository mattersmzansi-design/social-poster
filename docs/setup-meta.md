# Set up Facebook Page + Instagram

You need: a **Facebook Page** for MMM (not a personal profile) and, for Instagram, an
**Instagram Business or Creator account linked to that Page** (Instagram app →
Settings → Account type; then link it in the Page's settings).

Because only you use this app, it can stay in **Development mode**: you don't need
Meta's App Review.

1. Go to https://developers.facebook.com/apps → **Create app**. Name it (e.g. "MMM Poster").
   Use case: **Manage everything on your Page**. Business portfolio: not needed.
2. In the app, open that use case → **Permissions**, and make sure these say *Ready for testing*
   (click **Add** if not): `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
3. For Instagram: **Add use cases** → Instagram API → **Permissions and features**, and add
   `instagram_basic` and `instagram_content_publish` (and `business_management` if offered).
   Use the **Facebook login** setup, not "Unified login"; skip "Create new configuration".
   Leave the app **Unpublished**; you don't need App Review or Tech Provider for your own Page.
4. Open **Tools → Graph API Explorer**:
   - **Meta App**: your app. **User or Page** → **Get User Access Token**.
   - Add the permissions from steps 2–3, click **Generate Access Token**, and tick your Page
     and Instagram account when Facebook asks.
   - Click **ⓘ** next to the token → **Open in Access Token Tool** → **Extend Access Token**.
     Paste the extended token back into the Explorer.
   - Query `me/accounts?fields=id,name,access_token,instagram_business_account` → **Submit**.
5. Add GitHub secrets (repo → Settings → Secrets and variables → Actions) from the result:
   - `META_PAGE_ID` = `id`
   - `META_PAGE_TOKEN` = `access_token`
   - `META_IG_USER_ID` = `instagram_business_account.id`
   No `instagram_business_account`? Your Instagram isn't a Business/Creator account linked to the Page yet.

Never paste these tokens into chats or files. (Alternative for developers:
`python scripts/meta_token.py APP_ID APP_SECRET SHORT_TOKEN` does step 4 from a terminal.)

Page tokens made this way don't expire unless you change your Facebook password,
remove the app, or Meta flags the account, so re-run step 4–6 if posts start failing with a token error.
