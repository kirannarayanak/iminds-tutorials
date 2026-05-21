import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iminds-tutorials.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/login`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/register`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
  ];
}
