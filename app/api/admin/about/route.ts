import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated, isAdminEnabled } from '@/lib/admin/auth';
import { readAboutMd, writeAboutMd } from '@/lib/admin/yaml-service';

export async function GET() {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'Admin not enabled' }, { status: 403 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await readAboutMd();
  return NextResponse.json({ meta: data?.meta || {}, body: data?.body || '' });
}

export async function PUT(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'Admin not enabled' }, { status: 403 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Missing body' }, { status: 400 });
  }

  const { meta = {}, bodyText = '' } = body;

  // Validate portrait UUID if provided
  if (meta.portrait && typeof meta.portrait === 'string' && meta.portrait.length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(meta.portrait)) {
      return NextResponse.json({ error: 'Invalid portrait UUID' }, { status: 400 });
    }
  }

  try {
    await writeAboutMd(meta, bodyText);
    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true, message: 'About page saved successfully.' });
  } catch (err) {
    console.error('[Admin] Failed to write about.md:', err);
    return NextResponse.json({ error: 'Failed to save about page' }, { status: 500 });
  }
}
