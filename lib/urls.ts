/**
 * Server-side URL helpers for generating public-facing asset URLs.
 * These use encoded tokens instead of raw Immich UUIDs.
 */

import { encodeAssetId } from './tokens';
import { thumbHashToBlurDataUrl, thumbHashToDominantHex } from './thumbhash';
import type { ImmichAsset } from './immich';

/**
 * Generate a public image proxy URL for an asset.
 */
export function imageUrl(
  assetId: string,
  size: 'thumbnail' | 'preview' | 'original' = 'preview',
): string {
  return `/api/image/${encodeAssetId(assetId)}?size=${size}`;
}

/**
 * Generate a public EXIF API URL for an asset.
 */
export function exifUrl(assetId: string): string {
  return `/api/exif/${encodeAssetId(assetId)}`;
}

/**
 * Generate a public video proxy URL for an asset.
 */
export function videoUrl(assetId: string): string {
  return `/api/video/${encodeAssetId(assetId)}`;
}

/**
 * Placeholder data derived from an asset's ThumbHash.
 */
export interface PlaceholderData {
  blurDataURL: string;
  dominantColor: string;
}

/**
 * Generate blur placeholder and dominant color from an asset's ThumbHash.
 * Returns null if the asset has no ThumbHash.
 */
export function assetPlaceholder(asset: Pick<ImmichAsset, 'thumbhash'>): PlaceholderData | null {
  if (!asset.thumbhash) return null;
  try {
    return {
      blurDataURL: thumbHashToBlurDataUrl(asset.thumbhash),
      dominantColor: thumbHashToDominantHex(asset.thumbhash),
    };
  } catch {
    return null;
  }
}

/**
 * Compact EXIF summary for hover overlays.
 */
export interface ExifSummary {
  camera?: string;
  lens?: string;
  focalLength?: string;
}

/**
 * Extract a compact EXIF summary from an asset's exifInfo.
 * Returns undefined if no relevant EXIF data is available.
 */
export function assetExifSummary(asset: Pick<ImmichAsset, 'exifInfo'>): ExifSummary | undefined {
  const exif = asset.exifInfo;
  if (!exif) return undefined;

  const camera = exif.model || undefined;
  const lens = exif.lensModel || undefined;
  const focalLength = exif.focalLength ? `${exif.focalLength}mm` : undefined;

  if (!camera && !lens && !focalLength) return undefined;
  return { camera, lens, focalLength };
}

/** Orientations that rotate the image 90° or 270°, swapping effective w/h. */
const SWAP_ORIENTATIONS = new Set([5, 6, 7, 8]);

/**
 * Compute the natural aspect ratio (width / height) from EXIF dimensions.
 * Accounts for EXIF orientation — if the image is rotated 90°/270°
 * (orientations 5–8), width and height are swapped.
 * Returns undefined if dimensions are not available.
 */
export function assetAspectRatio(asset: Pick<ImmichAsset, 'exifInfo'>): number | undefined {
  const exif = asset.exifInfo;
  if (!exif) return undefined;
  let w = exif.exifImageWidth;
  let h = exif.exifImageHeight;
  if (!w || !h || h <= 0) return undefined;
  if (exif.orientation) {
    const o = parseInt(exif.orientation, 10);
    if (!isNaN(o) && SWAP_ORIENTATIONS.has(o)) [w, h] = [h, w];
  }
  return w / h;
}
