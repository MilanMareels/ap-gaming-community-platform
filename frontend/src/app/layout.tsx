import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME, SITE_TAGLINE, THEME_COLOR, TITLE_TEMPLATE, getSiteUrl, ogImageUrl } from '@/util/seo';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const defaultTitle = `${SITE_NAME} | ${SITE_TAGLINE}`;
  const image = { url: ogImageUrl(SITE_NAME, SITE_TAGLINE), width: 1200, height: 630, alt: SITE_NAME };

  return {
    metadataBase: new URL(await getSiteUrl()),
    title: { default: defaultTitle, template: TITLE_TEMPLATE },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: ['AP Gaming', 'AP Gaming Hub', 'AP Hogeschool', 'Antwerpen', 'esports', 'gaming', 'studenten', 'reserveren', 'toernooi', 'Campus Ellermanstraat'],
    formatDetection: { telephone: false, email: false, address: false },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: { type: 'website', siteName: SITE_NAME, locale: SITE_LOCALE, title: defaultTitle, description: SITE_DESCRIPTION, images: [image] },
    twitter: { card: 'summary_large_image', title: defaultTitle, description: SITE_DESCRIPTION, images: [image] },
  };
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl-BE" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased bg-[#020618] text-white relative overflow-x-hidden`}>{children}</body>
    </html>
  );
}
