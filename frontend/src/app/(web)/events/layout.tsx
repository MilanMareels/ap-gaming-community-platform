import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Evenementen',
  description: 'Toernooien, LAN-party\'s en viewing party\'s van AP Gaming. Bekijk de komende evenementen en schrijf je in.',
  path: '/events',
  imageSubtitle: 'Komende evenementen',
});

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
