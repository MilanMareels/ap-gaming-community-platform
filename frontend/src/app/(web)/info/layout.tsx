import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Huisreglement',
  description: 'De huisregels van de AP Gaming Hub: algemene regels, gedragscode en hardwareregels voor iedereen die komt gamen.',
  path: '/info',
  imageSubtitle: 'Gaming Hub',
});

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
