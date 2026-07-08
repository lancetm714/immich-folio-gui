import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { imageUrl, assetPlaceholder } from '@/lib/urls';
import { immich } from '@/lib/immich';
import { getConfig } from '@/lib/config';
import { readBlogPost } from '@/lib/admin/yaml-service';
import Markdown from 'react-markdown';
import type { BlogPostItem } from '@/lib/config/schema';

export const dynamic = 'force-dynamic';

async function loadPostWithCover(
  slug: string,
): Promise<(BlogPostItem & { blurDataURL?: string }) | null> {
  const post = await readBlogPost(slug);
  if (!post) return null;

  let blurDataURL: string | undefined;
  if (post.coverImage) {
    try {
      const asset = await immich.getAssetInfo(post.coverImage);
      if (asset) {
        const ph = assetPlaceholder(asset);
        if (ph) blurDataURL = ph.blurDataURL;
      }
    } catch {}
  }

  return { ...post, blurDataURL };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const config = getConfig();
  if (!config.blog) redirect('/');

  const { slug } = await params;
  const post = await loadPostWithCover(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="blog-post">
      <div className="blog-post__header">
        {post.tags && post.tags.length > 0 && (
          <div className="blog-card__tags">
            {post.tags.map((tag) => (
              <span key={tag} className="blog-card__tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h1 className="blog-post__title">{post.title}</h1>
        <time className="blog-post__date">{new Date(post.date).toLocaleDateString()}</time>
      </div>

      {post.coverImage && (
        <div className="blog-post__cover">
          <Image
            src={imageUrl(post.coverImage, 'preview')}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            {...(post.blurDataURL
              ? { placeholder: 'blur' as const, blurDataURL: post.blurDataURL }
              : {})}
          />
        </div>
      )}

      <div className="blog-post__body">
        <Markdown>{post.body}</Markdown>
      </div>

      <div className="blog-post__footer">
        <Link href="/blog" className="blog-post__back">
          ← Back to Blog
        </Link>
      </div>
    </article>
  );
}
