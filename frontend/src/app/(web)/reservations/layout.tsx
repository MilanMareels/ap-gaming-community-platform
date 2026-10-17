import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Reserveer een gaming setup',
    description: 'Reserveer een gaming pc, PS5 of Nintendo Switch in de AP Gaming Hub op Campus Ellermanstraat. Kies je tijdslot en ontvang je bevestiging met QR-code per mail.',
    path: '/reservations',
    image: await cardImage('page', 'reservations'),
  });
}

export default function ReservationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
