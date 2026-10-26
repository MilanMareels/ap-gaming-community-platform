import { Navbar, Footer } from '@/components/layout';
import { GoogleAnalytics } from '@next/third-parties/google';
import { JsonLd, siteJsonLd } from '@/components/seo/JsonLd';
import { getSiteUrl } from '@/util/seo';

export default async function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = await getSiteUrl();

  return (
    <>
      <JsonLd data={siteJsonLd(siteUrl)} />
      <div
        className="fixed inset-0 z-[-1] pointer-events-none opacity-50"
        style={{
          backgroundImage: 'url("/Vectors-raam.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div id="public-navbar"><Navbar /></div>
      <main className="min-h-screen pt-20">{children}</main>
      <GoogleAnalytics gaId="G-NKZ24M7811" />
      <div id="public-footer"><Footer /></div>
    </>
  );
}
