import { Navbar, Footer } from '@/components/layout';

export default function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className='min-h-screen pt-20'>{children}</main>
      <Footer />
    </>
  );
}
