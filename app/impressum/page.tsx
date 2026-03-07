/**
 * Impressum (Legal Notice) page.
 * Required for German law compliance. Displays information from settings.yaml.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { BackLink } from '@/components/BackLink';
import { FadeIn } from '@/components/FadeIn';
import './impressum.css';

export const metadata: Metadata = {
  title: 'Impressum',
  robots: { index: false, follow: true }, // Usually no need to index legal pages
};

export default function ImpressumPage() {
  const { legal } = getConfig();

  if (!legal.enabled) {
    notFound();
  }

  return (
    <div className="subpage-container">
      <header className="subpage-header">
        <BackLink href="/" label="Home" />
        <FadeIn>
          <h1 className="subpage-title">Impressum</h1>
          <p className="subpage-subtitle">Angaben gemäß § 5 TMG</p>
        </FadeIn>
      </header>

      <main className="subpage-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <FadeIn delay={0.1}>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', opacity: 0.8 }}>Anschrift</h2>
            <p style={{ lineHeight: 1.6 }}>
              {legal.name}
              <br />
              {legal.address}
              <br />
              {legal.zipCity}
              <br />
              {legal.country}
            </p>
          </section>

          {(legal.email || legal.phone) && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', opacity: 0.8 }}>Kontakt</h2>
              <p style={{ lineHeight: 1.6 }}>
                {legal.email && (
                  <>
                    E-Mail: {legal.email}
                    <br />
                  </>
                )}
                {legal.phone && <>Telefon: {legal.phone}</>}
              </p>
            </section>
          )}

          {(legal.taxId || legal.vatId) && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', opacity: 0.8 }}>
                Steuernummer
              </h2>
              <p style={{ lineHeight: 1.6 }}>
                {legal.taxId && (
                  <>
                    Steuernummer: {legal.taxId}
                    <br />
                  </>
                )}
                {legal.vatId && <>Umsatzsteuer-ID: {legal.vatId}</>}
              </p>
            </section>
          )}

          {legal.extraInfo && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', opacity: 0.8 }}>
                Weitere Informationen
              </h2>
              <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{legal.extraInfo}</p>
            </section>
          )}

          <section style={{ marginTop: '4rem', fontSize: '0.85rem', opacity: 0.6 }}>
            <p>Quelle: Erstellt mit dem Impressum-Generator von eRecht24.</p>
          </section>
        </FadeIn>
      </main>
    </div>
  );
}
