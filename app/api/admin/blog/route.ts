import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated, isAdminEnabled } from '@/lib/admin/auth';
import {
  listBlogPosts,
  readBlogPost,
  writeBlogPost,
  deleteBlogPost,
} from '@/lib/admin/yaml-service';

export async function GET(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'Admin not enabled' }, { status: 403 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (slug) {
    const post = await readBlogPost(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json(post);
  }

  const posts = await listBlogPosts();
  return NextResponse.json(posts);
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

  const { slug, meta, bodyText } = body;

  if (!slug || !meta) {
    return NextResponse.json({ error: 'Missing slug or meta' }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  // Validate cover image UUID if provided
  if (meta.coverImage && typeof meta.coverImage === 'string' && meta.coverImage.length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(meta.coverImage)) {
      return NextResponse.json({ error: 'Invalid cover image UUID' }, { status: 400 });
    }
  }

  try {
    await writeBlogPost(slug, meta, bodyText || '');
    revalidatePath('/', 'layout');
    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    return NextResponse.json({ success: true, message: 'Blog post saved successfully.' });
  } catch (err) {
    console.error('[Admin] Failed to write blog post:', err);
    return NextResponse.json({ error: 'Failed to save blog post' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'Admin not enabled' }, { status: 403 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    await deleteBlogPost(slug);
    revalidatePath('/', 'layout');
    revalidatePath('/blog');
    return NextResponse.json({ success: true, message: 'Blog post deleted.' });
  } catch (err) {
    console.error('[Admin] Failed to delete blog post:', err);
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 });
  }
}
