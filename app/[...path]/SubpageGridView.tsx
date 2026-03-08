import Link from 'next/link';
import Image from 'next/image';
import { imageUrl } from '@/lib/urls';

interface SubpageAlbum {
    id: string;
    slug: string;
    albumName: string;
    assetCount: number;
    albumThumbnailAssetId: string | null;
}

interface Placeholder {
    blurDataURL?: string;
    dominantColor?: string;
}

interface SubpageGridViewProps {
    slug: string;
    title?: string;
    subtitle?: string;
    albums: SubpageAlbum[];
    coverPlaceholders: (Placeholder | null)[];
}

export function SubpageGridView({ slug, title, subtitle, albums, coverPlaceholders }: SubpageGridViewProps) {
    return (
        <div className="subpage-container">
            {(title || subtitle) && (
                <header className="subpage-header">
                    {title && <h1 className="subpage-title">{title}</h1>}
                    {subtitle && <p className="subpage-subtitle">{subtitle}</p>}
                </header>
            )}
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
        </div>
    );
}
