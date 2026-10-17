import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Reserveer een gaming setup',
  description: 'Reserveer een gaming pc, PS5 of Nintendo Switch in de AP Gaming Hub op Campus Ellermanstraat. Kies je tijdslot en ontvang je bevestiging met QR-code per mail.',
  path: '/reservations',
  imageSubtitle: 'Reserveren',
});

export default function ReservationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
