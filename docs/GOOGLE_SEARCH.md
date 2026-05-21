# Get iMinds Tutorials on Google Search

Google **cannot index** `localhost`. You must deploy the site to a public URL first.

## 1. Deploy the website

Deploy the `web` folder (Next.js) to a host such as:

- [Vercel](https://vercel.com) (recommended for Next.js)
- Netlify
- Your own server with HTTPS

Set environment variables on the host:

```env
NEXT_PUBLIC_SITE_URL=https://your-real-domain.com
NEXT_PUBLIC_API_URL=https://api.your-real-domain.com/api/v1
```

Use your real domain (e.g. `https://iminds-tutorials.com`).

## 2. Deploy the API

Deploy `backend` so the frontend can reach it (same domain via proxy, or a subdomain like `api.`).

## 3. Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property (your live domain)
3. Verify ownership (HTML file or DNS)
4. Submit sitemap: `https://your-domain.com/sitemap.xml`

## 4. Help Google find “iMinds”

Already included in the project:

- Page title and description with **iMinds Tutorials**
- Keywords: `iMinds`, `iminds tutorials`, CBSE, etc.
- `sitemap.xml` and `robots.txt`
- Structured data (JSON-LD) for an educational organization

**Indexing takes days to weeks** — not instant.

## 5. Optional tips

- Link your site from social media or a school website
- Keep the homepage public (role picker at `/`)
- Use a custom domain that includes “iminds” if possible

## Local development

- Home: `http://localhost:3000/` — Student / Teacher / Admin cards
- SEO files work after deploy only
