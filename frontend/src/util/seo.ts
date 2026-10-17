import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { connection } from 'next/server';

export const SITE_NAME = 'AP Gaming Hub';
export const SITE_TAGLINE = 'Reserve. Play. Repeat.';
export const SITE_DESCRIPTION =
  'Dé gaming- en esportscommunity van AP Hogeschool Antwerpen. Reserveer een gaming pc, PS5 of Switch in de Gaming Hub op Campus Ellermanstraat, volg onze esports teams en schrijf je in voor evenementen.';
export const SITE_LOCALE = 'nl_BE';
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;
export const THEME_COLOR = '#020618';
export const BRAND_COLOR = '#d42422';

export const ORGANIZATION = {
  name: 'AP Gaming Community',
  parentName: 'AP Hogeschool Antwerpen',
  parentUrl: 'https://www.ap.be',
  sameAs: ['https://www.instagram.com/ap.gaming.community/', 'https://www.twitch.tv/ap_gamingbe', 'https://discord.gg/N5adyu3kXf'],
};

export const HUB_LOCATION = {
  name: 'AP Gaming Hub – Campus Ellermanstraat',
  streetAddress: 'Ellermanstraat 33',
  postalCode: '2060',
  addressLocality: 'Antwerpen',
  addressCountry: 'BE',
};

/**
 * Public base URL of the site, resolved per request so one Docker image can serve
 * staging and production. SITE_URL wins; otherwise the proxy's forwarded headers are used.
 */
export async function getSiteUrl(): Promise<string> {
  await connection();

  const fromEnv = process.env.SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim() ?? (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function ogImageUrl(title: string, subtitle?: string): string {
  const params = new URLSearchParams({ title });
  if (subtitle) params.set('subtitle', subtitle);
  return `/og?${params.toString()}`;
}

interface PageSeo {
  title: string;
  description?: string;
  /** Path relative to the site root, used for the canonical URL and og:url. Omit for private/tokenised URLs. */
  path?: string;
  /** Overrides the title shown on the generated preview image. */
  imageTitle?: string;
  /** Small label shown above the title on the generated preview image. */
  imageSubtitle?: string;
  /** Use the title as-is instead of applying the "%s | AP Gaming Hub" template. */
  absoluteTitle?: boolean;
  noindex?: boolean;
}

/** Full per-page metadata: title, description, canonical, Open Graph and Twitter card. */
export function pageMetadata({ title, description = SITE_DESCRIPTION, path, imageTitle, imageSubtitle, absoluteTitle, noindex }: PageSeo): Metadata {
  const image = { url: ogImageUrl(imageTitle ?? title, imageSubtitle), width: 1200, height: 630, alt: title };

  return {
    // Re-declaring the template keeps it applied to nested segments; a plain string title would reset it.
    title: absoluteTitle ? { absolute: title, template: TITLE_TEMPLATE } : { default: title, template: TITLE_TEMPLATE },
    description,
    // An explicit null stops a parent segment's canonical from leaking into pages without their own path.
    alternates: { canonical: path ?? null },
    openGraph: {
      type: 'website',
      ...(path && { url: path }),
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

export function stripHtml(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:–-]+$/, '')}…`;
}

const TIME_ZONE = 'Europe/Brussels';

/** e.g. "za 14 nov 2026, 14:00 – 22:00" or "14 nov – 16 nov 2026" for multi-day ranges. */
export function formatEventDate(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const day = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('nl-BE', { timeZone: TIME_ZONE, ...opts });
  const time = (d: Date) => d.toLocaleTimeString('nl-BE', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });

  const sameDay = day(start, { dateStyle: 'short' }) === day(end, { dateStyle: 'short' });
  if (sameDay) {
    return `${day(start, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}, ${time(start)} – ${time(end)}`;
  }
  return `${day(start, { day: 'numeric', month: 'short' })} – ${day(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
