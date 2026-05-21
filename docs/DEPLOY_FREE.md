# Deploy without paying (Railway alternative)

Railway often asks for a **paid plan** or **card on file**. Use this **free** setup instead:

| Part | Free service |
|------|----------------|
| Website | **Vercel** (already done) |
| API (backend) | **Render** — free web service |
| Database | **Neon** — free PostgreSQL |

No Railway subscription needed.

---

## Step 1 — Free database (Neon)

1. Go to **https://neon.tech** → sign up (GitHub is fine)
2. **New Project** → name: `iminds` → region closest to you
3. On the dashboard, copy the **connection string** (starts with `postgresql://...`)
4. Open **SQL Editor** in Neon → paste and run these files **in order**:
   - Contents of `database/schema.sql`
   - `database/migrations/002_notifications.sql`
   - `database/migrations/003_class_attendance.sql`

5. **Seed demo users** (admin / teacher) from your PC:

```powershell
cd c:\Users\HP\Desktop\iminds-tutorials\backend
$env:DATABASE_URL="PASTE_NEON_CONNECTION_STRING"
npm install
npx ts-node ../database/seeds/seed.ts
```

You should see: `Admin → username: admin` and `Teacher → username: priyas`

---

## Step 2 — Free API (Render)

1. Go to **https://render.com** → sign up with GitHub
2. **New +** → **Web Service**
3. Connect repo **`iminds-tutorials`**
4. Settings:

| Field | Value |
|-------|--------|
| **Name** | `iminds-api` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance type** | **Free** |

5. **Environment Variables** → Add:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | long random string |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `PAYMENT_GATEWAY` | `mock` |
| `CORS_ORIGIN` | `https://iminds-tutorials.vercel.app` |
| `STORAGE_PROVIDER` | `mock` |

6. Click **Create Web Service** — wait until status is **Live**
7. Copy your URL, e.g. `https://iminds-api.onrender.com`

8. Test in browser: `https://iminds-api.onrender.com/health` → should show `"status":"ok"`

> **Note:** Free Render sleeps after ~15 min idle. First request after sleep may take **30–60 seconds** (cold start).

---

## Step 3 — Connect Vercel to Render

1. **Vercel** → project → **Settings** → **Environment Variables**
2. Set:

```
NEXT_PUBLIC_API_URL = https://iminds-api.onrender.com/api/v1
NEXT_PUBLIC_SITE_URL = https://iminds-tutorials.vercel.app
```

(Use your real Render URL.)

3. **Redeploy** Vercel

4. Login at `https://iminds-tutorials.vercel.app/login?role=admin`  
   - **admin** / **admin@123#**

---

## Other free options

| Service | Use for |
|---------|---------|
| **Supabase** | Free Postgres (if you already use Supabase) — use SQL editor + connection string |
| **Fly.io** | API hosting — free allowance |
| **Local PC only** | Run `npm run dev` in `backend` — only works on your computer, **not** for Vercel users |

---

## Why Railway asked for payment

Railway removed the old always-free tier for new accounts. You need a **Hobby plan (~$5/mo)** or trial with card. Neon + Render stays **$0** for small projects.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login still says localhost | Redeploy Vercel after setting `NEXT_PUBLIC_API_URL` |
| Render build fails | Check Root Directory = `backend` |
| Invalid login on live site | Run seed against **Neon** DB, not local Docker |
| Slow first login | Render free tier waking up — wait 1 minute and retry |
