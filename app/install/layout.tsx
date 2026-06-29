import type { Metadata } from 'next';
import './install.css';

export const metadata: Metadata = {
  title: 'Install Immich Folio',
  robots: { index: false, follow: false },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
