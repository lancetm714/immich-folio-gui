/**
 * Impressum (Legal Notice) page.
 * Required for German law compliance. Displays information from settings.yaml.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { BackLink } from '@/components/BackLink';
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
        <h1 className="subpage-title">Impressum</h1>
        <p className="subpage-subtitle">Angaben gemäß § 5 TMG</p>
      </header>

      <main className="subpage-content">
        <section className="legal-section">
          <h2 className="legal-section__title">Anschrift</h2>
          <p className="legal-section__text">
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
          <section className="legal-section">
            <h2 className="legal-section__title">Kontakt</h2>
            <p className="legal-section__text">
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
          <section className="legal-section">
            <h2 className="legal-section__title">Steuernummer</h2>
            <p className="legal-section__text">
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
          <section className="legal-section">
            <h2 className="legal-section__title">Weitere Informationen</h2>
            <p className="legal-section__text legal-section__text--pre">{legal.extraInfo}</p>
          </section>
        )}

        <section className="legal-source">
          <p>Quelle: Erstellt mit dem Impressum-Generator von eRecht24.</p>
        </section>
      </main>
    </div>
  );
}
