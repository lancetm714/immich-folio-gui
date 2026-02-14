/**
 * Typed configuration loader.
 * Secrets come from env vars; gallery structure comes from content/gallery.yaml.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// ── Env helpers ────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ── Types ──────────────────────────────────────────────────────

/** A subpage groups multiple Immich albums under one URL path. */
export interface SubpageConfig {
  name: string;
  slug: string;
  albumIds: string[];
  /** Optional password — if set, visitors must authenticate to view. */
  password?: string;
  /** Per-subpage grid overrides (merged with global grid config). */
  grid?: Partial<GridConfig>;
}

/** Raw YAML structure (before validation). */
interface GalleryYaml {
  hero?: string | string[];
  albums?: string[];
  exifOnHover?: boolean;
  grid?: {
    columns?: number;
    gap?: number;
    aspectRatio?: string;
    layout?: string;
  };
  subpages?: Array<{
    name: string;
    albums: string[];
    password?: string;
    grid?: {
      columns?: number;
      gap?: number;
      aspectRatio?: string;
      layout?: string;
    };
  }>;
}

// ── YAML loading ───────────────────────────────────────────────

function loadGalleryYaml(): GalleryYaml {
  const yamlPath = path.join(process.cwd(), 'content', 'gallery.yaml');

  if (!fs.existsSync(yamlPath)) {
    throw new Error(
      `Gallery config not found: ${yamlPath}\n` +
      `Copy content/gallery.yaml.example to content/gallery.yaml and add your album IDs.`,
    );
  }

  const raw = fs.readFileSync(yamlPath, 'utf8');
  const data = yaml.load(raw) as GalleryYaml;

  if (!data || typeof data !== 'object') {
    throw new Error('gallery.yaml is empty or invalid');
  }

  return data;
}

// ── UUID validation ────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUuid(id: string, context: string): string {
  const trimmed = id.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new Error(`Invalid UUID in ${context}: "${trimmed}"`);
  }
  return trimmed;
}

// ── Slugify ────────────────────────────────────────────────────

/**
 * Convert an album name into a URL-friendly slug.
 * "Kloster Chorin" → "kloster-chorin"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (ü→u, é→e)
    .replace(/[^a-z0-9]+/g, '-')    // non-alphanumeric → hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}

// ── Config type ────────────────────────────────────────────────

/** Grid layout configuration. */
export interface GridConfig {
  columns: number;
  gap: number;
  aspectRatio: string;
  layout: 'masonry' | 'uniform';
}

export interface AppConfig {
  immich: { apiUrl: string; apiKey: string };
  albums: string[];
  standaloneAlbums: string[];
  subpages: SubpageConfig[];
  siteTitle: string;
  siteSubtitle: string;
  /** One or more hero image asset IDs for the homepage carousel. */
  heroImages: string[];
  /** Show EXIF (camera/lens) on photo grid hover. Default: true. */
  exifOnHover: boolean;
  /** Photo grid layout configuration. */
  grid: GridConfig;
  cacheTtl: number;
  rateLimitRpm: number;
}

// ── Config builder ─────────────────────────────────────────────

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (_config) return _config;

  const apiUrl = requireEnv('IMMICH_API_URL').replace(/\/+$/, '');
  const apiKey = requireEnv('IMMICH_API_KEY');
  const gallery = loadGalleryYaml();

  // Parse standalone albums
  const standaloneAlbumIds = (gallery.albums ?? [])
    .map((id) => validateUuid(id, 'gallery.yaml albums'));

  if (standaloneAlbumIds.length === 0 && (!gallery.subpages || gallery.subpages.length === 0)) {
    throw new Error('gallery.yaml must define at least one album or subpage');
  }

  // Parse subpages
  const subpages: SubpageConfig[] = (gallery.subpages ?? []).map((sp) => {
    if (!sp.name || !sp.albums || sp.albums.length === 0) {
      throw new Error(`Subpage "${sp.name || '(unnamed)'}" must have a name and at least one album`);
    }
    return {
      name: sp.name,
      slug: slugify(sp.name),
      albumIds: sp.albums.map((id) => validateUuid(id, `subpage "${sp.name}"`)),
      password: sp.password,
      ...(sp.grid ? {
        grid: {
          ...(sp.grid.columns != null ? { columns: sp.grid.columns } : {}),
          ...(sp.grid.gap != null ? { gap: sp.grid.gap } : {}),
          ...(sp.grid.aspectRatio != null ? { aspectRatio: sp.grid.aspectRatio } : {}),
          ...(sp.grid.layout != null ? { layout: (sp.grid.layout === 'uniform' ? 'uniform' : 'masonry') as GridConfig['layout'] } : {}),
        },
      } : {}),
    };
  });

  // Collect ALL album IDs (standalone + subpage) — deduplicated
  const subpageAlbumIds = new Set(subpages.flatMap((sp) => sp.albumIds));
  const allAlbumIds = [...new Set([...standaloneAlbumIds, ...subpageAlbumIds])];

  _config = {
    immich: {
      apiUrl: `${apiUrl}/api`,
      apiKey,
    },
    albums: allAlbumIds,
    standaloneAlbums: standaloneAlbumIds.filter((id) => !subpageAlbumIds.has(id)),
    subpages,
    siteTitle: process.env.SITE_TITLE || 'Gallery',
    siteSubtitle: process.env.SITE_SUBTITLE || '',
    heroImages: gallery.hero
      ? (Array.isArray(gallery.hero) ? gallery.hero : [gallery.hero])
        .map((id) => validateUuid(id, 'gallery.yaml hero'))
      : [],
    exifOnHover: gallery.exifOnHover !== false,
    grid: {
      columns: gallery.grid?.columns ?? 3,
      gap: gallery.grid?.gap ?? 12,
      aspectRatio: gallery.grid?.aspectRatio ?? '1',
      layout: (gallery.grid?.layout === 'uniform' ? 'uniform' : 'masonry') as GridConfig['layout'],
    },
    cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10) * 1000,
    rateLimitRpm: parseInt(process.env.RATE_LIMIT_RPM || '120', 10),
  };

  return _config;
}
