/**
 * Image proxy route — serves Immich assets to the browser
 * without exposing the Immich server or API key.
 *
 * Usage: GET /api/image/:token?size=thumbnail|preview|original
 * The :token is an encoded asset ID (not a raw UUID).
 */

import { NextRequest, NextResponse } from 'next/server';
import { immich, ImageSize } from '@/lib/immich';
import { decodeAssetId } from '@/lib/tokens';

const VALID_SIZES: ImageSize[] = ['thumbnail', 'preview', 'original'];

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: token } = await params;

    // Decode the opaque token back to an Immich asset ID
    const assetId = decodeAssetId(token);
    if (!assetId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Parse and validate size parameter
    const sizeParam = request.nextUrl.searchParams.get('size') || 'preview';
    const size: ImageSize = VALID_SIZES.includes(sizeParam as ImageSize)
        ? (sizeParam as ImageSize)
        : 'preview';

    const result = await immich.streamAsset(assetId, size);
    if (!result) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const headers: Record<string, string> = {
        'Content-Type': result.contentType,
        // Images are immutable once uploaded to Immich — cache aggressively
        'Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (result.contentLength) {
        headers['Content-Length'] = result.contentLength;
    }

    return new NextResponse(result.stream, { headers });
}
