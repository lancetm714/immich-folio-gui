/**
 * YAML read/write service for the admin panel.
 * Handles atomic writes with automatic backup creation.
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { GalleryYaml, SettingsYaml, BlogPostMeta, BlogPostItem } from '../config/schema';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const MAX_BACKUPS = 10; // Keep last 10 backups per file

/** Read gallery.yaml and return parsed content. */
export async function readGalleryYaml(): Promise<GalleryYaml | null> {
  try {
    const raw = await fs.readFile(path.join(CONTENT_DIR, 'gallery.yaml'), 'utf8');
    return yaml.load(raw) as GalleryYaml;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** Read settings.yaml and return parsed content. */
export async function readSettingsYaml(): Promise<SettingsYaml | null> {
  try {
    const raw = await fs.readFile(path.join(CONTENT_DIR, 'settings.yaml'), 'utf8');
    return yaml.load(raw) as SettingsYaml;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** Atomically write a YAML file with backup. */
async function writeYamlFile(filename: string, data: unknown): Promise<void> {
  const filePath = path.join(CONTENT_DIR, filename);

  // Ensure content directory exists
  await fs.mkdir(CONTENT_DIR, { recursive: true });

  // Create backup if file exists
  try {
    await fs.access(filePath);
    const backupDir = path.join(CONTENT_DIR, '.backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${filename}.${timestamp}.bak`;
    await fs.copyFile(filePath, path.join(backupDir, backupName));

    // Prune old backups
    await pruneBackups(backupDir, filename);
  } catch {
    // File doesn't exist yet, no backup needed
  }

  // Generate YAML content with header comment
  const header =
    filename === 'gallery.yaml'
      ? '# ── Gallery Structure (managed by Immich Folio Admin) ──────────────\n'
      : '# ── Site Settings (managed by Immich Folio Admin) ─────────────────\n';

  const content =
    header +
    yaml.dump(data, {
      lineWidth: 120,
      quotingType: '"',
      noRefs: true,
      sortKeys: false,
    });

  // Atomic write: write to temp file, then rename
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf8');
  await fs.rename(tmpPath, filePath);

  console.log(`[Admin] ✅ Saved ${filename}`);
}

/** Write gallery.yaml. */
export async function writeGalleryYaml(data: GalleryYaml): Promise<void> {
  await writeYamlFile('gallery.yaml', data);
}

/** Write settings.yaml. */
export async function writeSettingsYaml(data: SettingsYaml): Promise<void> {
  await writeYamlFile('settings.yaml', data);
}

/** List available backups for a file. */
export async function listBackups(filename: string): Promise<string[]> {
  const backupDir = path.join(CONTENT_DIR, '.backups');
  try {
    const files = await fs.readdir(backupDir);
    return files
      .filter((f) => f.startsWith(filename))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/** Restore a specific backup. */
export async function restoreBackup(backupFilename: string): Promise<void> {
  const backupDir = path.join(CONTENT_DIR, '.backups');
  const backupPath = path.join(backupDir, backupFilename);

  // Determine the original filename
  const originalFilename = backupFilename.includes('gallery.yaml')
    ? 'gallery.yaml'
    : 'settings.yaml';

  const targetPath = path.join(CONTENT_DIR, originalFilename);

  // Create a backup of current state first
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const preRestoreBackup = `${originalFilename}.${timestamp}.pre-restore.bak`;
  try {
    await fs.copyFile(targetPath, path.join(backupDir, preRestoreBackup));
  } catch {
    // Original might not exist
  }

  await fs.copyFile(backupPath, targetPath);
  console.log(`[Admin] 🔄 Restored ${originalFilename} from ${backupFilename}`);
}

const BLOG_DIR = path.join(CONTENT_DIR, 'blog');

/** List all blog posts, sorted by date descending. */
export async function listBlogPosts(): Promise<BlogPostMeta[]> {
  try {
    await fs.mkdir(BLOG_DIR, { recursive: true });
    const files = await fs.readdir(BLOG_DIR);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    const posts: BlogPostMeta[] = [];

    for (const file of mdFiles) {
      const raw = await fs.readFile(path.join(BLOG_DIR, file), 'utf8');
      const match = raw.match(/^(?:---\r?\n)([\s\S]*?)(?:\r?\n---\r?\n)/);
      if (match) {
        const meta = yaml.load(match[1]) as BlogPostMeta;
        posts.push(meta);
      }
    }

    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return posts;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

/** Read a single blog post by slug. */
export async function readBlogPost(slug: string): Promise<BlogPostItem | null> {
  try {
    const filePath = path.join(BLOG_DIR, `${slug}.md`);
    const raw = await fs.readFile(filePath, 'utf8');
    const match = raw.match(/^(?:---\r?\n)([\s\S]*?)(?:\r?\n---\r?\n)([\s\S]*)$/);
    if (match) {
      const meta = yaml.load(match[1]) as BlogPostMeta;
      return { ...meta, body: match[2].trim() };
    }
    return null;
  } catch {
    return null;
  }
}

/** Write a blog post (create or update). */
export async function writeBlogPost(slug: string, meta: Record<string, unknown>, body: string): Promise<void> {
  await fs.mkdir(BLOG_DIR, { recursive: true });
  const filePath = path.join(BLOG_DIR, `${slug}.md`);

  try {
    await fs.access(filePath);
    const backupDir = path.join(CONTENT_DIR, '.backups');
    await fs.mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.copyFile(filePath, path.join(backupDir, `blog-${slug}.md.${timestamp}.bak`));
    await pruneBackups(backupDir, `blog-${slug}.md`);
  } catch {
    // File doesn't exist, no backup needed
  }

  const frontmatter = yaml.dump(meta, { lineWidth: 120, quotingType: '"', noRefs: true, sortKeys: false });
  const content = `---\n${frontmatter}---\n\n${body}\n`;

  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf8');
  await fs.rename(tmpPath, filePath);

  console.log(`[Admin] Saved blog/${slug}.md`);

  // Also save settings.yaml update to trigger mtime cache invalidation
  await updateSettingsMtime();
}

/** Delete a blog post by slug. */
export async function deleteBlogPost(slug: string): Promise<void> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  try {
    await fs.unlink(filePath);
    console.log(`[Admin] Deleted blog/${slug}.md`);
  } catch {
    // File doesn't exist, ignore
  }
}

/** Touch settings.yaml to invalidate mtime-based config cache. */
async function updateSettingsMtime(): Promise<void> {
  try {
    const settingsPath = path.join(CONTENT_DIR, 'settings.yaml');
    const now = new Date();
    await fs.utimes(settingsPath, now, now);
  } catch {
    // settings.yaml might not exist yet
  }
}

/** Remove old backups, keeping only MAX_BACKUPS most recent. */
async function pruneBackups(backupDir: string, filename: string): Promise<void> {
  try {
    const files = await fs.readdir(backupDir);
    const relevant = files
      .filter((f) => f.startsWith(filename) && !f.includes('pre-restore'))
      .sort();

    if (relevant.length > MAX_BACKUPS) {
      const toDelete = relevant.slice(0, relevant.length - MAX_BACKUPS);
      for (const f of toDelete) {
        await fs.unlink(path.join(backupDir, f));
      }
    }
  } catch {
    // Ignore errors during pruning
  }
}
