import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { imageUrl, assetPlaceholder } from '@/lib/urls';
import { immich } from '@/lib/immich';
import { getConfig } from '@/lib/config';
import { listBlogPosts } from '@/lib/admin/yaml-service';
import type { BlogPostMeta } from '@/lib/config/schema';
import './blog.css';

export const dynamic = 'force-dynamic';

interface PostWithCover extends BlogPostMeta {
  blurDataURL?: string;
}

async function loadPostCovers(posts: BlogPostMeta[]): Promise<PostWithCover[]> {
  const results: PostWithCover[] = [];
  for (const post of posts) {
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
    results.push({ ...post, blurDataURL });
  }
  return results;
}

export default async function BlogListingPage() {
  const config = getConfig();
  if (!config.blog) redirect('/');

  const allPosts = await listBlogPosts();
  const published = allPosts.filter((p) => p.published);
  const posts = await loadPostCovers(published);

  if (posts.length === 0) {
    return (
      <div className="blog-listing">
        <div className="blog-empty">
          <h1>Blog</h1>
          <p>No posts yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-listing">
      <h1 className="blog-listing__title">Blog</h1>
      <div className="blog-grid">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
            <div className="blog-card__cover">
              {post.coverImage ? (
                <Image
                  src={imageUrl(post.coverImage, 'preview')}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  {...(post.blurDataURL
                    ? { placeholder: 'blur' as const, blurDataURL: post.blurDataURL }
                    : {})}
                />
              ) : (
                <div className="blog-card__cover-placeholder" />
              )}
            </div>
            <div className="blog-card__body">
              {post.tags && post.tags.length > 0 && (
                <div className="blog-card__tags">
                  {post.tags.map((tag) => (
                    <span key={tag} className="blog-card__tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h2 className="blog-card__title">{post.title}</h2>
              <time className="blog-card__date">{new Date(post.date).toLocaleDateString()}</time>
              {post.excerpt && <p className="blog-card__excerpt">{post.excerpt}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
