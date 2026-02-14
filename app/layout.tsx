/**
 * Root layout — site header with portfolio-style navigation.
 * Shows all subpages + standalone albums as nav links.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SubpageNav } from '@/components/SubpageNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Footer } from '@/components/Footer';

const siteTitle = process.env.SITE_TITLE || 'Gallery';
const siteDescription = 'A curated photography portfolio';

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  icons: {
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: 'website',
    images: [`/api/og?title=${encodeURIComponent(siteTitle)}`],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [`/api/og?title=${encodeURIComponent(siteTitle)}`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className="header">
          <nav className="header__nav">
            <Link href="/" className="header__nav-link">
              Home
            </Link>
            <SubpageNav />
            <Link href="/about" className="header__nav-link">
              About
            </Link>
            <ThemeToggle />
          </nav>
        </header>
        <main className="main">{children}</main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
