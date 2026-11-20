import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Esports resultaten',
    description: 'De uitslagen en komende wedstrijden van de esports teams van AP Gaming en AP Hogeschool Antwerpen.',
    path: '/results',
    image: await cardImage('page', 'results'),
  });
}

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
