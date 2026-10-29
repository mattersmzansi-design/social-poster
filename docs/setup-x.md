# Set up X (Twitter)

**Cost:** X's API is pay-per-use: roughly US$0.01–0.015 per post (about R5–R10 a month at one
post a day). Posts containing a link cost much more (around US$0.20), so MMM's X posts avoid links.
Check current prices on the X developer portal.

1. Go to https://developer.x.com and sign in with the **MMM X account** (posts go out as whoever signs in).
2. Sign up for developer access and **add credit** (billing) in the developer console.
3. Create a **Project** and an **App** inside it.
4. In the app's **User authentication settings**, set **App permissions** to **Read and write**
   (Type of App: *Web App, Automated App or Bot*; any website and callback URL, e.g. `https://example.com`: it's never used).
   Do this *before* step 5, or the tokens will be read-only.
5. Open the app → **Keys & Tokens**, section **OAuth 1.0 Keys** (ignore the Bearer Token and the OAuth 2.0 section):
   - **Consumer Key** → *Regenerate*: shows the Consumer Key (`X_API_KEY`) and Consumer Secret (`X_API_SECRET`).
   - **Access Token** (it should say *For @youraccount · Read and write*) → *Generate*: shows the
     Access Token (`X_ACCESS_TOKEN`) and Access Token Secret (`X_ACCESS_TOKEN_SECRET`).
   Each value is shown once: paste it into GitHub straight away.
6. GitHub → social-poster → Settings → Secrets and variables → Actions, add:
   `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`.

These keys don't expire.

## Text for X
X allows 280 characters. Add an `x_text` column to the sheet to write your own X version;
if it's empty, the tool uses the post's opening lines plus its hashtags.
