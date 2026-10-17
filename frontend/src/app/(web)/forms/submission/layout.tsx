import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Je inzending',
    noindex: true,
    image: await cardImage('page', 'submission'),
  });
}

export default function FormSubmissionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
