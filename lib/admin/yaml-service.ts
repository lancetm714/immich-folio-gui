/**
 * YAML read/write service for the admin panel.
 * Handles atomic writes with automatic backup creation.
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { GalleryYaml, SettingsYaml } from '../config/schema';

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

/** Read about.md and return { meta, body } or null. */
export async function readAboutMd(): Promise<{ meta: Record<string, unknown>; body: string } | null> {
  try {
    const raw = await fs.readFile(path.join(CONTENT_DIR, 'about.md'), 'utf8');
    const match = raw.match(/^(?:---\r?\n)([\s\S]*?)(?:\r?\n---\r?\n)([\s\S]*)$/);
    if (match) {
      return { meta: (yaml.load(match[1]) || {}) as Record<string, unknown>, body: match[2].trim() };
    }
    return { meta: {}, body: raw.trim() };
  } catch {
    return null;
  }
}

/** Write about.md with frontmatter. */
export async function writeAboutMd(meta: Record<string, unknown>, body: string): Promise<void> {
  const filePath = path.join(CONTENT_DIR, 'about.md');
  await fs.mkdir(CONTENT_DIR, { recursive: true });

  // Backup if exists
  try {
    await fs.access(filePath);
    const backupDir = path.join(CONTENT_DIR, '.backups');
    await fs.mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.copyFile(filePath, path.join(backupDir, `about.md.${timestamp}.bak`));
    await pruneBackups(backupDir, 'about.md');
  } catch {
    // File doesn't exist, no backup needed
  }

  const frontmatter = yaml.dump(meta, { lineWidth: 120, quotingType: '"', noRefs: true, sortKeys: false });
  const content = `---\n${frontmatter}---\n\n${body}\n`;

  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf8');
  await fs.rename(tmpPath, filePath);

  console.log('[Admin] ✅ Saved about.md');
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
