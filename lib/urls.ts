/**
 * Server-side URL helpers for generating public-facing asset URLs.
 * These use encoded tokens instead of raw Immich UUIDs.
 */

import { encodeAssetId } from './tokens';

/**
 * Generate a public image proxy URL for an asset.
 */
export function imageUrl(assetId: string, size: 'thumbnail' | 'preview' | 'original' = 'preview'): string {
    return `/api/image/${encodeAssetId(assetId)}?size=${size}`;
}

/**
 * Generate a public EXIF API URL for an asset.
 */
export function exifUrl(assetId: string): string {
    return `/api/exif/${encodeAssetId(assetId)}`;
}
