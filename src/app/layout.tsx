import type { Metadata } from 'next';
import { Analytics } from "@vercel/analytics/next"
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'MangaPulse',
  description: 'Fast, modern manga reader',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-brand-bg text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-brand-yellow selection:text-black">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

