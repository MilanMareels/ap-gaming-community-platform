import { HeroSection } from '@/components/home/HeroSection';
import { HubSection } from '@/components/home/HubSection';
import { BentoGridSection } from '@/components/home/BentoGridSection';
import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { SITE_NAME, SITE_TAGLINE, pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    absoluteTitle: true,
    path: '/',
    image: await cardImage('page', 'home'),
  });
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HubSection />
      <BentoGridSection />
    </>
  );
}
