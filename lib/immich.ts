/**
 * Server-only Immich API client.
 * Inspired by immich-public-proxy's approach but uses API key auth
 * to access specific albums rather than shared link keys.
 *
 * API key never leaves the server — all client-facing image
 * requests go through our proxy route.
 */

import { getConfig, slugify, type SubpageConfig } from './config';
import { cache } from './cache';

// ── Types ──────────────────────────────────────────────────────

export interface ImmichAlbum {
  id: string;
  slug: string;
  albumName: string;
  description: string;
  albumThumbnailAssetId: string | null;
  assetCount: number;
  assets: ImmichAsset[];
  createdAt: string;
  updatedAt: string;
  order: 'asc' | 'desc';
}

export interface ImmichAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  originalFileName: string;
  originalMimeType: string;
  thumbhash: string | null;
  fileCreatedAt: string;
  exifInfo?: ImmichExifInfo;
  isTrashed: boolean;
}

export interface ImmichExifInfo {
  make: string | null;
  model: string | null;
  lensModel: string | null;
  focalLength: number | null;
  fNumber: number | null;
  exposureTime: string | null;
  iso: number | null;
  exifImageWidth: number | null;
  exifImageHeight: number | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  dateTimeOriginal: string | null;
  description: string | null;
}

/** A clustered map marker — one per unique city/country. */
export interface MapLocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
  photoCount: number;
  coverAssetId: string;
  albums: { name: string; slug: string; subpageSlug?: string }[];
}

export type ImageSize = 'thumbnail' | 'preview' | 'original';

/** Enriched subpage with album metadata (for rendering cards). */
export interface SubpageSummary {
  name: string;
  slug: string;
  albumCount: number;
  totalAssetCount: number;
  coverAssetId: string | null;
}

export type ImmichResult<T> = { data: T | null; error: string | null };

// ── API Client ─────────────────────────────────────────────────

class ImmichClient {
  private hasLoggedAlbums = false;

  private get config() {
    return getConfig();
  }

  /**
   * Make an authenticated request to the Immich API.
   */
  private async request<T>(endpoint: string): Promise<ImmichResult<T>> {
    const url = `${this.config.immich.apiUrl}${endpoint}`;
    try {
      const res = await fetch(url, {
        headers: {
          'x-api-key': this.config.immich.apiKey,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const error = `[Immich] ${res.status} ${res.statusText} for ${endpoint}`;
        console.error(error);
        return { data: null, error };
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        return { data: (await res.json()) as T, error: null };
      }
      return { data: null, error: 'Invalid response format (expected JSON)' };
    } catch (err) {
      const error = `[Immich] Failed to reach ${url}: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(error);
      return { data: null, error };
    }
  }

  /**
   * Stream a binary response from Immich (for image proxying).
   */
  async streamAsset(
    assetId: string,
    size: ImageSize = 'preview',
  ): Promise<{ stream: ReadableStream; contentType: string; contentLength: string | null } | null> {
    const endpoint =
      size === 'original'
        ? `/assets/${encodeURIComponent(assetId)}/original`
        : `/assets/${encodeURIComponent(assetId)}/thumbnail?size=${size}`;

    const url = `${this.config.immich.apiUrl}${endpoint}`;
    try {
      const res = await fetch(url, {
        headers: {
          'x-api-key': this.config.immich.apiKey,
        },
      });

      if (!res.ok || !res.body) {
        console.error(`[Immich] Failed to stream ${assetId}: ${res.status}`);
        return null;
      }

      return {
        stream: res.body,
        contentType: res.headers.get('Content-Type') || 'application/octet-stream',
        contentLength: res.headers.get('Content-Length'),
      };
    } catch (error) {
      console.error(`[Immich] Stream error for ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Get ALL configured albums (filtered by the full allowlist).
   * Uses ?shared=true to only fetch albums that have been shared in Immich.
   */
  async getAlbums(): Promise<ImmichAlbum[]> {
    const cacheKey = 'albums-list';
    const cached = cache.get<ImmichAlbum[]>(cacheKey);
    if (cached) return cached;

    const { data: all, error } = await this.request<ImmichAlbum[]>('/albums?shared=true');
    if (error || !all) return [];

    const allowedIds = new Set(this.config.albums);
    const filtered = all
      .filter((album) => allowedIds.has(album.id))
      .map((album) => {
        const name = this.config.albumOverrides[album.id] ?? album.albumName;
        return {
          ...album,
          albumName: name,
          slug: slugify(name),
        };
      });

    // Log album summary on first load so admins can see what's published
    if (!this.hasLoggedAlbums) {
      this.hasLoggedAlbums = true;
      console.log('\n[Lightbox] Published albums:');
      console.log('─'.repeat(80));

      // Log standalone albums
      const standaloneIds = new Set(this.config.standaloneAlbums);
      const standalone = filtered.filter((a) => standaloneIds.has(a.id));
      if (standalone.length > 0) {
        console.log('  Standalone:');
        for (const a of standalone) {
          console.log(`    📷 ${a.albumName}`);
          console.log(`       URL: /${a.slug}  •  ${a.assetCount} photos  •  ID: ${a.id}`);
        }
      }

      // Log subpage groupings
      for (const sp of this.config.subpages) {
        const spAlbums = filtered.filter((a) => sp.albumIds.includes(a.id));
        console.log(`  📁 ${sp.name} (/${sp.slug}):`);
        for (const a of spAlbums) {
          console.log(`    📷 ${a.albumName}`);
          console.log(`       URL: /${sp.slug}/${a.slug}  •  ${a.assetCount} photos`);
        }
      }

      const missing = this.config.albums.filter((id) => !all.some((a) => a.id === id));
      if (missing.length > 0) {
        console.warn(`  ⚠️  Unknown album IDs: ${missing.join(', ')}`);
      }
      console.log('─'.repeat(80) + '\n');
    }

    cache.set(cacheKey, filtered, this.config.cacheTtl);
    return filtered;
  }

  /**
   * Get only standalone albums (not in any subpage) — for the homepage.
   */
  async getStandaloneAlbums(): Promise<ImmichAlbum[]> {
    const albums = await this.getAlbums();
    const standaloneIds = new Set(this.config.standaloneAlbums);
    return albums.filter((a) => standaloneIds.has(a.id));
  }

  /**
   * Get enriched subpage summaries for the homepage.
   */
  async getSubpages(): Promise<SubpageSummary[]> {
    if (this.config.subpages.length === 0) return [];

    const albums = await this.getAlbums();
    const albumMap = new Map(albums.map((a) => [a.id, a]));

    return this.config.subpages.map((sp) => {
      const spAlbums = sp.albumIds
        .map((id) => albumMap.get(id))
        .filter((a): a is ImmichAlbum => a !== undefined);

      return {
        name: sp.name,
        slug: sp.slug,
        albumCount: spAlbums.length,
        totalAssetCount: spAlbums.reduce((sum, a) => sum + a.assetCount, 0),
        coverAssetId: spAlbums[0]?.albumThumbnailAssetId ?? null,
      };
    });
  }

  /**
   * Get albums belonging to a specific subpage.
   */
  async getSubpageAlbums(
    subpageSlug: string,
  ): Promise<{ subpage: SubpageConfig; albums: ImmichAlbum[] } | null> {
    const subpage = this.config.subpages.find((sp) => sp.slug === subpageSlug);
    if (!subpage) return null;

    const allAlbums = await this.getAlbums();
    const subpageAlbumIds = new Set(subpage.albumIds);
    const albums = allAlbums.filter((a) => subpageAlbumIds.has(a.id));

    return { subpage, albums };
  }

  /**
   * Get a single album with its assets.
   */
  async getAlbum(albumId: string): Promise<ImmichAlbum | null> {
    // Security: only serve configured albums
    if (!this.config.albums.includes(albumId)) {
      console.warn(`[Immich] Album ${albumId} is not in LIGHTBOX_ALBUMS`);
      return null;
    }

    const cacheKey = `album-${albumId}`;
    const cached = cache.get<ImmichAlbum>(cacheKey);
    if (cached) return cached;

    const { data: album, error } = await this.request<ImmichAlbum>(`/albums/${encodeURIComponent(albumId)}`);
    if (error || !album) return null;

    // Filter out trashed assets
    album.assets = (album.assets || []).filter((a) => !a.isTrashed);

    const name = this.config.albumOverrides[album.id] ?? album.albumName;
    album.albumName = name;
    album.slug = slugify(name);

    cache.set(cacheKey, album, this.config.cacheTtl);
    return album;
  }

  /**
   * Find an album by its URL slug.
   * If subpageSlug is provided, only search within that subpage's albums.
   */
  async getAlbumBySlug(slug: string, subpageSlug?: string): Promise<ImmichAlbum | null> {
    const albums = await this.getAlbums();

    let searchSet = albums;
    if (subpageSlug) {
      const subpage = this.config.subpages.find((sp) => sp.slug === subpageSlug);
      if (!subpage) return null;
      const subpageIds = new Set(subpage.albumIds);
      searchSet = albums.filter((a) => subpageIds.has(a.id));
    }

    const match = searchSet.find((a) => a.slug === slug);
    if (!match) return null;
    return this.getAlbum(match.id);
  }

  /**
   * Check if a slug corresponds to a subpage.
   */
  isSubpageSlug(slug: string): boolean {
    return this.config.subpages.some((sp) => sp.slug === slug);
  }

  /**
   * Get asset info including EXIF data.
   */
  async getAssetInfo(assetId: string): Promise<ImmichAsset | null> {
    const cacheKey = `asset-${assetId}`;
    const cached = cache.get<ImmichAsset>(cacheKey);
    if (cached) return cached;

    const { data: asset, error } = await this.request<ImmichAsset>(`/assets/${encodeURIComponent(assetId)}`);
    if (error || !asset) return null;

    cache.set(cacheKey, asset, this.config.cacheTtl);
    return asset;
  }

  /**
   * Aggregate all geotagged photos into location-level markers.
   * Returns one entry per unique city+country with averaged lat/lng.
   */
  async getMapData(): Promise<MapLocation[]> {
    const cacheKey = 'map-data';
    const cached = cache.get<MapLocation[]>(cacheKey);
    if (cached) return cached;

    const albums = await this.getAlbums();

    // Build a lookup: album ID → { name, slug, subpageSlug? }
    const albumMeta = new Map<string, { name: string; slug: string; subpageSlug?: string }>();
    for (const a of albums) {
      // Check if this album belongs to a subpage
      const sp = this.config.subpages.find((s) => s.albumIds.includes(a.id));
      albumMeta.set(a.id, { name: a.albumName, slug: a.slug, subpageSlug: sp?.slug });
    }

    // Fetch full album data (with assets) for each
    const fullAlbums = await Promise.all(albums.map((a) => this.getAlbum(a.id)));

    // Bucket assets by city+country
    const buckets = new Map<
      string,
      { lats: number[]; lngs: number[]; count: number; coverAssetId: string; albumIds: Set<string> }
    >();

    for (const album of fullAlbums) {
      if (!album) continue;
      for (const asset of album.assets) {
        const exif = asset.exifInfo;
        if (!exif?.latitude || !exif?.longitude || !exif?.city || !exif?.country) continue;

        const key = `${exif.city}|${exif.country}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { lats: [], lngs: [], count: 0, coverAssetId: asset.id, albumIds: new Set() };
          buckets.set(key, bucket);
        }
        bucket.lats.push(exif.latitude);
        bucket.lngs.push(exif.longitude);
        bucket.count++;
        bucket.albumIds.add(album.id);
      }
    }

    // Convert buckets to MapLocation[]
    const locations: MapLocation[] = [];
    for (const [key, bucket] of buckets) {
      const [city, country] = key.split('|');
      const lat = bucket.lats.reduce((a, b) => a + b, 0) / bucket.lats.length;
      const lng = bucket.lngs.reduce((a, b) => a + b, 0) / bucket.lngs.length;
      locations.push({
        city,
        country,
        lat,
        lng,
        photoCount: bucket.count,
        coverAssetId: bucket.coverAssetId,
        albums: [...bucket.albumIds]
          .map((id) => albumMeta.get(id))
          .filter((m): m is NonNullable<typeof m> => !!m),
      });
    }

    cache.set(cacheKey, locations, this.config.cacheTtl);
    return locations;
  }

  /**
   * Check if the Immich server is reachable.
   */
  async ping(): Promise<boolean> {
    const { data } = await this.request<{ res: string }>('/server/ping');
    return !!data;
  }
}

export const immich = new ImmichClient();
