import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Reservatie annuleren',
  description: 'Zo annuleer je je reservatie in de AP Gaming Hub, zodat je plek vrijkomt voor een andere student.',
  path: '/reservations/how-to-cancel',
  imageSubtitle: 'Reserveren',
});

export default function HowToCancelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
