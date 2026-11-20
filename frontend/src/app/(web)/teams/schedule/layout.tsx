import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Teamplanning',
    description: 'Wanneer de spelers van je esports team kunnen trainen en spelen.',
    path: '/teams/schedule',
    noindex: true,
    image: await cardImage('page', 'team-schedule'),
  });
}

export default function TeamScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
