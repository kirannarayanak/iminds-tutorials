# Where to add environment variables on Render

You only add these on a **Web Service** (not Environment Groups).

---

## Method 1 — While creating the Web Service

1. Go to **https://dashboard.render.com**
2. Click **+ New** (top right) → **Web Service**
3. Connect **GitHub** → choose **`iminds-tutorials`**
4. Fill in:
   - **Name:** `iminds-api`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance type:** **Free**
5. **Scroll down** on the same page — past Build & Deploy, Branch, Region
6. Find section titled **"Environment Variables"**
   - Subtitle: *"Set environment-specific config and secrets..."*
7. Click **+ Add Environment Variable** for each row:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | paste Neon string `postgresql://...` |
| `JWT_SECRET` | `iminds-secret-change-me-2026` |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `PAYMENT_GATEWAY` | `mock` |
| `CORS_ORIGIN` | `https://iminds-tutorials.vercel.app` |

8. Click **Deploy Web Service** at the bottom

---

## Method 2 — Service already created

1. **Dashboard** → click your service name (**iminds-api**)
2. Left sidebar under the service name, click **Environment**
   - Icon may look like a list or "Env"
   - NOT "Environment Groups" in the main workspace menu
3. Section **Environment Variables**
4. **+ Add Environment Variable** → add each key/value
5. Click **Save Changes**
6. Render will **redeploy** automatically

---

## Method 3 — Blueprint (easiest — fills most vars for you)

1. **+ New** → **Blueprint**
2. Connect repo **`iminds-tutorials`**
3. Render reads `render.yaml` from the repo
4. It will ask you to enter **`DATABASE_URL`** manually (paste Neon URL)
5. Approve → deploy

Push `render.yaml` to GitHub first:

```powershell
cd c:\Users\HP\Desktop\iminds-tutorials
git add render.yaml docs/RENDER_ENV_VARS.md
git commit -m "Add Render blueprint for API deploy"
git push
```

---

## Method 4 — Add from file

1. Create a file `backend/.env.production` on your PC (do NOT commit secrets):

```
DATABASE_URL=postgresql://YOUR_NEON_URL
JWT_SECRET=iminds-secret-change-me-2026
NODE_ENV=production
PORT=4000
PAYMENT_GATEWAY=mock
CORS_ORIGIN=https://iminds-tutorials.vercel.app
```

2. On Render **Environment** page → **Add from .env** → upload that file

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Using **Environment Groups** | Use **Web Service → Environment** instead |
| Key `DATABASE_URL,` with comma | Key must be exactly `DATABASE_URL` |
| Empty value for DATABASE_URL | Paste full Neon connection string |
| Root Directory empty | Must be `backend` |

---

## Can't find "Web Service"?

- Left menu: **Services** or **Projects**
- **+ New** menu should list: Web Service, Static Site, Postgres, **Blueprint**
- If you only see paid options, pick **Free** instance type when creating Web Service

---

## After variables are saved

Test: `https://YOUR-SERVICE.onrender.com/health`

Then Vercel:

```
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com/api/v1
```

Redeploy Vercel.
