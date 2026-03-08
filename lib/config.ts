/**
 * Typed configuration loader.
 * Secrets come from env vars; gallery structure comes from content/gallery.yaml.
 * Global settings come from content/settings.yaml.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { env } from './env';

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

/** Legal / Impressum configuration. */
export interface LegalConfig {
  enabled: boolean;
  name: string;
  address: string;
  zipCity: string;
  country: string;
  email?: string;
  phone?: string;
  taxId?: string;
  vatId?: string;
  extraInfo?: string;
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

/** Raw YAML structure for gallery structure. */
interface GalleryYaml {
  hero?: string | string[];
  albums?: string[];
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

/** Raw YAML structure for global settings. */
interface SettingsYaml {
  title?: string;
  subtitle?: string;
  exifOnHover?: boolean;
  map?: boolean;
  transitions?: boolean;
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
  footer?: FooterConfig;
  legal?: Partial<LegalConfig>;
}

// ── YAML loading ───────────────────────────────────────────────

function loadYaml<T>(filename: string): T {
  const yamlPath = path.join(process.cwd(), 'content', filename);

  if (!fs.existsSync(yamlPath)) {
    // gallery.yaml is required, settings.yaml can fallback to defaults
    if (filename === 'gallery.yaml') {
      throw new Error(
        `Required config not found: ${yamlPath}\n` +
        `Copy content/gallery.yaml.example to content/gallery.yaml and add your album IDs.`,
      );
    }
    return {} as T;
  }

  const raw = fs.readFileSync(yamlPath, 'utf8');
  return (yaml.load(raw) || {}) as T;
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
  /** Secret used for signing auth cookies and encrypting asset tokens. */
  authSecret: string;
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
  /** Legal / Impressum configuration. */
  legal: LegalConfig;
  /** Show the /map page. Default: false. */
  map: boolean;
  /** Enable page transitions between routes. Default: true. */
  transitions: boolean;
  /** Explicit album name overrides from gallery.yaml. */
  albumOverrides: Record<string, string>;
  cacheTtl: number;
  rateLimitRpm: number;
}

// ── Theme resolution ───────────────────────────────────────────

const VALID_PHOTO_FRAMES = ['none', 'passepartout', 'shadow'];
const VALID_HERO_STYLES = ['split', 'fullbleed', 'minimal', 'stacked', 'typographic', 'mosaic'];
const VALID_LAYOUTS = ['masonry', 'uniform', 'showcase', 'filmstrip', 'editorial-flow'];

function resolveTheme(raw?: SettingsYaml['theme']): ThemeConfig {
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
  // In development, skip the cache so YAML changes are picked up on the next
  // request without a full server restart.
  const isDev = process.env.NODE_ENV !== 'production';
  if (_config && !isDev) return _config;

  const apiUrl = env.IMMICH_API_URL;
  const apiKey = env.IMMICH_API_KEY;
  const authSecret = env.AUTH_SECRET || apiKey;

  if (!env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
    console.warn(
      '\n⚠️  SECURITY WARNING: AUTH_SECRET is not set. Falling back to IMMICH_API_KEY.\n' +
      '   Please set a long random string as AUTH_SECRET in your .env for better security.\n',
    );
  }

  const gallery = loadYaml<GalleryYaml>('gallery.yaml');
  const settings = loadYaml<SettingsYaml>('settings.yaml');

  // Resolve theme: string shorthand → preset, object → merged with preset base
  const theme = resolveTheme(settings.theme);

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

  if (
    standaloneAlbumIds.length === 0 &&
    (!gallery.subpages ||
      (Array.isArray(gallery.subpages)
        ? gallery.subpages.length === 0
        : Object.keys(gallery.subpages).length === 0))
  ) {
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
    authSecret,
    albums: allAlbumIds,
    standaloneAlbums: standaloneAlbumIds.filter((id) => !subpageAlbumIds.has(id)),
    subpages,
    siteTitle: settings.title ?? env.SITE_TITLE,
    siteSubtitle: settings.subtitle ?? env.SITE_SUBTITLE,
    heroImages: gallery.hero
      ? (Array.isArray(gallery.hero) ? gallery.hero : [gallery.hero]).map((id) =>
        validateUuid(id, 'gallery.yaml hero'),
      )
      : [],
    exifOnHover: settings.exifOnHover !== false,
    grid: {
      columns: settings.grid?.columns ?? 3,
      gap: settings.grid?.gap ?? 12,
      aspectRatio: settings.grid?.aspectRatio ?? '1',
      layout: (VALID_LAYOUTS.includes(settings.grid?.layout ?? '')
        ? settings.grid!.layout
        : 'masonry') as GridConfig['layout'],
    },
    theme,
    footer: settings.footer
      ? {
        name: settings.footer.name,
        instagram: settings.footer.instagram,
        email: settings.footer.email,
        website: settings.footer.website,
      }
      : null,
    legal: {
      enabled: settings.legal?.enabled === true,
      name: settings.legal?.name || '',
      address: settings.legal?.address || '',
      zipCity: settings.legal?.zipCity || '',
      country: settings.legal?.country || '',
      email: settings.legal?.email,
      phone: settings.legal?.phone,
      taxId: settings.legal?.taxId,
      vatId: settings.legal?.vatId,
      extraInfo: settings.legal?.extraInfo,
    },
    map: settings.map === true,
    transitions: settings.transitions !== false,
    albumOverrides,
    cacheTtl: env.CACHE_TTL * 1000,
    rateLimitRpm: env.RATE_LIMIT_RPM,
  };

  return _config;
}
