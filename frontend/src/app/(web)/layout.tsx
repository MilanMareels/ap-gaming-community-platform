import { Navbar, Footer } from '@/components/layout';
import { GoogleAnalytics } from '@next/third-parties/google';

export default function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">{children}</main>
      <GoogleAnalytics gaId="G-NKZ24M7811" />
      <Footer />
    </>
  );
}
