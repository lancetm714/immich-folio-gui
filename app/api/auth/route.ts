/**
 * Auth API — validates album passwords and sets auth cookies.
 * POST /api/auth { slug, password }
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, isProtected } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, password } = body;

    if (!slug || !password) {
      return NextResponse.json({ error: 'Missing slug or password' }, { status: 400 });
    }

    if (!isProtected(slug)) {
      return NextResponse.json({ error: 'Album is not password-protected' }, { status: 400 });
    }

    const setCookie = authenticate(slug, password);
    if (!setCookie) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({ success: true }, { headers: { 'Set-Cookie': setCookie } });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
