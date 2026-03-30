import { HeroSection } from '@/components/home/HeroSection';
import { HubSection } from '@/components/home/HubSection';
import { BentoGridSection } from '@/components/home/BentoGridSection';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HubSection />
      <BentoGridSection />
    </>
  );
}
