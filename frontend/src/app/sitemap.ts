import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/util/seo';
import { getActiveJobs, getUpcomingEvents } from '@/util/server-api';

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/reservations', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/events', changeFrequency: 'daily', priority: 0.9 },
  { path: '/schedule', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/roster', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/jobs', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/info', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/twitch', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/reservations/how-to-cancel', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteUrl, events, jobs] = await Promise.all([getSiteUrl(), getUpcomingEvents(), getActiveJobs()]);

  return [
    ...STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({ url: `${siteUrl}${path === '/' ? '' : path}`, changeFrequency, priority })),
    ...(events ?? []).map((event) => ({
      url: `${siteUrl}/events/${event.id}`,
      lastModified: event.createdAt,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...(jobs ?? []).map((job) => ({
      url: `${siteUrl}/jobs/${job.id}`,
      lastModified: job.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
