/**
 * Typed environment configuration with validation.
 * Fails fast at startup if required variables are missing.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** A subpage groups multiple Immich albums under one URL path. */
export interface SubpageConfig {
  name: string;
  slug: string;
  albumIds: string[];
}

/**
 * Extract a UUID from a string that may be "Label:uuid" or just "uuid".
 */
function extractUuid(entry: string): string | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;
  const uuidMatch = trimmed.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  return uuidMatch ? uuidMatch[1] : trimmed;
}

/**
 * Parse LIGHTBOX_SUBPAGES env var.
 * Format: "Japan > uuid1, uuid2; Italy > uuid3, uuid4"
 * Each subpage separated by ";", name separated from album IDs by ">".
 */
function parseSubpages(raw: string | undefined): SubpageConfig[] {
  if (!raw || !raw.trim()) return [];

  // Split on semicolons OR newlines — supports both single-line and multiline formats
  return raw
    .split(/[;\n]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const parts = segment.split('>');
      if (parts.length < 2) {
        console.warn(`[Config] Skipping malformed subpage entry: "${segment}"`);
        return null;
      }
      const name = parts[0].trim();
      const albumIds = parts
        .slice(1)
        .join('>') // rejoin in case name contained ">"
        .split(',')
        .map((id) => extractUuid(id))
        .filter((id): id is string => id !== null);

      if (!name || albumIds.length === 0) {
        console.warn(`[Config] Skipping subpage with missing name or albums: "${segment}"`);
        return null;
      }

      return { name, slug: slugify(name), albumIds };
    })
    .filter((sp): sp is SubpageConfig => sp !== null);
}

export function getConfig() {
  const apiUrl = requireEnv('IMMICH_API_URL').replace(/\/+$/, '');
  const apiKey = requireEnv('IMMICH_API_KEY');

  // Parse standalone albums from LIGHTBOX_ALBUMS
  const standaloneAlbumIds = requireEnv('LIGHTBOX_ALBUMS')
    .split(',')
    .map((entry) => extractUuid(entry))
    .filter((id): id is string => id !== null);

  if (standaloneAlbumIds.length === 0) {
    throw new Error('LIGHTBOX_ALBUMS must contain at least one album ID');
  }

  // Parse subpages (optional)
  const subpages = parseSubpages(process.env.LIGHTBOX_SUBPAGES);

  // Collect ALL album IDs (standalone + subpage) — deduplicated
  const subpageAlbumIds = new Set(subpages.flatMap((sp) => sp.albumIds));
  const allAlbumIds = [...new Set([...standaloneAlbumIds, ...subpageAlbumIds])];

  return {
    immich: {
      apiUrl: `${apiUrl}/api`,
      apiKey,
    },
    /** All album IDs (standalone + subpage) for allowlist validation */
    albums: allAlbumIds,
    /** Album IDs that appear only in LIGHTBOX_ALBUMS and NOT in any subpage */
    standaloneAlbums: standaloneAlbumIds.filter((id) => !subpageAlbumIds.has(id)),
    /** Subpage definitions */
    subpages,
    siteTitle: process.env.SITE_TITLE || 'Gallery',
    siteSubtitle: process.env.SITE_SUBTITLE || '',
    /** Immich asset ID for the homepage hero image */
    heroImage: process.env.HERO_IMAGE || '',
    cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10) * 1000, // convert to ms
  };
}

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

export type AppConfig = ReturnType<typeof getConfig>;
