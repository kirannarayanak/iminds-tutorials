import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iminds-tutorials.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/teacher/', '/student/', '/change-password'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
