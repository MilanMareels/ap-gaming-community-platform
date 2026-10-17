import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Mijn profiel',
  path: '/profile',
  noindex: true,
});

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
