const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iminds-tutorials.com';

export function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'iMinds Tutorials',
    alternateName: ['iMinds', 'iminds tutorials'],
    url: siteUrl,
    description:
      'Online tuition platform for CBSE Grade 9 and 10 students — Science and Maths courses with quizzes and secure enrollment.',
    areaServed: 'AE',
    educationalLevel: 'Secondary school',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
