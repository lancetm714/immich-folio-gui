/**
 * ThumbHash utilities for generating blur placeholders and dominant colors.
 * Uses the thumbhash package to decode Immich's base64-encoded ThumbHash strings
 * into data URLs and hex color values.
 */

import { thumbHashToRGBA, thumbHashToDataURL } from 'thumbhash';

/**
 * Convert an Immich base64-encoded ThumbHash into a tiny data URL
 * suitable for next/image's blurDataURL prop.
 */
export function thumbHashToBlurDataUrl(base64: string): string {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return thumbHashToDataURL(bytes);
}

/**
 * Extract the dominant/average color from a ThumbHash as a hex string.
 * Computes the weighted average of all non-transparent pixels.
 */
export function thumbHashToDominantHex(base64: string): string {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const { w, h, rgba } = thumbHashToRGBA(bytes);

    let r = 0, g = 0, b = 0, total = 0;
    for (let i = 0; i < w * h; i++) {
        const a = rgba[i * 4 + 3];
        if (a > 0) {
            const weight = a / 255;
            r += rgba[i * 4] * weight;
            g += rgba[i * 4 + 1] * weight;
            b += rgba[i * 4 + 2] * weight;
            total += weight;
        }
    }

    if (total === 0) return '#888888';

    const avg = (v: number) => Math.round(v / total).toString(16).padStart(2, '0');
    return `#${avg(r)}${avg(g)}${avg(b)}`;
}
