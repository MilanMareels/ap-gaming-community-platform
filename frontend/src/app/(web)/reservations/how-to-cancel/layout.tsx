import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Reservatie annuleren',
    description: 'Zo annuleer je je reservatie in de AP Gaming Hub, zodat je plek vrijkomt voor een andere student.',
    path: '/reservations/how-to-cancel',
    image: await cardImage('page', 'how-to-cancel'),
  });
}

export default function HowToCancelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
