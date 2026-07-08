import { describe, it, expect, vi } from 'vitest';

// Mock tokens so we get predictable URL output
vi.mock('@/lib/tokens', () => ({
  encodeAssetId: (id: string) => `ENCODED_${id}`,
}));

// Mock thumbhash helpers
vi.mock('@/lib/thumbhash', () => ({
  thumbHashToBlurDataUrl: () => 'data:image/png;base64,mockblur',
  thumbHashToDominantHex: () => '#aabbcc',
}));

import {
  imageUrl,
  exifUrl,
  assetPlaceholder,
  assetExifSummary,
  assetAspectRatio,
} from '@/lib/urls';

describe('imageUrl', () => {
  it('generates a proxy URL with encoded token and default size', () => {
    const url = imageUrl('some-uuid');
    expect(url).toBe('/api/image/ENCODED_some-uuid?size=preview');
  });

  it('uses the specified size parameter', () => {
    expect(imageUrl('id', 'thumbnail')).toBe('/api/image/ENCODED_id?size=thumbnail');
    expect(imageUrl('id', 'original')).toBe('/api/image/ENCODED_id?size=original');
  });
});

describe('exifUrl', () => {
  it('generates an EXIF API URL with encoded token', () => {
    expect(exifUrl('my-asset')).toBe('/api/exif/ENCODED_my-asset');
  });
});

describe('assetPlaceholder', () => {
  it('returns blur data and dominant color for an asset with thumbhash', () => {
    const result = assetPlaceholder({ thumbhash: 'abc123' });
    expect(result).toEqual({
      blurDataURL: 'data:image/png;base64,mockblur',
      dominantColor: '#aabbcc',
    });
  });

  it('returns null when thumbhash is null', () => {
    expect(assetPlaceholder({ thumbhash: null })).toBeNull();
  });

  it('returns null when thumbhash is empty string', () => {
    expect(assetPlaceholder({ thumbhash: '' })).toBeNull();
  });
});

describe('assetExifSummary', () => {
  const nullExif = {
    make: null,
    model: null,
    lensModel: null,
    focalLength: null,
    fNumber: null,
    exposureTime: null,
    iso: null,
    exifImageWidth: null,
    exifImageHeight: null,
    latitude: null,
    longitude: null,
    city: null,
    state: null,
    country: null,
    dateTimeOriginal: null,
    description: null,
    orientation: null,
  };

  it('returns camera, lens, and focal length from exifInfo', () => {
    const result = assetExifSummary({
      exifInfo: {
        ...nullExif,
        make: 'Leica',
        model: 'M11-P',
        lensModel: 'Summilux-M 50mm',
        focalLength: 50,
      },
    });
    expect(result).toEqual({
      camera: 'M11-P',
      lens: 'Summilux-M 50mm',
      focalLength: '50mm',
    });
  });

  it('returns undefined when no exifInfo exists', () => {
    expect(assetExifSummary({ exifInfo: undefined })).toBeUndefined();
  });

  it('returns undefined when all relevant fields are null', () => {
    expect(
      assetExifSummary({ exifInfo: { ...nullExif } }),
    ).toBeUndefined();
  });
});

describe('assetAspectRatio', () => {
  const nullExif = {
    make: null,
    model: null,
    lensModel: null,
    focalLength: null,
    fNumber: null,
    exposureTime: null,
    iso: null,
    exifImageWidth: null,
    exifImageHeight: null,
    latitude: null,
    longitude: null,
    city: null,
    state: null,
    country: null,
    dateTimeOriginal: null,
    description: null,
    orientation: null,
  };

  describe('display dimensions (width/height at top level)', () => {
    it('uses display width/height when present (orientation-corrected)', () => {
      // A portrait photo: display dims are 3024x4032 but raw EXIF is 4032x3024
      const result = assetAspectRatio({
        width: 3024,
        height: 4032,
        exifInfo: { ...nullExif, exifImageWidth: 4032, exifImageHeight: 3024 },
      });
      // 3024 / 4032 ≈ 0.75
      expect(result).toBeCloseTo(0.75, 5);
    });

    it('falls back to EXIF dimensions when display dimensions are absent', () => {
      const result = assetAspectRatio({
        exifInfo: { ...nullExif, exifImageWidth: 3000, exifImageHeight: 2000 },
      });
      expect(result).toBe(1.5);
    });

    it('falls back to EXIF dimensions when display width is null', () => {
      const result = assetAspectRatio({
        width: null,
        height: 4032,
        exifInfo: { ...nullExif, exifImageWidth: 3000, exifImageHeight: 2000 },
      });
      expect(result).toBe(1.5);
    });

    it('falls back to EXIF dimensions when display height is null', () => {
      const result = assetAspectRatio({
        width: 3024,
        height: null,
        exifInfo: { ...nullExif, exifImageWidth: 3000, exifImageHeight: 2000 },
      });
      expect(result).toBe(1.5);
    });
  });

  describe('EXIF dimensions (fallback path)', () => {
    it('computes width / height ratio from exifInfo', () => {
      const result = assetAspectRatio({
        exifInfo: { ...nullExif, exifImageWidth: 3000, exifImageHeight: 2000 },
      });
      expect(result).toBe(1.5);
    });

    it('returns undefined when no exifInfo', () => {
      expect(assetAspectRatio({ exifInfo: undefined })).toBeUndefined();
    });

    it('returns undefined when height is 0', () => {
      expect(
        assetAspectRatio({
          exifInfo: { ...nullExif, exifImageWidth: 100, exifImageHeight: 0 },
        }),
      ).toBeUndefined();
    });

    it('returns undefined when width is null', () => {
      expect(
        assetAspectRatio({
          exifInfo: { ...nullExif, exifImageWidth: null, exifImageHeight: 2000 },
        }),
      ).toBeUndefined();
    });

    describe('orientation swap', () => {
      // A portrait photo from a phone: physical file is 4032x3024 but
      // orientation=6 (rotate 90° CW) means display is 3024x4032 → ratio ~0.75
      const portraitAsset = {
        exifImageWidth: 4032,
        exifImageHeight: 3024,
      };

      it('swaps w/h for orientation 6 (rotate 90° CW)', () => {
        const result = assetAspectRatio({
          exifInfo: { ...nullExif, ...portraitAsset, orientation: '6' },
        });
        expect(result).toBeCloseTo(0.75, 5);
      });

      it('swaps w/h for orientation 8 (rotate 270° CW)', () => {
        const result = assetAspectRatio({
          exifInfo: { ...nullExif, ...portraitAsset, orientation: '8' },
        });
        expect(result).toBeCloseTo(0.75, 5);
      });

      it('does not swap for orientation 1 (normal)', () => {
        const result = assetAspectRatio({
          exifInfo: { ...nullExif, ...portraitAsset, orientation: '1' },
        });
        expect(result).toBeCloseTo(1.33333, 4);
      });

      it('handles missing orientation string gracefully', () => {
        const result = assetAspectRatio({
          exifInfo: { ...nullExif, ...portraitAsset, orientation: null },
        });
        expect(result).toBeCloseTo(1.33333, 4);
      });

      it('handles non-numeric orientation string gracefully', () => {
        const result = assetAspectRatio({
          exifInfo: { ...nullExif, ...portraitAsset, orientation: '' },
        });
        expect(result).toBeCloseTo(1.33333, 4);
      });
    });
  });
});
