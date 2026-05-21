import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { JsonLd } from '@/components/seo/JsonLd';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iminds-tutorials.com';

export const metadata: Metadata = {
  title: {
    default: 'iMinds Tutorials | CBSE Grade 9 & 10 Online Learning',
    template: '%s | iMinds Tutorials',
  },
  description:
    'iMinds Tutorials — online tuition for CBSE Grade 9 and 10. Enroll as a student, teach courses, or manage the platform as admin.',
  keywords: ['iMinds', 'iMinds Tutorials', 'iminds', 'CBSE', 'Grade 9', 'Grade 10', 'online tuition'],
  metadataBase: new URL(siteUrl),
  applicationName: 'iMinds Tutorials',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <JsonLd />
        <AuthProvider>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </AuthProvider>
      </body>
    </html>
  );
}
