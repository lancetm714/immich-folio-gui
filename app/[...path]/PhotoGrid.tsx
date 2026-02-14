/**
 * PhotoGrid — client component wrapping the masonry grid and lightbox.
 * Handles image click → lightbox open, keyboard nav, and EXIF fetching.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Lightbox } from '@/components/Lightbox';
import { FadeIn } from '@/components/FadeIn';

export interface PhotoItem {
  id: string;
  thumbUrl: string;
  previewUrl: string;
  originalUrl: string;
  exifUrl: string;
  blurDataURL?: string;
  dominantColor?: string;
  /** Compact EXIF summary for hover overlay */
  camera?: string;
  lens?: string;
  focalLength?: string;
  /** Natural image aspect ratio (width/height) for masonry layout */
  aspectRatio?: number;
}

interface PhotoGridProps {
  assets: PhotoItem[];
  albumId: string;
  layout?: 'masonry' | 'uniform';
  gridStyle?: React.CSSProperties;
}

export function PhotoGrid({ assets, layout = 'masonry', gridStyle }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % assets.length : null));
  }, [assets.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + assets.length) % assets.length : null));
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
      <div className={`photo-grid photo-grid--${layout}`} style={gridStyle}>
        {assets.map((asset, index) => (
          <FadeIn key={asset.id} delay={index < 12 ? index * 50 : 0}>
            <div
              className="photo-grid__item"
              onClick={() => openLightbox(index)}
              style={{
                ...(asset.dominantColor ? { backgroundColor: asset.dominantColor } : {}),
                ...(layout === 'masonry' && asset.aspectRatio
                  ? { aspectRatio: `${asset.aspectRatio}` }
                  : {}),
              }}
            >
              <Image
                src={asset.thumbUrl}
                alt=""
                fill
                sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
                loading={index < 6 ? 'eager' : 'lazy'}
                {...(asset.blurDataURL
                  ? { placeholder: 'blur' as const, blurDataURL: asset.blurDataURL }
                  : {})}
              />
              {(asset.camera || asset.lens) && (
                <div className="photo-grid__item-exif">
                  {[asset.camera, asset.lens, asset.focalLength].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </FadeIn>
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
