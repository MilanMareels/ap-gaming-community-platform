import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Evenementen',
    description: 'Toernooien, LAN-party\'s en viewing party\'s van AP Gaming. Bekijk de komende evenementen en schrijf je in.',
    path: '/events',
    image: await cardImage('page', 'events'),
  });
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
