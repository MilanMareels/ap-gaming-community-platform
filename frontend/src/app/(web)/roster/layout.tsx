import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Esports teams',
    description: 'Maak kennis met de competitieve esports rosters van AP Gaming en de spelers die AP Hogeschool Antwerpen vertegenwoordigen.',
    path: '/roster',
    image: await cardImage('page', 'roster'),
  });
}

export default function RosterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
