import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Mijn profiel',
    path: '/profile',
    noindex: true,
    image: await cardImage('page', 'profile'),
  });
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
