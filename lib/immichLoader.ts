/**
 * Custom next/image loader for Immich proxy.
 *
 * Referenced by next.config.ts via images.loaderFile.
 * Generates URLs that point to our /api/image proxy route,
 * passing width and quality as query parameters.
 *
 * The src passed to next/image should already be a full proxy URL
 * (e.g. /api/image/<token>?size=preview). This loader appends
 * w and q params for responsive srcset generation.
 */

'use client';

interface ImageLoaderParams {
    src: string;
    width: number;
    quality?: number;
}

export default function immichLoader({ src, width, quality }: ImageLoaderParams): string {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width}&q=${quality || 75}`;
}
