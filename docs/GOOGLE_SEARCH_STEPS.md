# Show iMinds on Google — step by step

Google will **not** show your site until all of these are true.

---

## Why you don't see it yet

| Reason | What it means |
|--------|----------------|
| **Not on Google instantly** | New sites take **3 days to 4 weeks** (sometimes longer) |
| **Site must work online** | Fix Vercel 404 first — open your URL in a browser |
| **Must tell Google** | Submit site in **Google Search Console** |
| **"iminds" is crowded** | Many sites use that word — try **"iminds tutorials"** or your full URL |
| **Wrong sitemap URL** | Set `NEXT_PUBLIC_SITE_URL` in Vercel to your real domain |

---

## Step 1 — Confirm the site works

Open in browser (use your real Vercel URL):

**https://iminds-tutorials.vercel.app**

You must see the home page (Student / Teacher / Admin).  
If you still see **404**, fix **Root Directory = `web`** in Vercel first (see `VERCEL_404_FIX.md`).

---

## Step 2 — Set Vercel environment variable

Vercel → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_SITE_URL = https://iminds-tutorials.vercel.app
```

(Use your exact Vercel domain if different.)

**Redeploy** after saving.

Check these URLs work:

- `https://iminds-tutorials.vercel.app/`
- `https://iminds-tutorials.vercel.app/sitemap.xml`
- `https://iminds-tutorials.vercel.app/robots.txt`

---

## Step 3 — Google Search Console (required)

1. Go to **https://search.google.com/search-console**
2. Sign in with Google
3. **Add property** → choose **URL prefix**
4. Enter: `https://iminds-tutorials.vercel.app`
5. **Verify ownership** — easiest: **HTML tag** method  
   - Copy the meta tag Google gives you  
   - Add to `web/src/app/layout.tsx` in `metadata.verification.google`  
   - Redeploy Vercel → click **Verify** in Search Console
6. After verified → **Sitemaps** (left menu)
7. Submit: `sitemap.xml`  
   (full URL: `https://iminds-tutorials.vercel.app/sitemap.xml`)
8. **URL inspection** → paste your homepage → **Request indexing**

---

## Step 4 — How to check if Google knows you

**Right now** (before indexing), use:

```
site:iminds-tutorials.vercel.app
```

in Google search.  
- **0 results** = not indexed yet (normal for new sites)  
- **Some results** = indexing started  

Also try:

```
iminds tutorials CBSE
```

(not just `iminds` — too generic)

---

## Step 5 — Speed up indexing (optional)

- Share your link on WhatsApp / Instagram / school page
- Add link from another website you control
- Post the URL on Google Business Profile (if you have a tuition centre)

---

## Timeline (realistic)

| When | What to expect |
|------|----------------|
| Day 0 | Submit sitemap + request indexing |
| Day 3–7 | `site:your-url` may show 1–3 pages |
| Week 2–4 | May appear for **"iminds tutorials"** |
| Month+ | Better chance for **"iminds"** alone (competitive) |

---

## Custom domain (later)

If you buy `iminds-tutorials.com` and add it in Vercel:

1. Update `NEXT_PUBLIC_SITE_URL` to `https://www.iminds-tutorials.com`
2. Add new property in Search Console for that domain
3. Submit sitemap again

---

## Quick checklist

- [ ] Vercel site loads (no 404)
- [ ] `NEXT_PUBLIC_SITE_URL` set in Vercel
- [ ] `/sitemap.xml` opens in browser
- [ ] Google Search Console property added
- [ ] Ownership verified
- [ ] Sitemap submitted
- [ ] Homepage "Request indexing" clicked
- [ ] Wait at least 1 week, then search `site:iminds-tutorials.vercel.app`
