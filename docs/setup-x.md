# Set up X (Twitter)

**Cost:** X's API is pay-per-use: roughly US$0.01–0.015 per post (about R5–R10 a month at one
post a day). Posts containing a link cost much more (around US$0.20), so MMM's X posts avoid links.
Check current prices on the X developer portal.

1. Go to https://developer.x.com and sign in with the **MMM X account** (posts go out as whoever signs in).
2. Sign up for developer access and **add credit** (billing) in the developer console.
3. Create a **Project** and an **App** inside it.
4. In the app's **User authentication settings**, set **App permissions** to **Read and write**
   (type: Web App / Automated App; any website and callback URL, e.g. `https://example.com`).
   Do this *before* step 5, or the tokens will be read-only.
5. In **Keys and tokens**:
   - **API Key and Secret** (Consumer Keys) → *Regenerate* → copy both.
   - **Access Token and Secret** → *Generate* → copy both. It must say *Read and Write*.
6. GitHub → social-poster → Settings → Secrets and variables → Actions, add:
   `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`.

These keys don't expire.

## Text for X
X allows 280 characters. Add an `x_text` column to the sheet to write your own X version;
if it's empty, the tool uses the post's opening lines plus its hashtags.
