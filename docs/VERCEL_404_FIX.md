# Fix Vercel 404 NOT_FOUND

Your app lives in the **`web`** folder. If Vercel deploys the repo root, you get **404: NOT_FOUND**.

## Fix (recommended — 2 minutes)

1. Open **Vercel** → your project **iminds-tutorials**
2. **Settings** → **General**
3. Find **Root Directory** → click **Edit**
4. Enter: `web`
5. Click **Save**
6. Go to **Deployments** → latest deployment → **⋯** → **Redeploy**

After ~2 minutes, open `https://iminds-tutorials.vercel.app` — you should see the **Student / Teacher / Admin** home page.

## Environment variables (after redeploy)

**Settings** → **Environment Variables**:

| Name | Example |
|------|---------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-URL/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://iminds-tutorials.vercel.app` |

Then **Redeploy** again.

## Optional: push config from repo

This repo includes a root `vercel.json` that builds `web/`. Push to GitHub and redeploy:

```powershell
cd c:\Users\HP\Desktop\iminds-tutorials
git add vercel.json package.json docs/VERCEL_404_FIX.md
git commit -m "Fix Vercel build: use web folder"
git push
```

Still set **Root Directory = `web`** in Vercel if 404 persists.
