/**
 * EXIF metadata API route — returns camera/lens/settings info for an asset.
 * Called on-demand by the lightbox when the user clicks "Info".
 *
 * The :token is an encoded asset ID (not a raw UUID).
 */

import { NextResponse } from 'next/server';
import { immich } from '@/lib/immich';
import { decodeAssetId } from '@/lib/tokens';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;

  // Decode the opaque token back to an Immich asset ID
  const assetId = decodeAssetId(token);
  if (!assetId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const asset = await immich.getAssetInfo(assetId);
  if (!asset?.exifInfo) {
    return NextResponse.json({ error: 'No EXIF data' }, { status: 404 });
  }

  const exif = asset.exifInfo;
  return NextResponse.json(
    {
      make: exif.make,
      model: exif.model,
      lensModel: exif.lensModel,
      focalLength: exif.focalLength,
      fNumber: exif.fNumber,
      exposureTime: exif.exposureTime,
      iso: exif.iso,
      city: exif.city,
      country: exif.country,
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=86400, stale-while-revalidate=3600',
      },
    },
  );
}
