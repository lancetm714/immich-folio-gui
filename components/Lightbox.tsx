/**
 * Lightbox — fullscreen image viewer with navigation and EXIF info.
 *
 * Features:
 * - Full-resolution image display
 * - Previous/Next navigation (arrows + swipe)
 * - Close (Esc, click outside, X button)
 * - EXIF metadata panel (fetched on demand)
 * - Preloads adjacent images
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PhotoItem } from '@/app/[...path]/PhotoGrid';

interface ExifData {
    make?: string | null;
    model?: string | null;
    lensModel?: string | null;
    focalLength?: number | null;
    fNumber?: number | null;
    exposureTime?: string | null;
    iso?: number | null;
    city?: string | null;
    country?: string | null;
}

interface LightboxProps {
    assets: PhotoItem[];
    currentIndex: number;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export function Lightbox({
    assets,
    currentIndex,
    onClose,
    onNext,
    onPrev,
}: LightboxProps) {
    const [showExif, setShowExif] = useState(false);
    const [exifData, setExifData] = useState<ExifData | null>(null);
    const [exifLoading, setExifLoading] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);

    const current = assets[currentIndex];

    // Fetch EXIF data on demand
    const fetchExif = useCallback((url: string) => {
        setExifLoading(true);
        setExifData(null);
        fetch(url)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setExifData(data))
            .catch(() => setExifData(null))
            .finally(() => setExifLoading(false));
    }, []);

    // Reset EXIF data when switching images; refetch if panel is open
    useEffect(() => {
        setExifData(null);
        setImageLoaded(false);
        if (showExif && current) {
            fetchExif(current.exifUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);

    // When the toggle is turned on or the image changes while open, fetch
    const handleExifToggle = useCallback(() => {
        const next = !showExif;
        setShowExif(next);
        if (next && current) {
            fetchExif(current.exifUrl);
        }
    }, [showExif, current, fetchExif]);

    // Preload adjacent images
    useEffect(() => {
        const preload = (index: number) => {
            if (index >= 0 && index < assets.length) {
                const img = new Image();
                img.src = assets[index].previewUrl;
            }
        };
        preload(currentIndex + 1);
        preload(currentIndex - 1);
    }, [currentIndex, assets]);

    // Touch/swipe support
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            const dy = e.changedTouches[0].clientY - touchStartY.current;

            // Only register horizontal swipes (not vertical scrolling)
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) onPrev();
                else onNext();
            }
        },
        [onNext, onPrev],
    );

    // Click on overlay background → close
    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === overlayRef.current) {
                onClose();
            }
        },
        [onClose],
    );

    return (
        <div
            className="lightbox-overlay"
            ref={overlayRef}
            onClick={handleOverlayClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Close button */}
            <button className="lightbox__close" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>

            {/* Previous button */}
            <button
                className="lightbox__nav lightbox__nav--prev"
                onClick={onPrev}
                aria-label="Previous photo"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* Image */}
            <div
                className="lightbox__image-container"
                style={{
                    backgroundColor: current.dominantColor || '#000',
                    backgroundImage: current.blurDataURL ? `url(${current.blurDataURL})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    className={`lightbox__image${imageLoaded ? ' lightbox__image--loaded' : ''}`}
                    src={current.previewUrl}
                    alt=""
                    draggable={false}
                    onLoad={() => setImageLoaded(true)}
                />
            </div>

            {/* Next button */}
            <button
                className="lightbox__nav lightbox__nav--next"
                onClick={onNext}
                aria-label="Next photo"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 6 15 12 9 18" />
                </svg>
            </button>

            {/* Counter */}
            <div className="lightbox__counter">
                {currentIndex + 1} / {assets.length}
            </div>

            {/* EXIF toggle */}
            <button
                className="lightbox__info-toggle"
                onClick={handleExifToggle}
            >
                {showExif ? 'Hide Info' : 'Info'}
            </button>

            {/* EXIF panel */}
            {showExif && (
                <div className="exif-panel">
                    {exifLoading ? (
                        <div className="exif-panel__row">
                            <span className="exif-panel__label">Loading...</span>
                        </div>
                    ) : exifData ? (
                        <>
                            {exifData.model && (
                                <div className="exif-panel__row">
                                    <span className="exif-panel__label">Camera</span>
                                    <span className="exif-panel__value">
                                        {[exifData.make, exifData.model].filter(Boolean).join(' ')}
                                    </span>
                                </div>
                            )}
                            {exifData.lensModel && (
                                <div className="exif-panel__row">
                                    <span className="exif-panel__label">Lens</span>
                                    <span className="exif-panel__value">{exifData.lensModel}</span>
                                </div>
                            )}
                            {exifData.focalLength && (
                                <div className="exif-panel__row">
                                    <span className="exif-panel__label">Focal Length</span>
                                    <span className="exif-panel__value">{exifData.focalLength}mm</span>
                                </div>
                            )}
                            {exifData.fNumber && (
                                <div className="exif-panel__row">
                                    <span className="exif-panel__label">Aperture</span>
                                    <span className="exif-panel__value">ƒ/{exifData.fNumber}</span>
                                </div>
                            )}
                            {exifData.exposureTime && (
                                <div className="exif-panel__row">
                                    <span className="exif-panel__label">Shutter</span>
                                    <span className="exif-panel__value">{exifData.exposureTime}s</span>
                                </div>
                            )}
                            {exifData.iso && (
                                <div className="exif-panel__row">
                                    <span className="exif-panel__label">ISO</span>
                                    <span className="exif-panel__value">{exifData.iso}</span>
                                </div>
                            )}
                            {(exifData.city || exifData.country) && (
                                <div className="exif-panel__row">
                                    <span className="exif-panel__label">Location</span>
                                    <span className="exif-panel__value">
                                        {[exifData.city, exifData.country].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="exif-panel__row">
                            <span className="exif-panel__label">No EXIF data available</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
