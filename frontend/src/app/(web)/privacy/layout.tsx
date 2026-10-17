import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Privacybeleid',
    description: 'Welke gegevens AP Gaming verzamelt, waarom we ze nodig hebben en hoe we ermee omgaan.',
    path: '/privacy',
    image: await cardImage('page', 'privacy'),
  });
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
