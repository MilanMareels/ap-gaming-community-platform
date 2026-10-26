import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/util/seo';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/profile', '/cancel-reservation/', '/forms/submission/', '/digital-signage', '/unknown-user'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
