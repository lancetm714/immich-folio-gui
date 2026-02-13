/**
 * Root layout — site header with portfolio-style navigation.
 * Shows all subpages + standalone albums as nav links.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SubpageNav } from '@/components/SubpageNav';

export const metadata: Metadata = {
  title: process.env.SITE_TITLE || 'Gallery',
  description: 'A curated photography portfolio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <nav className="header__nav">
            <Link href="/" className="header__nav-link">
              Home
            </Link>
            <SubpageNav />
          </nav>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
