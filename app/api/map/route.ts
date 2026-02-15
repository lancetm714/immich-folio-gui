/**
 * Map data API — returns location-level markers for the map view.
 * Each marker represents a unique city/country with averaged GPS coords.
 * Cover asset IDs are encrypted for security.
 */

import { NextResponse } from 'next/server';
import { immich } from '@/lib/immich';
import { getConfig } from '@/lib/config';
import { imageUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';

export async function GET() {
    const config = getConfig();

    if (!config.map) {
        return NextResponse.json({ error: 'Map is not enabled' }, { status: 404 });
    }

    const locations = await immich.getMapData();

    // Encrypt cover asset IDs and convert to public-safe image URLs
    const publicLocations = locations.map((loc) => ({
        city: loc.city,
        country: loc.country,
        lat: loc.lat,
        lng: loc.lng,
        photoCount: loc.photoCount,
        coverUrl: imageUrl(loc.coverAssetId, 'thumbnail'),
        albums: loc.albums.map((a) => ({
            name: a.name,
            url: a.subpageSlug ? `/${a.subpageSlug}/${a.slug}` : `/${a.slug}`,
        })),
    }));

    return NextResponse.json(publicLocations, {
        headers: {
            'Cache-Control': `public, max-age=${Math.floor(config.cacheTtl / 1000)}, stale-while-revalidate=60`,
        },
    });
}
