import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { invalidateConfigCache } from '@/lib/config';
import type { GalleryYaml, SettingsYaml } from '@/lib/config/schema';

const CONTENT_DIR = path.join(process.cwd(), 'content');

type AlbumEntryObjectPartial = { title?: string; description?: string; password?: string; heroImage?: string };

function parseAlbumEntries(idsStr: string, overridesJson: string) {
  const ids = (idsStr || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return [];

  let overrides: Record<string, Record<string, string>> = {};
  try {
    overrides = JSON.parse(overridesJson || '{}');
  } catch { /* ignore */ }

  return ids.map((uuid) => {
    const ov = overrides[uuid];
    if (!ov || (!ov.titleOverride && !ov.description && !ov.password && !ov.heroImage)) {
      return uuid;
    }
    if (ov.titleOverride && !ov.description && !ov.password && !ov.heroImage) {
      return { [uuid]: ov.titleOverride };
    }
    const albumObj: AlbumEntryObjectPartial = {};
    if (ov.titleOverride) albumObj.title = ov.titleOverride;
    if (ov.description) albumObj.description = ov.description;
    if (ov.password) albumObj.password = ov.password;
    if (ov.heroImage) albumObj.heroImage = ov.heroImage;
    return { [uuid]: albumObj };
  });
}

function parseSubpageAlbums(uuidsStr: string): Array<string | Record<string, string>> {
  return (uuidsStr || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET() {
  const galleryPath = path.join(CONTENT_DIR, 'gallery.yaml');
  const apiKey = process.env.IMMICH_API_KEY;
  const apiUrl = process.env.IMMICH_API_URL;
  let needsSetup = true;
  try {
    await fs.access(galleryPath);
    if (apiKey && apiUrl) needsSetup = false;
  } catch {
    // gallery.yaml doesn't exist
  }
  return NextResponse.json({ needsSetup });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (!body.immichApiUrl || !body.immichApiKey) {
    return NextResponse.json(
      { success: false, error: 'Immich URL and API key are required' },
      { status: 400 },
    );
  }

  try {
    const baseUrl = body.immichApiUrl.replace(/\/+$/, '').replace(/\/api\/?$/i, '');

    // Build theme object
    const themeObj: Record<string, unknown> = {
      preset: body.themePreset || 'studio',
      accent: body.accentColor || '#e60012',
      photoFrame: body.photoFrame || 'passepartout',
      grain: body.grain !== false,
      headerDot: body.headerDot !== false,
      heroStyle: body.heroStyle || 'split',
    };
    // Only add font overrides if set
    if (body.themeFontHeading || body.themeFontBody || body.themeFontCaption) {
      themeObj.fonts = {};
      if (body.themeFontHeading) themeObj.fonts = { ...(themeObj.fonts as object), heading: body.themeFontHeading };
      if (body.themeFontBody) themeObj.fonts = { ...(themeObj.fonts as object), body: body.themeFontBody };
      if (body.themeFontCaption) themeObj.fonts = { ...(themeObj.fonts as object), caption: body.themeFontCaption };
    }
    if (body.themeRadius) themeObj.radius = body.themeRadius;

    // Build settings.yaml
    const settings: SettingsYaml = {
      title: body.siteTitle || 'My Portfolio',
      subtitle: body.siteSubtitle || '',
      lang: body.lang || 'en',
      seo: {
        title: body.seoTitle || body.siteTitle || 'My Portfolio',
        description: body.seoDescription || '',
        noIndex: body.noIndex === true,
        noFollow: body.noFollow === true,
      },
      exifOnHover: body.exifOnHover !== false,
      map: body.mapEnabled === true,
      transitions: body.transitions !== false,
      theme: themeObj as SettingsYaml['theme'],
      grid: {
        columns: body.gridColumns || 3,
        gap: body.gridGap ?? 12,
        aspectRatio: body.gridAspectRatio || '1',
        layout: body.gridLayout || 'masonry',
      },
      ...(body.footerName || body.footerInstagram || body.footerEmail || body.footerWebsite
        ? {
            footer: {
              name: body.footerName || undefined,
              instagram: body.footerInstagram || undefined,
              email: body.footerEmail || undefined,
              website: body.footerWebsite || undefined,
            },
          }
        : {}),
      legal: body.legalEnabled
        ? {
            enabled: true,
            name: body.legalName || '',
            address: body.legalAddress || '',
            zipCity: body.legalZipCity || '',
            country: body.legalCountry || '',
            email: body.legalEmail || undefined,
            phone: body.legalPhone || undefined,
            taxId: body.legalTaxId || undefined,
            vatId: body.legalVatId || undefined,
            extraInfo: body.legalExtraInfo || undefined,
          }
        : { enabled: false, name: '', address: '', zipCity: '', country: '' },
    };

    // Build gallery.yaml with subpages and per-album overrides
    const galleryAlbums = parseAlbumEntries(body.albumIds, body.albumOverridesJson);

    let gallerySubpages: GalleryYaml['subpages'] = [];
    try {
      const spData = JSON.parse(body.subpagesJson || '[]') as Array<{
        name: string;
        title?: string;
        subtitle?: string;
        password?: string;
        gridColumns?: number;
        gridGap?: number;
        gridAspectRatio?: string;
        gridLayout?: string;
        albumUuids?: string;
        sections?: Array<{ title: string; description?: string; albumUuids?: string }>;
      }>;
      gallerySubpages = spData
        .filter((sp) => sp.name.trim())
        .map((sp) => {
          const entry: Record<string, unknown> = {
            name: sp.name,
          };
          if (sp.title) entry.title = sp.title;
          if (sp.subtitle) entry.subtitle = sp.subtitle;
          if (sp.password) entry.password = sp.password;

          const grid: Record<string, unknown> = {};
          if (sp.gridColumns != null && sp.gridColumns !== 3) grid.columns = sp.gridColumns;
          if (sp.gridGap != null && sp.gridGap !== 12) grid.gap = sp.gridGap;
          if (sp.gridAspectRatio && sp.gridAspectRatio !== '1') grid.aspectRatio = sp.gridAspectRatio;
          if (sp.gridLayout && sp.gridLayout !== 'masonry') grid.layout = sp.gridLayout;
          if (Object.keys(grid).length > 0) entry.grid = grid;

          const albums = parseSubpageAlbums(sp.albumUuids || '');
          if (albums.length > 0) entry.albums = albums;

          if (sp.sections && sp.sections.length > 0) {
            entry.sections = sp.sections
              .filter((sec) => sec.title.trim())
              .map((sec) => {
                const secEntry: Record<string, unknown> = { title: sec.title };
                if (sec.description) secEntry.description = sec.description;
                const secAlbums = parseSubpageAlbums(sec.albumUuids || '');
                if (secAlbums.length > 0) secEntry.albums = secAlbums;
                return secEntry;
              });
          }

          return entry as GalleryYaml['subpages'] extends Array<infer U> ? U : never;
        });
    } catch { /* invalid JSON, leave empty */ }

    const gallery: GalleryYaml = {
      hero: (body.heroImages || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
      albums: galleryAlbums.length > 0 ? (galleryAlbums as NonNullable<GalleryYaml['albums']>) : undefined,
      ...(Array.isArray(gallerySubpages) && gallerySubpages.length > 0 ? { subpages: gallerySubpages } : {}),
    };

    // Build about.md if portrait, name, or bio provided
    const hasAboutData = body.aboutPortrait || body.aboutName || body.aboutBio;
    if (hasAboutData) {
      const gearList = body.aboutGear
        ? body.aboutGear.split('\n').filter((l: string) => l.trim())
        : [];
      const aboutFrontmatter: Record<string, unknown> = {
        portrait: body.aboutPortrait || '',
        name: body.aboutName || '',
        location: body.aboutLocation || '',
        gear: gearList,
      };
      const aboutContent = `---\n${yaml.dump(aboutFrontmatter, { lineWidth: 120, quotingType: '"', noRefs: true, sortKeys: false })}---\n\n${body.aboutBio || ''}\n`;
      await fs.writeFile(path.join(CONTENT_DIR, 'about.md'), aboutContent, 'utf8');
    }

    // Write settings.yaml
    const settingsHeader = '# ── Site Settings ─────────────────────────────────\n';
    const settingsContent =
      settingsHeader +
      yaml.dump(settings, { lineWidth: 120, quotingType: '"', noRefs: true, sortKeys: false });
    await fs.writeFile(path.join(CONTENT_DIR, 'settings.yaml'), settingsContent, 'utf8');

    // Write gallery.yaml
    const galleryHeader = '# ── Gallery Structure ──────────────────────────────\n';
    const galleryContent =
      galleryHeader +
      yaml.dump(gallery, { lineWidth: 120, quotingType: '"', noRefs: true, sortKeys: false });
    await fs.writeFile(path.join(CONTENT_DIR, 'gallery.yaml'), galleryContent, 'utf8');

    // Build .env content
    const envVars: string[] = [
      '# Immich Folio Configuration (generated by Setup Wizard)',
      `IMMICH_API_URL=${baseUrl}`,
      `IMMICH_API_KEY=${body.immichApiKey}`,
      body.authSecret ? `AUTH_SECRET=${body.authSecret}` : '',
      body.adminPassword ? `ADMIN_PASSWORD=${body.adminPassword}` : '',
      body.siteTitle ? `SITE_TITLE=${body.siteTitle}` : '',
      body.siteSubtitle ? `SITE_SUBTITLE=${body.siteSubtitle}` : '',
      `CACHE_TTL=${body.cacheTtl ?? 300}`,
      `RATE_LIMIT_RPM=${body.rateLimitRpm ?? 120}`,
      body.trustedProxies ? `TRUSTED_PROXIES=${body.trustedProxies}` : '',
      body.webhookSecret ? `WEBHOOK_SECRET=${body.webhookSecret}` : '',
    ].filter(Boolean);
    const envContent = envVars.join('\n') + '\n';

    // Try to write .env.local (works with docker-compose env_file)
    let envWritten = false;
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      await fs.writeFile(envPath, envContent, 'utf8');
      envWritten = true;
    } catch {
      // Non-fatal — may not be writable in Docker
    }

    // Also write content/.env so Docker entrypoint picks up AUTH_SECRET
    try {
      const dotEnvPath = path.join(CONTENT_DIR, '.env');
      await fs.writeFile(dotEnvPath, envContent, 'utf8');
    } catch {
      // Non-fatal
    }

    // Invalidate config cache so next request picks up changes
    invalidateConfigCache();

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully.',
      note: envWritten
        ? 'Your settings have been saved. You may need to restart the server.'
        : 'Configuration files saved. Please manually set the environment variables below, then restart your server.',
      envFile: envWritten ? undefined : envContent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save configuration';
    console.error('[Install API] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
