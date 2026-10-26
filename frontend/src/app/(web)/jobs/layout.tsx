import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Versterk onze teams',
    description: 'Sluit je aan bij de staff of esports teams van AP Gaming. Bekijk de openstaande functies en solliciteer.',
    path: '/jobs',
    image: await cardImage('page', 'jobs'),
  });
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
