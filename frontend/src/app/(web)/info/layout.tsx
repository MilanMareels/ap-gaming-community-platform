import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Huisreglement',
    description: 'De huisregels van de AP Gaming Hub: algemene regels, gedragscode en hardwareregels voor iedereen die komt gamen.',
    path: '/info',
    image: await cardImage('page', 'info'),
  });
}

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
