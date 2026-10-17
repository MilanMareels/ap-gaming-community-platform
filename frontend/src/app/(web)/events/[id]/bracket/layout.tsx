import type { Metadata } from 'next';
import { eventMetadata } from '@/util/event-seo';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return eventMetadata((await params).id, 'bracket');
}

export default function EventBracketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
