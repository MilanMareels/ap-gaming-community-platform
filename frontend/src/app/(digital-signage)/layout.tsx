import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Digital signage',
  robots: { index: false, follow: false },
};

export default function DigitalSignageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
