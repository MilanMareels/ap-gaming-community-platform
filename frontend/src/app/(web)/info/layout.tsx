import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Huisreglement',
    description: 'Het huisreglement van de AP Gaming Hub: toegang en reservaties, gedragscode, roken, alcohol, eten en drinken, apparatuur en sancties.',
    path: '/info',
    image: await cardImage('page', 'info'),
  });
}

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
