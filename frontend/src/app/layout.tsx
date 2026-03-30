import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AP Gaming Hub',
  description: 'De gaming hub van AP Hogeschool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased bg-[#020618] text-white relative overflow-x-hidden`}>{children}</body>
    </html>
  );
}
