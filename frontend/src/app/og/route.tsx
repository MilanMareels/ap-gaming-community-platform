import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { BRAND_COLOR, SITE_NAME, THEME_COLOR, getSiteUrl } from '@/util/seo';

const FOOTER_TEXT = 'AP Hogeschool Antwerpen · Campus Ellermanstraat';

const clamp = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

/** Loads a subset of Inter from Google Fonts; falls back to the bundled default font when unreachable. */
async function loadInter(text: string) {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@800&text=${encodeURIComponent(text)}`, {
      signal: AbortSignal.timeout(2000),
      next: { revalidate: 86400 },
    }).then((res) => res.text());
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!src) return undefined;
    const data = await fetch(src, { signal: AbortSignal.timeout(2000) }).then((res) => res.arrayBuffer());
    return [{ name: 'Inter', data, weight: 800 as const, style: 'normal' as const }];
  } catch {
    return undefined;
  }
}

/** Branded 1200×630 link preview image, e.g. /og?title=Evenementen&subtitle=Toernooi */
export async function GET(req: NextRequest) {
  const title = clamp(req.nextUrl.searchParams.get('title')?.trim() || SITE_NAME, 90);
  // Uppercased here rather than in CSS so the Google Fonts subset contains the capital glyphs.
  const subtitle = clamp(req.nextUrl.searchParams.get('subtitle')?.trim() || '', 60).toLocaleUpperCase('nl-BE');
  const host = new URL(await getSiteUrl()).host;

  const fonts = await loadInter(`APGaming${title}${subtitle}${FOOTER_TEXT}${host}`);
  const titleSize = title.length > 60 ? 60 : title.length > 32 ? 72 : 88;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          backgroundColor: THEME_COLOR,
          backgroundImage: `radial-gradient(circle at 88% 10%, rgba(212,36,34,0.55), rgba(212,36,34,0) 50%), radial-gradient(circle at 0% 100%, rgba(212,36,34,0.2), rgba(212,36,34,0) 45%)`,
          color: 'white',
          fontFamily: fonts ? 'Inter' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={BRAND_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" x2="10" y1="11" y2="11" />
            <line x1="8" x2="8" y1="9" y2="13" />
            <line x1="15" x2="15.01" y1="12" y2="12" />
            <line x1="18" x2="18.01" y1="10" y2="10" />
            <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
          </svg>
          <span style={{ marginLeft: 16 }}>AP</span>
          <span style={{ marginLeft: 12, color: BRAND_COLOR }}>Gaming</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {subtitle && (
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: BRAND_COLOR, letterSpacing: 2, marginBottom: 20 }}>
              {subtitle}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1040 }}>{title}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: '#9ca3af' }}>
          <span>{FOOTER_TEXT}</span>
          <span style={{ color: 'white' }}>{host}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    },
  );
}
