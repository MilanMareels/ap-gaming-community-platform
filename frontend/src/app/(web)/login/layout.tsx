import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Inloggen',
    description: 'Log in om te reserveren en je profiel te beheren.',
    path: '/login',
    noindex: true,
    image: await cardImage('page', 'login'),
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
