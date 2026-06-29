import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { url, apiKey } = body;

  if (!url || !apiKey) {
    return NextResponse.json(
      { success: false, error: 'URL and API key are required' },
      { status: 400 },
    );
  }

  try {
    const baseUrl = url.replace(/\/+$/, '');
    const apiUrl = baseUrl.match(/\/api\/?$/) ? baseUrl.replace(/\/api\/?$/, '') : baseUrl;

    const res = await fetch(`${apiUrl}/api/albums?size=1`, {
      headers: { 'x-api-key': apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Invalid API key (401 Unauthorized)',
        });
      }
      return NextResponse.json({
        success: false,
        error: `Server responded with status ${res.status}`,
      });
    }

    const data = await res.json();
    const albumCount = Array.isArray(data) ? data.length : '?';
    return NextResponse.json({
      success: true,
      albumCount,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message.includes('abort')
          ? 'Connection timed out'
          : err.message
        : 'Failed to connect';

    return NextResponse.json({
      success: false,
      error: message,
    });
  }
}
