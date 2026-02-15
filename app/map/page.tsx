/**
 * Map page — server component shell for the interactive map.
 * Loads Leaflet CSS, renders the MapView client component.
 */

import { getConfig } from '@/lib/config';
import { notFound } from 'next/navigation';
import { MapView } from '@/components/MapView';
import { BackLink } from '@/components/BackLink';
import type { Metadata } from 'next';
import './map.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Map',
};

export default function MapPage() {
    const config = getConfig();

    if (!config.map) {
        notFound();
    }

    return (
        <>
            {/* Leaflet CSS from CDN */}
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                crossOrigin=""
            />
            <div className="map-page">
                <div className="map-page__header">
                    <BackLink href="/" label="Back to Gallery" />
                    <h1 className="map-page__title">Map</h1>
                    <p className="map-page__subtitle">Where the photos were taken</p>
                </div>
                <MapView />
            </div>
        </>
    );
}
