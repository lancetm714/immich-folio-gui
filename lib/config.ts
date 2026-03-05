/**
 * Typed configuration loader.
 * Secrets come from env vars; gallery structure comes from content/gallery.yaml.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { env } from './env';

// ── Env helpers (now handled by lib/env.ts via Zod) ───────────

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

/** Footer configuration for social links. */
export interface FooterConfig {
  name?: string;
  instagram?: string;
  email?: string;
  website?: string;
}

/** Theme configuration — controls the visual identity of the gallery. */
export interface ThemeConfig {
  preset: string;
  accent: string;
  fonts: { heading: string; body: string; caption: string };
  radius: number;
  photoFrame: 'none' | 'passepartout' | 'shadow';
  grain: boolean;
  headerDot: boolean;
  heroStyle: 'split' | 'fullbleed' | 'minimal' | 'stacked' | 'typographic' | 'mosaic';
}

// ── Theme Presets ──────────────────────────────────────────────

const THEME_PRESETS: Record<string, ThemeConfig> = {
  studio: {
    preset: 'studio',
    accent: '#e60012',
    fonts: { heading: 'Playfair Display', body: 'DM Sans', caption: 'EB Garamond' },
    radius: 0,
    photoFrame: 'passepartout',
    grain: true,
    headerDot: true,
    heroStyle: 'split',
  },
  minimal: {
    preset: 'minimal',
    accent: '#000000',
    fonts: { heading: 'Geist', body: 'Geist', caption: 'IBM Plex Mono' },
    radius: 0,
    photoFrame: 'none',
    grain: false,
    headerDot: false,
    heroStyle: 'fullbleed',
  },
  editorial: {
    preset: 'editorial',
    accent: '#8B2500',
    fonts: { heading: 'Bodoni Moda', body: 'Newsreader', caption: 'Spectral' },
    radius: 0,
    photoFrame: 'shadow',
    grain: false,
    headerDot: false,
    heroStyle: 'split',
  },
  classic: {
    preset: 'classic',
    accent: '#c49a3c',
    fonts: { heading: 'Cinzel', body: 'Crimson Pro', caption: 'Crimson Pro' },
    radius: 12,
    photoFrame: 'passepartout',
    grain: false,
    headerDot: true,
    heroStyle: 'minimal',
  },
  noir: {
    preset: 'noir',
    accent: '#ff6b35',
    fonts: { heading: 'Libre Baskerville', body: 'Source Sans 3', caption: 'Space Mono' },
    radius: 0,
    photoFrame: 'passepartout',
    grain: true,
    headerDot: false,
    heroStyle: 'fullbleed',
  },
  monograph: {
    preset: 'monograph',
    accent: '#333333',
    fonts: { heading: 'Instrument Serif', body: 'Inter', caption: 'IBM Plex Mono' },
    radius: 0,
    photoFrame: 'none',
    grain: false,
    headerDot: false,
    heroStyle: 'typographic',
  },
  botanica: {
    preset: 'botanica',
    accent: '#4a7c59',
    fonts: { heading: 'Cormorant Garamond', body: 'Nunito Sans', caption: 'Inconsolata' },
    radius: 8,
    photoFrame: 'none',
    grain: false,
    headerDot: true,
    heroStyle: 'split',
  },
};

/** Raw YAML structure (before validation). */
interface GalleryYaml {
  hero?: string | string[];
  albums?: string[];
  exifOnHover?: boolean;
  map?: boolean;
  theme?:
  | string
  | {
    preset?: string;
    accent?: string;
    fonts?: { heading?: string; body?: string; caption?: string };
    radius?: number;
    photoFrame?: string;
    grain?: boolean;
    headerDot?: boolean;
    heroStyle?: string;
  };
  grid?: {
    columns?: number;
    gap?: number;
    aspectRatio?: string;
    layout?: string;
  };
  footer?: {
    name?: string;
    instagram?: string;
    email?: string;
    website?: string;
  };
  subpages?:
  | Record<string, string[] | Array<string | Record<string, string>>>
  | Array<{
    name: string;
    albums: Array<string | Record<string, string>>;
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
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric → hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

// ── Config type ────────────────────────────────────────────────

/** Grid layout configuration. */
export interface GridConfig {
  columns: number;
  gap: number;
  aspectRatio: string;
  layout: 'masonry' | 'uniform' | 'showcase' | 'filmstrip' | 'editorial-flow';
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
  /** Theme configuration. */
  theme: ThemeConfig;
  /** Footer social links config. */
  footer: FooterConfig | null;
  /** Show the /map page. Default: false. */
  map: boolean;
  /** Explicit album name overrides from gallery.yaml. */
  albumOverrides: Record<string, string>;
  cacheTtl: number;
  rateLimitRpm: number;
}

// ── Theme resolution ───────────────────────────────────────────

const VALID_PHOTO_FRAMES = ['none', 'passepartout', 'shadow'];
const VALID_HERO_STYLES = ['split', 'fullbleed', 'minimal', 'stacked', 'typographic', 'mosaic'];
const VALID_LAYOUTS = ['masonry', 'uniform', 'showcase', 'filmstrip', 'editorial-flow'];

function resolveTheme(raw?: GalleryYaml['theme']): ThemeConfig {
  // No theme key → default preset
  if (!raw) return { ...THEME_PRESETS.studio };

  // String shorthand: `theme: minimal`
  if (typeof raw === 'string') {
    const preset = THEME_PRESETS[raw];
    if (!preset) {
      throw new Error(
        `Unknown theme preset "${raw}". Valid presets: ${Object.keys(THEME_PRESETS).join(', ')}`,
      );
    }
    return { ...preset };
  }

  // Object: merge with base preset
  const baseName = raw.preset ?? 'studio';
  const base = THEME_PRESETS[baseName];
  if (!base) {
    throw new Error(
      `Unknown theme preset "${baseName}". Valid presets: ${Object.keys(THEME_PRESETS).join(', ')}`,
    );
  }

  return {
    preset: baseName,
    accent: raw.accent ?? base.accent,
    fonts: {
      heading: raw.fonts?.heading ?? base.fonts.heading,
      body: raw.fonts?.body ?? base.fonts.body,
      caption: raw.fonts?.caption ?? base.fonts.caption,
    },
    radius: raw.radius ?? base.radius,
    photoFrame: VALID_PHOTO_FRAMES.includes(raw.photoFrame ?? '')
      ? (raw.photoFrame as ThemeConfig['photoFrame'])
      : base.photoFrame,
    grain: raw.grain ?? base.grain,
    headerDot: raw.headerDot ?? base.headerDot,
    heroStyle: VALID_HERO_STYLES.includes(raw.heroStyle ?? '')
      ? (raw.heroStyle as ThemeConfig['heroStyle'])
      : base.heroStyle,
  };
}

/**
 * Build a Google Fonts URL for the theme's fonts.
 * Deduplicates fonts and includes key weights.
 */
export function getGoogleFontsUrl(theme: ThemeConfig): string {
  const weights = '300;400;500;600';
  const families = [...new Set([theme.fonts.heading, theme.fonts.body, theme.fonts.caption])];
  const params = families.map((f) => `family=${f.replace(/ /g, '+')}:wght@${weights}`).join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

// ── Config builder ─────────────────────────────────────────────

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (_config) return _config;

  const apiUrl = env.IMMICH_API_URL;
  const apiKey = env.IMMICH_API_KEY;
  const gallery = loadGalleryYaml();

  // Resolve theme: string shorthand → preset, object → merged with preset base
  const theme = resolveTheme(gallery.theme);

  const albumOverrides: Record<string, string> = {};

  function processAlbumEntry(entry: string | Record<string, string>, context: string): string {
    if (typeof entry === 'string') {
      return validateUuid(entry, context);
    }
    // Map format: { "uuid": "Custom Name" }
    const [uuid, name] = Object.entries(entry)[0];
    const validatedUuid = validateUuid(uuid, context);
    albumOverrides[validatedUuid] = name;
    return validatedUuid;
  }

  // Parse standalone albums
  const standaloneAlbumIds = (gallery.albums ?? []).map((entry) =>
    processAlbumEntry(entry, 'gallery.yaml albums'),
  );

  if (standaloneAlbumIds.length === 0 && (!gallery.subpages || (Array.isArray(gallery.subpages) ? gallery.subpages.length === 0 : Object.keys(gallery.subpages).length === 0))) {
    throw new Error('gallery.yaml must define at least one album or subpage');
  }

  // Parse subpages
  let subpages: SubpageConfig[] = [];

  if (Array.isArray(gallery.subpages)) {
    // Original list format
    subpages = gallery.subpages.map((sp) => {
      if (!sp.name || !sp.albums || sp.albums.length === 0) {
        throw new Error(
          `Subpage "${sp.name || '(unnamed)'}" must have a name and at least one album`,
        );
      }
      return {
        name: sp.name,
        slug: slugify(sp.name),
        albumIds: sp.albums.map((entry) => processAlbumEntry(entry, `subpage "${sp.name}"`)),
        password: sp.password,
        ...(sp.grid
          ? {
            grid: {
              ...(sp.grid.columns != null ? { columns: sp.grid.columns } : {}),
              ...(sp.grid.gap != null ? { gap: sp.grid.gap } : {}),
              ...(sp.grid.aspectRatio != null ? { aspectRatio: sp.grid.aspectRatio } : {}),
              ...(sp.grid.layout != null
                ? {
                  layout: (VALID_LAYOUTS.includes(sp.grid.layout)
                    ? sp.grid.layout
                    : 'masonry') as GridConfig['layout'],
                }
                : {}),
            },
          }
          : {}),
      };
    });
  } else if (gallery.subpages) {
    // New map format: { "Subpage Name": ["uuid1", { "uuid2": "Name" }] } OR { "Subpage Name": { password: "...", albums: [...] } }
    subpages = Object.entries(gallery.subpages).map(([name, value]) => {
      // If it's an array, it's just albums
      if (Array.isArray(value)) {
        return {
          name,
          slug: slugify(name),
          albumIds: value.map((entry) => processAlbumEntry(entry, `subpage "${name}"`)),
        };
      }

      // If it's an object, it might have password, grid, albums
      const sp = value as any;
      const albumEntries = sp.albums || [];
      return {
        name,
        slug: slugify(name),
        albumIds: albumEntries.map((entry: any) => processAlbumEntry(entry, `subpage "${name}"`)),
        password: sp.password,
        ...(sp.grid
          ? {
            grid: {
              ...(sp.grid.columns != null ? { columns: sp.grid.columns } : {}),
              ...(sp.grid.gap != null ? { gap: sp.grid.gap } : {}),
              ...(sp.grid.aspectRatio != null ? { aspectRatio: sp.grid.aspectRatio } : {}),
              ...(sp.grid.layout != null
                ? {
                  layout: (VALID_LAYOUTS.includes(sp.grid.layout)
                    ? sp.grid.layout
                    : 'masonry') as GridConfig['layout'],
                }
                : {}),
            },
          }
          : {}),
      };
    });
  }

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
    siteTitle: env.SITE_TITLE,
    siteSubtitle: env.SITE_SUBTITLE,
    heroImages: gallery.hero
      ? (Array.isArray(gallery.hero) ? gallery.hero : [gallery.hero]).map((id) =>
        validateUuid(id, 'gallery.yaml hero'),
      )
      : [],
    exifOnHover: gallery.exifOnHover !== false,
    grid: {
      columns: gallery.grid?.columns ?? 3,
      gap: gallery.grid?.gap ?? 12,
      aspectRatio: gallery.grid?.aspectRatio ?? '1',
      layout: (VALID_LAYOUTS.includes(gallery.grid?.layout ?? '')
        ? gallery.grid!.layout
        : 'masonry') as GridConfig['layout'],
    },
    theme,
    footer: gallery.footer
      ? {
        name: gallery.footer.name,
        instagram: gallery.footer.instagram,
        email: gallery.footer.email,
        website: gallery.footer.website,
      }
      : null,
    map: gallery.map === true,
    albumOverrides,
    cacheTtl: env.CACHE_TTL * 1000,
    rateLimitRpm: env.RATE_LIMIT_RPM,
  };

  return _config;
}
