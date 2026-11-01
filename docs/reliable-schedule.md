# On-time posting (from the Google Sheet)

GitHub's built-in schedule is "best effort": on quiet repos it can run hours late,
so a post set for 07:00 might go out at 11:00. This makes the **sheet** start the job instead,
every hour and on demand. It's free.

## 1. A GitHub key that can only start the job
1. GitHub → your profile picture → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. Name: `MMM sheet`. Expiration: 1 year. **Repository access → Only select repositories →
   social-poster**.
3. **Permissions → Repository permissions → Actions: Read and write**. Leave everything else as is.
4. **Generate token** and copy it (shown once).

## 2. The script in the sheet
1. In the MMM Poster sheet: **Extensions → Apps Script**.
2. Delete what's in `Code.gs` and paste in the contents of [`apps-script/Code.gs`](../apps-script/Code.gs). Click **Save**.
3. **Project Settings** (gear icon) → **Script properties → Add script property**:
   name `GITHUB_TOKEN`, value: the token from step 1. **Save**.
4. Back in the sheet, reload the page. A new **MMM** menu appears.
5. **MMM → Turn on hourly posting**. Google asks for permission the first time
   (it may warn the app is unverified: **Advanced → Go to project → Allow**; it's your own script).

Now posts go out within the hour they're due. **MMM → Post approved now** posts immediately.
