import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Esports teams',
  description: 'Maak kennis met de competitieve esports rosters van AP Gaming en de spelers die AP Hogeschool Antwerpen vertegenwoordigen.',
  path: '/roster',
  imageSubtitle: 'Esports',
});

export default function RosterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
