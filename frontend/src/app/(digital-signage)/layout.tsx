import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({ title: 'Digital signage', noindex: true });

export default function DigitalSignageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
