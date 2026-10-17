import type { Metadata } from 'next';
import { JsonLd, eventJsonLd } from '@/components/seo/JsonLd';
import { eventMetadata } from '@/util/event-seo';
import { getSiteUrl } from '@/util/seo';
import { getEvent } from '@/util/server-api';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return eventMetadata((await params).id);
}

export default async function EventLayout({ children, params }: Props & { children: React.ReactNode }) {
  const { id } = await params;
  const [event, siteUrl] = await Promise.all([getEvent(id), getSiteUrl()]);

  return (
    <>
      {event && <JsonLd data={eventJsonLd(event, siteUrl)} />}
      {children}
    </>
  );
}
