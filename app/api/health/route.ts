/**
 * Health check endpoint — reports app and Immich connectivity status.
 * Used by Docker HEALTHCHECK, monitoring tools, and load balancers.
 *
 * GET /api/health → { status, immich, uptime }
 */

import { NextResponse } from 'next/server';
import { immich } from '@/lib/immich';

const startTime = Date.now();

export async function GET() {
    const immichOk = await immich.ping();

    const body = {
        status: immichOk ? 'ok' : 'degraded',
        immich: immichOk ? 'connected' : 'unreachable',
        uptime: Math.floor((Date.now() - startTime) / 1000),
    };

    return NextResponse.json(body, {
        status: immichOk ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
    });
}
