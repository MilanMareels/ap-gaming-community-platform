import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata, stripHtml, truncate } from '@/util/seo';
import { getJob } from '@/util/server-api';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [job, image] = await Promise.all([getJob(id), cardImage('job', id)]);
  if (!job) return pageMetadata({ title: 'Vacature niet gevonden', noindex: true, image });

  return pageMetadata({
    title: job.title,
    description: truncate(job.shortDescription || stripHtml(job.description) || 'Solliciteer bij AP Gaming en versterk onze teams.'),
    path: `/jobs/${job.id}`,
    image,
  });
}

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return children;
}
