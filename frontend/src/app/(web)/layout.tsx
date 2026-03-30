import { Navbar, Footer } from '@/components/layout';
import { GoogleAnalytics } from '@next/third-parties/google';

export default function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div
        className="fixed inset-0 z-[-1] pointer-events-none opacity-50"
        style={{
          backgroundImage: 'url("/Vectors-raam.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <Navbar />
      <main className="min-h-screen pt-20">{children}</main>
      <GoogleAnalytics gaId="G-NKZ24M7811" />
      <Footer />
    </>
  );
}
