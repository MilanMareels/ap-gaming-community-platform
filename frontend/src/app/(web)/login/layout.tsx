import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Inloggen',
  description: 'Log in om te reserveren en je profiel te beheren.',
  path: '/login',
  noindex: true,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
