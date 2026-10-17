import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Reservatie annuleren',
    noindex: true,
    image: await cardImage('page', 'cancel-reservation'),
  });
}

export default function CancelReservationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
