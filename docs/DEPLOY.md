# Deploy iMinds Tutorials (A + B + C)

Follow **Part C** first if you have never used Vercel. Then **Part A** (free URL). Then **Part B** when you have a domain. Finally **Part D** for Google.

---

## Part C — Vercel from zero (start here)

### C1 · Create accounts (free)

| Service | Why | Link |
|---------|-----|------|
| **GitHub** | Store your code | https://github.com/signup |
| **Vercel** | Host the website | https://vercel.com/signup |
| **Railway** (or Render) | Host API + PostgreSQL | https://railway.app |

Use “Continue with GitHub” on Vercel and Railway.

### C2 · Put code on GitHub

On your PC, in the project folder:

```powershell
cd c:\Users\HP\Desktop\iminds-tutorials
git init
git add .
git commit -m "Initial commit - iMinds Tutorials"
```

On GitHub: **New repository** → name `iminds-tutorials` → create (empty).

Then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/iminds-tutorials.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### C3 · Deploy the API + database (Railway)

1. Railway → **New Project** → **Deploy PostgreSQL**
2. Open the Postgres service → **Connect** → copy `DATABASE_URL`
3. **New** → **GitHub Repo** → select `iminds-tutorials`
4. Set **Root Directory** to `backend`
5. **Variables** tab — add:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | (paste from Postgres) |
| `JWT_SECRET` | long random string (32+ chars) |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `PAYMENT_GATEWAY` | `mock` |
| `CORS_ORIGIN` | leave empty for now — fill after Vercel (step A3) |

6. **Settings** → **Deploy** → set start command: `npm run build && npm run start`
7. After deploy, open the service → **Settings** → **Networking** → **Generate Domain**
8. Copy the public URL, e.g. `https://iminds-backend-production.up.railway.app`

9. **Run migrations** (one time) — Railway → Postgres → **Query** or use local psql with the public DB URL:

Run SQL files in order:
- `database/schema.sql` (if empty DB)
- `database/migrations/002_notifications.sql`
- `database/migrations/003_class_attendance.sql`

Or from your PC:

```powershell
psql "YOUR_RAILWAY_DATABASE_URL" -f database/schema.sql
```

10. **Seed** (optional demo users) — from project root with `DATABASE_URL` set to Railway URL:

```powershell
cd backend
$env:DATABASE_URL="postgresql://..."
npm run seed
```

### C4 · Deploy the website (Vercel)

1. https://vercel.com/new → **Import** your `iminds-tutorials` repo
2. **Important:** set **Root Directory** → `web` (click Edit)
3. Framework: **Next.js** (auto-detected)
4. **Environment Variables** — add:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-URL/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | leave empty first; add after first deploy |

5. Click **Deploy** — wait ~2 minutes
6. You get a URL like `https://iminds-tutorials-xxxxx.vercel.app`

### C5 · Connect frontend ↔ backend

1. Copy your Vercel URL
2. Railway → backend service → **Variables** → set:

```
CORS_ORIGIN=https://iminds-tutorials-xxxxx.vercel.app
```

(Redeploy backend if needed.)

3. Vercel → project → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_SITE_URL=https://iminds-tutorials-xxxxx.vercel.app
```

4. Vercel → **Deployments** → **Redeploy** (so env vars apply)

5. Open the Vercel URL — you should see **Student / Teacher / Admin** on the home page.

---

## Part A — Free Vercel URL (no custom domain)

You already have this after **Part C4**:

- Public site: `https://iminds-tutorials-xxxxx.vercel.app`
- Home page with role picker
- Google can index this URL (not localhost)

**Share this link** with students and teachers.

To update the site later: `git push` → Vercel redeploys automatically.

---

## Part B — Custom domain (e.g. `iminds-tutorials.com`)

### B1 · Buy a domain (you do this)

Buy from any registrar, for example:

- Namecheap, GoDaddy, Google Domains, Cloudflare Registrar

Search for something like: `iminds-tutorials.com` or `iminds.ae`

### B2 · Add domain in Vercel

1. Vercel → your project → **Settings** → **Domains**
2. Add `iminds-tutorials.com` and `www.iminds-tutorials.com`
3. Vercel shows **DNS records** (usually):
   - `A` record → `76.76.21.21`
   - `CNAME` for `www` → `cname.vercel-dns.com`

### B3 · Configure DNS at your registrar

Paste the records Vercel gives you. Wait 5–60 minutes for DNS to propagate.

### B4 · Update environment variables

In **Vercel**:

```
NEXT_PUBLIC_SITE_URL=https://www.iminds-tutorials.com
```

In **Railway** (backend):

```
CORS_ORIGIN=https://www.iminds-tutorials.com,https://iminds-tutorials.com
```

Redeploy both.

### B5 · Optional — API on subdomain

For a cleaner setup:

- Website: `https://www.iminds-tutorials.com`
- API: `https://api.iminds-tutorials.com` → point CNAME to Railway

Then set `NEXT_PUBLIC_API_URL=https://api.iminds-tutorials.com/api/v1`

---

## Part D — Google Search (“iminds”)

Only after **Part A or B** (live HTTPS site).

1. Open https://search.google.com/search-console
2. **Add property** → your live URL (Vercel or custom domain)
3. Verify (HTML tag or DNS — Vercel domain makes DNS easy)
4. **Sitemaps** → submit: `https://your-site.com/sitemap.xml`
5. Wait several days to weeks for “iMinds” / “iMinds Tutorials” to appear

See also: [GOOGLE_SEARCH.md](./GOOGLE_SEARCH.md)

---

## Checklist

- [ ] Code on GitHub
- [ ] PostgreSQL + backend on Railway (public URL)
- [ ] Migrations applied
- [ ] Web on Vercel (`web` root folder)
- [ ] `NEXT_PUBLIC_API_URL` points to Railway
- [ ] `CORS_ORIGIN` includes Vercel/domain URL
- [ ] Home page shows Student / Teacher / Admin
- [ ] Login works on production
- [ ] (Optional) Custom domain in Vercel
- [ ] Google Search Console + sitemap

---

## Who does what?

| Task | You | Developer / notes |
|------|-----|-------------------|
| GitHub, Vercel, Railway accounts | Yes | Free tiers |
| Push code to GitHub | Yes | One-time |
| Click deploy in dashboards | Yes | This guide |
| Buy domain | Yes | Part B |
| Google Search Console | Yes | Your Google account |
| Code in repo | Done | Landing page + SEO already added |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Network error on login | Check `NEXT_PUBLIC_API_URL` and Railway backend is running |
| CORS error | Add exact Vercel URL to Railway `CORS_ORIGIN` |
| 404 on API | Railway URL must end with `/api/v1` in frontend env |
| Google not showing site | Site must be public HTTPS; submit sitemap; wait days |

---

## Quick reference — demo logins (after seed)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin@123#` |
| Teacher | `priyas` | `priyas@123#` |
| Student | `aryank` | `aryank@123#` |

Change these passwords in production.
