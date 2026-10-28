# Set up LinkedIn (personal profile)

Posts go to **your personal LinkedIn profile**. (Posting as a LinkedIn *company page* needs
LinkedIn's Community Management API approval; ask Claude if you want to apply.)

**Free**, but LinkedIn's posting key **expires after 60 days**. The tool's `result` column will say
"token expired? renew it" when that happens; redo step 4–5.

1. Go to https://www.linkedin.com/developers/apps → **Create app**.
   It asks for a LinkedIn **Page** to associate: pick or create one (e.g. a Mzansi Money Matters page)
   and add a logo. Then verify the app from that Page if LinkedIn asks.
2. In the app's **Products** tab, request:
   - **Share on LinkedIn**
   - **Sign In with LinkedIn using OpenID Connect**
   Both are self-serve and are usually approved instantly.
3. In the **Auth** tab, note the scopes now listed: `openid`, `profile`, `w_member_social`.
4. Open LinkedIn's **OAuth token generator** (Developer portal → *Docs and tools* → *OAuth Token Tools*,
   or https://www.linkedin.com/developers/tools/oauth). Choose your app, tick
   `openid`, `profile` and `w_member_social`, **Request access token**, sign in and allow.
5. Copy the **access token** and add it in GitHub → Settings → Secrets and variables → Actions as
   `LINKEDIN_ACCESS_TOKEN`.

Optional: `LINKEDIN_VERSION` (format `YYYYMM`) if LinkedIn reports the API version is no longer supported.
