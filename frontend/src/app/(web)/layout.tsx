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
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(2,6,24,0.5), rgba(2,6,24,0.5)), url("/Vectors-raam.svg")',
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
