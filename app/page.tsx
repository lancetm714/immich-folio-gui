/**
 * Homepage — Split hero layout.
 * Left panel: site title, subtitle, navigation links.
 * Right panel: hero image carousel from Immich.
 */

import Link from 'next/link';
import { immich } from '@/lib/immich';
import { getConfig } from '@/lib/config';
import { imageUrl, assetPlaceholder } from '@/lib/urls';
import { HeroCarousel } from '@/components/HeroCarousel';

// Render at request time — requires live Immich connection
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const config = getConfig();
  const [subpages, albums] = await Promise.all([
    immich.getSubpages(),
    immich.getStandaloneAlbums(),
  ]);

  // Fetch ThumbHash for all hero images
  const heroData = await Promise.all(
    config.heroImages.map(async (id) => {
      const asset = await immich.getAssetInfo(id);
      const ph = asset ? assetPlaceholder(asset) : null;
      return {
        src: imageUrl(id, 'preview'),
        ...(ph ? { blurDataURL: ph.blurDataURL } : {}),
      };
    }),
  );

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

      {/* ── Right Panel (Hero Carousel) ─────────────── */}
      <div className="hero__right">
        <HeroCarousel images={heroData} />
      </div>
    </div>
  );
}

