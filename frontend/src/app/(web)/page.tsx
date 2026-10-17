import { HeroSection } from '@/components/home/HeroSection';
import { HubSection } from '@/components/home/HubSection';
import { BentoGridSection } from '@/components/home/BentoGridSection';
import { SITE_NAME, SITE_TAGLINE, pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: `${SITE_NAME} | ${SITE_TAGLINE}`,
  absoluteTitle: true,
  path: '/',
  imageTitle: SITE_NAME,
  imageSubtitle: SITE_TAGLINE,
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HubSection />
      <BentoGridSection />
    </>
  );
}
