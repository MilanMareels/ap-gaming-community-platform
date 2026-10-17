import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Privacybeleid',
  description: 'Welke gegevens AP Gaming verzamelt, waarom we ze nodig hebben en hoe we ermee omgaan.',
  path: '/privacy',
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
