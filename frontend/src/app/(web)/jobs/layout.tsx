import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Versterk onze teams',
  description: 'Sluit je aan bij de staff of esports teams van AP Gaming. Bekijk de openstaande functies en solliciteer.',
  path: '/jobs',
  imageSubtitle: 'Vacatures',
});

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
