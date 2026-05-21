import type { Metadata } from 'next';
import { HomeLanding } from '@/components/landing/HomeLanding';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iminds-tutorials.com';

export const metadata: Metadata = {
  title: 'iMinds Tutorials | CBSE Grade 9 & 10 Online Learning',
  description:
    'iMinds Tutorials — online tuition for CBSE Grade 9 and 10. Students enroll in Science and Maths courses; teachers manage content; admins run the platform.',
  keywords: [
    'iMinds',
    'iMinds Tutorials',
    'iminds tutorials',
    'CBSE online tuition',
    'Grade 9 tuition',
    'Grade 10 tuition',
    'Science course online',
    'Maths course online',
    'online learning UAE',
  ],
  metadataBase: new URL(siteUrl),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'iMinds Tutorials',
    description: 'CBSE Grade 9 & 10 online learning — student, teacher, and admin portal.',
    url: siteUrl,
    siteName: 'iMinds Tutorials',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iMinds Tutorials',
    description: 'CBSE Grade 9 & 10 online learning platform',
  },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return <HomeLanding />;
}
