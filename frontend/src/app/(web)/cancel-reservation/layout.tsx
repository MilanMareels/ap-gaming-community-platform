import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Reservatie annuleren',
  noindex: true,
});

export default function CancelReservationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
