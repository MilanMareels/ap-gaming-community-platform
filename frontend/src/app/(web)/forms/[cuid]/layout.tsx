import type { Metadata } from 'next';
import { pageMetadata, truncate } from '@/util/seo';
import { getPublicForm } from '@/util/server-api';

type Props = { params: Promise<{ cuid: string }> };

// Forms are shared as direct links (Discord, mail), so they get a proper preview but stay out of search results.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const form = await getPublicForm((await params).cuid);
  if (!form) return pageMetadata({ title: 'Formulier niet gevonden', noindex: true });

  return pageMetadata({
    title: form.title,
    description: truncate(form.description || 'Vul dit formulier van AP Gaming in.'),
    path: `/forms/${form.cuid}`,
    imageSubtitle: 'Formulier',
    noindex: true,
  });
}

export default function FormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
