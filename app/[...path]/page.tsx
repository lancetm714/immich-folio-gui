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
import { immich } from '@/lib/immich';
import { notFound } from 'next/navigation';
import { PhotoGrid } from './PhotoGrid';
import { imageUrl, exifUrl } from '@/lib/urls';

// Render at request time — requires live Immich connection
export const dynamic = 'force-dynamic';

interface PathPageProps {
    params: Promise<{ path: string[] }>;
}

export default async function PathPage({ params }: PathPageProps) {
    const { path } = await params;

    if (!path || path.length === 0) {
        notFound();
    }

    // ── Two segments: subpage/album ──────────────────────────────
    if (path.length === 2) {
        const [subpageSlug, albumSlug] = path;
        const album = await immich.getAlbumBySlug(albumSlug, subpageSlug);

        if (!album) {
            notFound();
        }

        // Get subpage name for the back link
        const subpageData = await immich.getSubpageAlbums(subpageSlug);
        const subpageName = subpageData?.subpage.name ?? subpageSlug;

        const images = album.assets.filter((asset) => asset.type === 'IMAGE');

        return (
            <>
                <div className="album-header">
                    <Link href={`/${subpageSlug}`} className="album-header__back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    assets={images.map((a) => ({
                        id: a.id,
                        thumbUrl: imageUrl(a.id, 'preview'),
                        previewUrl: imageUrl(a.id, 'preview'),
                        originalUrl: imageUrl(a.id, 'original'),
                        exifUrl: exifUrl(a.id),
                    }))}
                    albumId={album.id}
                />
            </>
        );
    }

    // ── Single segment: subpage or standalone album ──────────────
    const slug = path[0];

    // Check if it's a subpage
    if (immich.isSubpageSlug(slug)) {
        const result = await immich.getSubpageAlbums(slug);
        if (!result || result.albums.length === 0) {
            notFound();
        }

        const { albums } = result;

        return (
            <div className="subpage-grid">
                {albums.map((album) => (
                    <Link
                        key={album.id}
                        href={`/${slug}/${album.slug}`}
                        className="subpage-grid__item"
                    >
                        {album.albumThumbnailAssetId ? (
                            <img
                                src={imageUrl(album.albumThumbnailAssetId, 'preview')}
                                alt={album.albumName}
                                loading="lazy"
                            />
                        ) : (
                            <div
                                className="skeleton"
                                style={{ width: '100%', height: '100%' }}
                            />
                        )}
                        <div className="subpage-grid__item-overlay">
                            <span className="subpage-grid__item-title">{album.albumName}</span>
                            <span className="subpage-grid__item-count">
                                {album.assetCount} {album.assetCount === 1 ? 'photo' : 'photos'}
                            </span>
                        </div>
                    </Link>
                ))}
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                assets={images.map((a) => ({
                    id: a.id,
                    thumbUrl: imageUrl(a.id, 'preview'),
                    previewUrl: imageUrl(a.id, 'preview'),
                    originalUrl: imageUrl(a.id, 'original'),
                    exifUrl: exifUrl(a.id),
                }))}
                albumId={album.id}
            />
        </>
    );
}
