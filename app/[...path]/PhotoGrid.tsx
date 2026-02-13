/**
 * PhotoGrid — client component wrapping the masonry grid and lightbox.
 * Handles image click → lightbox open, keyboard nav, and EXIF fetching.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Lightbox } from '@/components/Lightbox';

export interface PhotoItem {
    id: string;
    thumbUrl: string;
    previewUrl: string;
    originalUrl: string;
    exifUrl: string;
}

interface PhotoGridProps {
    assets: PhotoItem[];
    albumId: string;
}

export function PhotoGrid({ assets }: PhotoGridProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
    }, []);

    const goNext = useCallback(() => {
        setLightboxIndex((prev) =>
            prev !== null ? (prev + 1) % assets.length : null,
        );
    }, [assets.length]);

    const goPrev = useCallback(() => {
        setLightboxIndex((prev) =>
            prev !== null ? (prev - 1 + assets.length) % assets.length : null,
        );
    }, [assets.length]);

    // Keyboard navigation
    useEffect(() => {
        if (lightboxIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    closeLightbox();
                    break;
                case 'ArrowRight':
                    goNext();
                    break;
                case 'ArrowLeft':
                    goPrev();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        // Prevent body scroll when lightbox is open
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [lightboxIndex, closeLightbox, goNext, goPrev]);

    return (
        <>
            <div className="photo-grid">
                {assets.map((asset, index) => (
                    <div
                        key={asset.id}
                        className="photo-grid__item"
                        onClick={() => openLightbox(index)}
                    >
                        <img
                            src={asset.thumbUrl}
                            alt=""
                            loading={index < 6 ? 'eager' : 'lazy'}
                        />
                    </div>
                ))}
            </div>

            {lightboxIndex !== null && (
                <Lightbox
                    assets={assets}
                    currentIndex={lightboxIndex}
                    onClose={closeLightbox}
                    onNext={goNext}
                    onPrev={goPrev}
                />
            )}
        </>
    );
}
