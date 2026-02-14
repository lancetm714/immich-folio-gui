/**
 * Catch-all route — handles both subpage listings and album detail pages.
 *
 * Single segment:
 *   - If slug matches a subpage → render subpage album grid
 *   - If slug matches a standalone album → render album detail
 *
 * Two segments:
 *   - Treat as subpage-slug/album-slug → render album detail
 *     with back-link to the subpage
 */

import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { immich } from '@/lib/immich';
import { notFound } from 'next/navigation';
import { PhotoGrid } from './PhotoGrid';
import {
  imageUrl,
  exifUrl,
  assetPlaceholder,
  assetExifSummary,
  assetAspectRatio,
} from '@/lib/urls';
import { getConfig, type GridConfig } from '@/lib/config';
import { isProtected, isAuthenticated } from '@/lib/auth';
import PasswordGate from '@/components/PasswordGate';

// Render at request time — requires live Immich connection
export const dynamic = 'force-dynamic';

interface PathPageProps {
  params: Promise<{ path: string[] }>;
}

export async function generateMetadata({ params }: PathPageProps): Promise<Metadata> {
  const { path } = await params;
  if (!path || path.length === 0) return {};

  const slug = path[0];
  let title = slug;
  let subtitle = '';

  if (path.length === 2) {
    const album = await immich.getAlbumBySlug(path[1], slug);
    if (album) {
      title = album.albumName;
      const count = album.assets.filter((a) => a.type === 'IMAGE').length;
      subtitle = `${count} photo${count === 1 ? '' : 's'}`;
    }
  } else if (immich.isSubpageSlug(slug)) {
    const result = await immich.getSubpageAlbums(slug);
    if (result) {
      // Single album → use album name; multiple → use subpage name
      if (result.albums.length === 1) {
        const album = await immich.getAlbumBySlug(result.albums[0].slug, slug);
        if (album) {
          title = album.albumName;
          const count = album.assets.filter((a) => a.type === 'IMAGE').length;
          subtitle = `${count} photo${count === 1 ? '' : 's'}`;
        }
      } else {
        title = result.subpage.name;
      }
    }
  } else {
    const album = await immich.getAlbumBySlug(slug);
    if (album) {
      title = album.albumName;
      const count = album.assets.filter((a) => a.type === 'IMAGE').length;
      subtitle = `${count} photo${count === 1 ? '' : 's'}`;
    }
  }

  const ogUrl = `/api/og?title=${encodeURIComponent(title)}${subtitle ? `&subtitle=${encodeURIComponent(subtitle)}` : ''}`;

  return {
    title,
    openGraph: { title, images: [ogUrl] },
    twitter: { card: 'summary_large_image', title, images: [ogUrl] },
  };
}

export default async function PathPage({ params }: PathPageProps) {
  const { path } = await params;
  const config = getConfig();

  // Build grid CSS custom properties, optionally merging subpage overrides
  const buildGridStyle = (overrides?: Partial<GridConfig>): React.CSSProperties => {
    const g = { ...config.grid, ...overrides };
    return {
      '--grid-columns': g.columns,
      '--grid-gap': `${g.gap}px`,
      '--grid-aspect-ratio': g.aspectRatio,
    } as React.CSSProperties;
  };
  const resolveLayout = (overrides?: Partial<GridConfig>) =>
    overrides?.layout ?? config.grid.layout;

  if (!path || path.length === 0) {
    notFound();
  }

  // ── Two segments: subpage/album ──────────────────────────────
  if (path.length === 2) {
    const [subpageSlug, albumSlug] = path;

    // Password gate for protected subpages
    if (isProtected(subpageSlug)) {
      const cookieStore = await cookies();
      const getCookie = (name: string) => cookieStore.get(name)?.value;
      if (!isAuthenticated(subpageSlug, getCookie)) {
        const subpageData = await immich.getSubpageAlbums(subpageSlug);
        const subpageName = subpageData?.subpage.name ?? subpageSlug;
        return <PasswordGate slug={subpageSlug} title={subpageName} />;
      }
    }

    const album = await immich.getAlbumBySlug(albumSlug, subpageSlug);

    if (!album) {
      notFound();
    }

    // Look up subpage config for grid overrides and back link
    const subpageData = await immich.getSubpageAlbums(subpageSlug);
    const spGrid = subpageData?.subpage.grid;
    const subpageName = subpageData?.subpage.name ?? subpageSlug;

    const images = album.assets.filter((asset) => asset.type === 'IMAGE');

    return (
      <>
        <div className="album-header">
          <Link href={`/${subpageSlug}`} className="album-header__back">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to {subpageName}
          </Link>
          <h1 className="album-header__title">{album.albumName}</h1>
          <p className="album-header__meta">
            {images.length} {images.length === 1 ? 'photo' : 'photos'}
            {album.description && ` · ${album.description}`}
          </p>
        </div>
        <PhotoGrid
          assets={images.map((a) => {
            const ph = assetPlaceholder(a);
            const exif = config.exifOnHover ? assetExifSummary(a) : undefined;
            return {
              id: a.id,
              thumbUrl: imageUrl(a.id, 'preview'),
              previewUrl: imageUrl(a.id, 'preview'),
              originalUrl: imageUrl(a.id, 'original'),
              exifUrl: exifUrl(a.id),
              ...(ph ? { blurDataURL: ph.blurDataURL, dominantColor: ph.dominantColor } : {}),
              ...(exif ?? {}),
              aspectRatio: assetAspectRatio(a),
            };
          })}
          albumId={album.id}
          layout={resolveLayout(spGrid)}
          gridStyle={buildGridStyle(spGrid)}
        />
      </>
    );
  }

  // ── Single segment: subpage or standalone album ──────────────
  const slug = path[0];

  // Check if it's a subpage
  if (immich.isSubpageSlug(slug)) {
    // Password gate for protected subpages
    if (isProtected(slug)) {
      const cookieStore = await cookies();
      const getCookie = (name: string) => cookieStore.get(name)?.value;
      if (!isAuthenticated(slug, getCookie)) {
        const subpageData = await immich.getSubpageAlbums(slug);
        const subpageName = subpageData?.subpage.name ?? slug;
        return <PasswordGate slug={slug} title={subpageName} />;
      }
    }

    const result = await immich.getSubpageAlbums(slug);
    if (!result || result.albums.length === 0) {
      notFound();
    }

    const { albums } = result;

    // ── Single album → full-bleed (skip album grid) ──────────
    if (albums.length === 1) {
      const album = await immich.getAlbumBySlug(albums[0].slug, slug);
      if (!album) notFound();

      const images = album.assets.filter((asset) => asset.type === 'IMAGE');

      return (
        <>
          <div className="album-header">
            <Link href="/" className="album-header__back">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Gallery
            </Link>
            <h1 className="album-header__title">{album.albumName}</h1>
            <p className="album-header__meta">
              {images.length} {images.length === 1 ? 'photo' : 'photos'}
              {album.description && ` · ${album.description}`}
            </p>
          </div>
          <PhotoGrid
            assets={images.map((a) => {
              const ph = assetPlaceholder(a);
              const exif = config.exifOnHover ? assetExifSummary(a) : undefined;
              return {
                id: a.id,
                thumbUrl: imageUrl(a.id, 'preview'),
                previewUrl: imageUrl(a.id, 'preview'),
                originalUrl: imageUrl(a.id, 'original'),
                exifUrl: exifUrl(a.id),
                ...(ph ? { blurDataURL: ph.blurDataURL, dominantColor: ph.dominantColor } : {}),
                ...(exif ?? {}),
                aspectRatio: assetAspectRatio(a),
              };
            })}
            albumId={album.id}
            layout={resolveLayout(result.subpage.grid)}
            gridStyle={buildGridStyle(result.subpage.grid)}
          />
        </>
      );
    }

    // ── Multiple albums → show album grid ─────────────────────

    // Batch-fetch ThumbHash for album cover placeholders
    const coverPlaceholders = await Promise.all(
      albums.map(async (album) => {
        if (!album.albumThumbnailAssetId) return null;
        const asset = await immich.getAssetInfo(album.albumThumbnailAssetId);
        return asset ? assetPlaceholder(asset) : null;
      }),
    );

    return (
      <div className="subpage-grid">
        {albums.map((album, i) => {
          const ph = coverPlaceholders[i];
          return (
            <Link
              key={album.id}
              href={`/${slug}/${album.slug}`}
              className="subpage-grid__item"
              style={ph?.dominantColor ? { backgroundColor: ph.dominantColor } : undefined}
            >
              {album.albumThumbnailAssetId ? (
                <Image
                  src={imageUrl(album.albumThumbnailAssetId, 'preview')}
                  alt={album.albumName}
                  fill
                  sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
                  loading="lazy"
                  {...(ph ? { placeholder: 'blur' as const, blurDataURL: ph.blurDataURL } : {})}
                />
              ) : (
                <div className="skeleton" style={{ width: '100%', height: '100%' }} />
              )}
              <span className="subpage-grid__item-badge">
                {album.assetCount} {album.assetCount === 1 ? 'photo' : 'photos'}
              </span>
              <div className="subpage-grid__item-overlay">
                <span className="subpage-grid__item-title">{album.albumName}</span>
                <span className="subpage-grid__item-count">
                  {album.assetCount} {album.assetCount === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  // Otherwise treat as a standalone album slug
  const album = await immich.getAlbumBySlug(slug);
  if (!album) {
    notFound();
  }

  const images = album.assets.filter((asset) => asset.type === 'IMAGE');

  return (
    <>
      <div className="album-header">
        <Link href="/" className="album-header__back">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Gallery
        </Link>
        <h1 className="album-header__title">{album.albumName}</h1>
        <p className="album-header__meta">
          {images.length} {images.length === 1 ? 'photo' : 'photos'}
          {album.description && ` · ${album.description}`}
        </p>
      </div>
      <PhotoGrid
        assets={images.map((a) => {
          const ph = assetPlaceholder(a);
          const exif = config.exifOnHover ? assetExifSummary(a) : undefined;
          return {
            id: a.id,
            thumbUrl: imageUrl(a.id, 'preview'),
            previewUrl: imageUrl(a.id, 'preview'),
            originalUrl: imageUrl(a.id, 'original'),
            exifUrl: exifUrl(a.id),
            ...(ph ? { blurDataURL: ph.blurDataURL, dominantColor: ph.dominantColor } : {}),
            ...(exif ?? {}),
            aspectRatio: assetAspectRatio(a),
          };
        })}
        albumId={album.id}
        layout={resolveLayout()}
        gridStyle={buildGridStyle()}
      />
    </>
  );
}
