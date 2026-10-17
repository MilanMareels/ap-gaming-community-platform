import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Openingsuren',
  description: 'Bekijk wanneer de AP Gaming Hub op Campus Ellermanstraat open is en of de hub op dit moment geopend is.',
  path: '/schedule',
  imageSubtitle: 'Gaming Hub',
});

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
