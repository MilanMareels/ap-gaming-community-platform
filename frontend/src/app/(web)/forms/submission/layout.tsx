import { pageMetadata } from '@/util/seo';

export const metadata = pageMetadata({
  title: 'Je inzending',
  noindex: true,
});

export default function FormSubmissionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
