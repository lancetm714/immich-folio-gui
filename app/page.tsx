/**
 * Homepage — Split hero layout.
 * Left panel: site title, subtitle, navigation links.
 * Right panel: hero image from Immich.
 */

import Link from 'next/link';
import { immich } from '@/lib/immich';
import { getConfig } from '@/lib/config';
import { imageUrl } from '@/lib/urls';

// Render at request time — requires live Immich connection
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const config = getConfig();
  const [subpages, albums] = await Promise.all([
    immich.getSubpages(),
    immich.getStandaloneAlbums(),
  ]);

  return (
    <div className="hero">
      {/* ── Left Panel ──────────────────────────────── */}
      <div className="hero__left">
        <div className="hero__content">
          <h1 className="hero__title">{config.siteTitle}</h1>
          {config.siteSubtitle && (
            <p className="hero__subtitle">{config.siteSubtitle}</p>
          )}

          <nav className="hero__nav">
            {subpages.map((sp) => (
              <Link
                key={sp.slug}
                href={`/${sp.slug}`}
                className="hero__nav-link"
              >
                {sp.name}
              </Link>
            ))}
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/${album.slug}`}
                className="hero__nav-link"
              >
                {album.albumName}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Right Panel (Hero Image) ────────────────── */}
      <div className="hero__right">
        {config.heroImage ? (
          <img
            src={imageUrl(config.heroImage, 'preview')}
            alt=""
            className="hero__image"
          />
        ) : (
          <div className="hero__image-placeholder" />
        )}
      </div>
    </div>
  );
}
