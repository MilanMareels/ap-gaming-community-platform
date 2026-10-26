import type { NextRequest } from 'next/server';
import { resolveCard } from '@/og/cards';
import { renderCard } from '@/og/render';
import { getSiteUrl } from '@/util/seo';

/**
 * Generated 1200×630 link-preview images, e.g. /og/event/7?v=<version>.
 * A request whose `v` matches the current data version is immutable and cached for a year;
 * metadata always links the current version, so crawlers re-fetch only when the content changes.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const card = await resolveCard(path);
  if (!card) return new Response('Not found', { status: 404 });

  const host = new URL(await getSiteUrl()).host;
  const { body, type, complete } = await renderCard(`${host}/${path.join('/')}@${card.version}`, () => card.render(host));
  const pinned = complete && req.nextUrl.searchParams.get('v') === card.version;

  return new Response(body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': pinned ? 'public, max-age=31536000, immutable' : 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
