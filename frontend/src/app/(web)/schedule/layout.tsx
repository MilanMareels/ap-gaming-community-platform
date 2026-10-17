import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Openingsuren',
    description: 'Bekijk wanneer de AP Gaming Hub op Campus Ellermanstraat open is en of de hub op dit moment geopend is.',
    path: '/schedule',
    image: await cardImage('page', 'schedule'),
  });
}

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
