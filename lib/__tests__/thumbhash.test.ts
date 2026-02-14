import { describe, it, expect } from 'vitest';
import { thumbHashToBlurDataUrl, thumbHashToDominantHex } from '@/lib/thumbhash';

// A real ThumbHash captured from an Immich asset (13 bytes, valid for the library)
// This is a minimal valid ThumbHash that produces a tiny image.
// Generate one via: thumbhash.rgbaToThumbHash(w, h, rgba)
// For testing, we use a known-good base64 string that the library accepts.
const VALID_THUMBHASH = 'IQgSFQJ3d2d2eHiIh4h3d3c';

describe('thumbHashToBlurDataUrl', () => {
  it('produces a valid data URL', () => {
    const result = thumbHashToBlurDataUrl(VALID_THUMBHASH);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('produces a non-trivial string (has actual image data)', () => {
    const result = thumbHashToBlurDataUrl(VALID_THUMBHASH);
    expect(result.length).toBeGreaterThan(30);
  });
});

describe('thumbHashToDominantHex', () => {
  it('returns a valid hex color string', () => {
    const result = thumbHashToDominantHex(VALID_THUMBHASH);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
