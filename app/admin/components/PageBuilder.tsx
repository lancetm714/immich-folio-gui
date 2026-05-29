'use client';

import { useState, useEffect, useCallback } from 'react';
import AlbumPicker from './AlbumPicker';

// ── Types ──────────────────────────────────────────────────────
interface AlbumEntry {
  id: string;
  title?: string;
  description?: string;
  password?: string;
}

interface Section {
  title: string;
  description?: string;
  albums: AlbumEntry[];
}

interface Subpage {
  name: string;
  title?: string;
  subtitle?: string;
  password?: string;
  sections?: Section[];
  albums: AlbumEntry[];
  grid?: { columns?: number; gap?: number; aspectRatio?: string; layout?: string };
}

interface GalleryState {
  hero: string[];
  albums: AlbumEntry[];
  subpages: Subpage[];
}

interface ImmichAlbumInfo {
  id: string;
  albumName: string;
  description: string;
  thumbnailAssetId: string | null;
  assetCount: number;
  isConfigured: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

function parseAlbumEntries(
  raw:
    | Array<
        string | Record<string, string | { title: string; description?: string; password?: string }>
      >
    | undefined,
): AlbumEntry[] {
  if (!raw) return [];
  return raw.map((entry) => {
    if (typeof entry === 'string') return { id: entry };
    const [id, value] = Object.entries(entry)[0];
    if (typeof value === 'string') return { id, title: value };
    return { id, title: value.title, description: value.description, password: value.password };
  });
}

function serializeAlbumEntries(
  entries: AlbumEntry[],
): Array<
  string | Record<string, string | { title: string; description?: string; password?: string }>
> {
  return entries.map((entry) => {
    if (!entry.title && !entry.description && !entry.password) return entry.id;
    if (entry.title && !entry.description && !entry.password) {
      return { [entry.id]: entry.title };
    }
    const val: { title: string; description?: string; password?: string } = {
      title: entry.title || '',
    };
    if (entry.description) val.description = entry.description;
    if (entry.password) val.password = entry.password;
    return { [entry.id]: val };
  });
}

// ── Component ──────────────────────────────────────────────────

export default function PageBuilder() {
  const [gallery, setGallery] = useState<GalleryState>({ hero: [], albums: [], subpages: [] });
  const [immichAlbums, setImmichAlbums] = useState<ImmichAlbumInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [pickerTarget, setPickerTarget] = useState<{
    type: 'standalone' | 'subpage' | 'section';
    subpageIndex?: number;
    sectionIndex?: number;
  } | null>(null);

  // Load data
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [galleryRes, albumsRes] = await Promise.all([
        fetch('/api/admin/gallery'),
        fetch('/api/admin/albums'),
      ]);

      if (galleryRes.ok) {
        const { gallery: raw } = await galleryRes.json();
        setGallery(parseGalleryYaml(raw));
      }

      if (albumsRes.ok) {
        const { albums } = await albumsRes.json();
        setImmichAlbums(albums);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  function parseGalleryYaml(raw: Record<string, unknown>): GalleryState {
    const hero = Array.isArray(raw.hero) ? raw.hero : raw.hero ? [raw.hero as string] : [];
    const albums = parseAlbumEntries(
      raw.albums as Array<string | Record<string, string>> | undefined,
    );

    let subpages: Subpage[] = [];
    if (Array.isArray(raw.subpages)) {
      subpages = (raw.subpages as Array<Record<string, unknown>>).map((sp) => ({
        name: (sp.name as string) || '',
        title: sp.title as string | undefined,
        subtitle: sp.subtitle as string | undefined,
        password: sp.password as string | undefined,
        albums: parseAlbumEntries(sp.albums as Array<string | Record<string, string>> | undefined),
        sections: sp.sections
          ? (sp.sections as Array<Record<string, unknown>>).map((sec) => ({
              title: (sec.title as string) || '',
              description: sec.description as string | undefined,
              albums: parseAlbumEntries(sec.albums as Array<string | Record<string, string>>),
            }))
          : undefined,
        grid: sp.grid as Subpage['grid'],
      }));
    } else if (raw.subpages && typeof raw.subpages === 'object') {
      subpages = Object.entries(raw.subpages as Record<string, unknown>).map(([name, value]) => {
        if (Array.isArray(value)) {
          return { name, albums: parseAlbumEntries(value), sections: undefined };
        }
        const sp = value as Record<string, unknown>;
        return {
          name,
          title: sp.title as string | undefined,
          subtitle: sp.subtitle as string | undefined,
          password: sp.password as string | undefined,
          albums: parseAlbumEntries(
            sp.albums as Array<string | Record<string, string>> | undefined,
          ),
          sections: undefined,
          grid: sp.grid as Subpage['grid'],
        };
      });
    }

    return { hero, albums, subpages };
  }

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaveMessage('');
  }, []);

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveMessage('');

    // Serialize back to YAML-compatible format
    const yamlData: Record<string, unknown> = {};

    if (gallery.hero.length > 0) {
      yamlData.hero = gallery.hero;
    }
    if (gallery.albums.length > 0) {
      yamlData.albums = serializeAlbumEntries(gallery.albums);
    }
    if (gallery.subpages.length > 0) {
      yamlData.subpages = gallery.subpages.map((sp) => {
        const entry: Record<string, unknown> = { name: sp.name };
        if (sp.title) entry.title = sp.title;
        if (sp.subtitle) entry.subtitle = sp.subtitle;
        if (sp.password) entry.password = sp.password;
        if (sp.grid) entry.grid = sp.grid;

        if (sp.sections && sp.sections.length > 0) {
          entry.sections = sp.sections.map((sec) => {
            const s: Record<string, unknown> = {
              title: sec.title,
              albums: serializeAlbumEntries(sec.albums),
            };
            if (sec.description) s.description = sec.description;
            return s;
          });
          // Also include top-level albums if they exist alongside sections
          if (sp.albums.length > 0) {
            entry.albums = serializeAlbumEntries(sp.albums);
          }
        } else {
          entry.albums = serializeAlbumEntries(sp.albums);
        }

        return entry;
      });
    }

    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gallery: yamlData }),
      });

      if (res.ok) {
        const data = await res.json();
        setDirty(false);
        setSaveMessage(data.message || 'Saved successfully!');
        setTimeout(() => setSaveMessage(''), 5000);
      } else {
        const err = await res.json();
        setSaveMessage(`Error: ${err.error}`);
      }
    } catch {
      setSaveMessage('Error: Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // ── Album Picker Handlers ────────────────────────────────────
  function handlePickAlbum(albumId: string) {
    if (!pickerTarget) return;

    const entry: AlbumEntry = { id: albumId };

    if (pickerTarget.type === 'standalone') {
      setGallery((g) => ({ ...g, albums: [...g.albums, entry] }));
    } else if (pickerTarget.type === 'subpage' && pickerTarget.subpageIndex != null) {
      setGallery((g) => {
        const subpages = [...g.subpages];
        const sp = { ...subpages[pickerTarget.subpageIndex!] };
        sp.albums = [...sp.albums, entry];
        subpages[pickerTarget.subpageIndex!] = sp;
        return { ...g, subpages };
      });
    } else if (
      pickerTarget.type === 'section' &&
      pickerTarget.subpageIndex != null &&
      pickerTarget.sectionIndex != null
    ) {
      setGallery((g) => {
        const subpages = [...g.subpages];
        const sp = { ...subpages[pickerTarget.subpageIndex!] };
        const sections = [...(sp.sections || [])];
        const sec = { ...sections[pickerTarget.sectionIndex!] };
        sec.albums = [...sec.albums, entry];
        sections[pickerTarget.sectionIndex!] = sec;
        sp.sections = sections;
        subpages[pickerTarget.subpageIndex!] = sp;
        return { ...g, subpages };
      });
    }

    setPickerTarget(null);
    markDirty();
  }

  // ── Subpage Management ────────────────────────────────────────
  function addSubpage() {
    setGallery((g) => ({
      ...g,
      subpages: [
        ...g.subpages,
        { name: `New Page ${g.subpages.length + 1}`, albums: [], sections: undefined },
      ],
    }));
    markDirty();
  }

  function removeSubpage(index: number) {
    if (!confirm('Remove this subpage?')) return;
    setGallery((g) => ({
      ...g,
      subpages: g.subpages.filter((_, i) => i !== index),
    }));
    markDirty();
  }

  function updateSubpage(index: number, updates: Partial<Subpage>) {
    setGallery((g) => {
      const subpages = [...g.subpages];
      subpages[index] = { ...subpages[index], ...updates };
      return { ...g, subpages };
    });
    markDirty();
  }

  // ── Section Management ────────────────────────────────────────
  function addSection(subpageIndex: number) {
    setGallery((g) => {
      const subpages = [...g.subpages];
      const sp = { ...subpages[subpageIndex] };
      sp.sections = [...(sp.sections || []), { title: 'New Section', albums: [] }];
      subpages[subpageIndex] = sp;
      return { ...g, subpages };
    });
    markDirty();
  }

  function removeSection(subpageIndex: number, sectionIndex: number) {
    setGallery((g) => {
      const subpages = [...g.subpages];
      const sp = { ...subpages[subpageIndex] };
      sp.sections = (sp.sections || []).filter((_, i) => i !== sectionIndex);
      subpages[subpageIndex] = sp;
      return { ...g, subpages };
    });
    markDirty();
  }

  function updateSection(subpageIndex: number, sectionIndex: number, updates: Partial<Section>) {
    setGallery((g) => {
      const subpages = [...g.subpages];
      const sp = { ...subpages[subpageIndex] };
      const sections = [...(sp.sections || [])];
      sections[sectionIndex] = { ...sections[sectionIndex], ...updates };
      sp.sections = sections;
      subpages[subpageIndex] = sp;
      return { ...g, subpages };
    });
    markDirty();
  }

  // ── Album Removal ────────────────────────────────────────────
  function removeStandaloneAlbum(index: number) {
    setGallery((g) => ({
      ...g,
      albums: g.albums.filter((_, i) => i !== index),
    }));
    markDirty();
  }

  function removeSubpageAlbum(subpageIndex: number, albumIndex: number) {
    setGallery((g) => {
      const subpages = [...g.subpages];
      const sp = { ...subpages[subpageIndex] };
      sp.albums = sp.albums.filter((_, i) => i !== albumIndex);
      subpages[subpageIndex] = sp;
      return { ...g, subpages };
    });
    markDirty();
  }

  function removeSectionAlbum(subpageIndex: number, sectionIndex: number, albumIndex: number) {
    setGallery((g) => {
      const subpages = [...g.subpages];
      const sp = { ...subpages[subpageIndex] };
      const sections = [...(sp.sections || [])];
      const sec = { ...sections[sectionIndex] };
      sec.albums = sec.albums.filter((_, i) => i !== albumIndex);
      sections[sectionIndex] = sec;
      sp.sections = sections;
      subpages[subpageIndex] = sp;
      return { ...g, subpages };
    });
    markDirty();
  }

  // ── Hero Management ──────────────────────────────────────────
  function removeHero(index: number) {
    setGallery((g) => ({
      ...g,
      hero: g.hero.filter((_, i) => i !== index),
    }));
    markDirty();
  }

  function addHero() {
    const uuid = prompt('Enter Immich asset UUID for hero image:');
    if (uuid?.trim()) {
      setGallery((g) => ({ ...g, hero: [...g.hero, uuid.trim()] }));
      markDirty();
    }
  }

  // ── Move helpers ──────────────────────────────────────────────
  function moveSubpage(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= gallery.subpages.length) return;
    setGallery((g) => {
      const subpages = [...g.subpages];
      [subpages[index], subpages[newIndex]] = [subpages[newIndex], subpages[index]];
      return { ...g, subpages };
    });
    markDirty();
  }

  // ── Helpers ──────────────────────────────────────────────────
  function getAlbumName(id: string): string {
    const found = immichAlbums.find((a) => a.id === id);
    return found?.albumName || id.slice(0, 8) + '...';
  }

  function getAlbumCount(id: string): number {
    const found = immichAlbums.find((a) => a.id === id);
    return found?.assetCount || 0;
  }

  function getAlbumThumbnailId(id: string): string | null {
    const found = immichAlbums.find((a) => a.id === id);
    return found?.thumbnailAssetId || null;
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  return (
    <div className="page-builder">
      {/* Save Bar */}
      <div className={`save-bar ${dirty ? 'dirty' : ''}`}>
        <div className="save-bar-left">
          {dirty && <span className="unsaved-badge">Unsaved changes</span>}
          {saveMessage && (
            <span
              className={`save-message ${saveMessage.startsWith('Error') ? 'error' : 'success'}`}
            >
              {saveMessage}
            </span>
          )}
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Hero Section */}
      <section className="builder-section">
        <div className="builder-section-header">
          <h2>🏠 Homepage Hero</h2>
          <button className="admin-btn admin-btn-sm" onClick={addHero}>
            + Add Hero
          </button>
        </div>
        <div className="hero-list">
          {gallery.hero.length === 0 && (
            <p className="empty-hint">
              No hero images configured. Add asset UUIDs to show a hero carousel.
            </p>
          )}
          {gallery.hero.map((id, i) => (
            <div key={i} className="hero-item">
              <img
                className="hero-item-thumb"
                src={`/api/admin/thumbnail/${id}`}
                alt=""
                loading="lazy"
              />
              <span className="hero-uuid" title={id}>
                {id.slice(0, 8)}...{id.slice(-4)}
              </span>
              <button className="admin-btn-icon" onClick={() => removeHero(i)} title="Remove">
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Standalone Albums */}
      <section className="builder-section">
        <div className="builder-section-header">
          <h2>📷 Standalone Albums</h2>
          <button
            className="admin-btn admin-btn-sm"
            onClick={() => setPickerTarget({ type: 'standalone' })}
          >
            + Add Album
          </button>
        </div>
        <div className="album-list">
          {gallery.albums.length === 0 && (
            <p className="empty-hint">No standalone albums. These show directly on the homepage.</p>
          )}
          {gallery.albums.map((album, i) => (
            <AlbumCard
              key={`${album.id}-${i}`}
              album={album}
              name={getAlbumName(album.id)}
              count={getAlbumCount(album.id)}
              thumbnailId={getAlbumThumbnailId(album.id)}
              onRemove={() => removeStandaloneAlbum(i)}
              onUpdate={(updates) => {
                setGallery((g) => {
                  const albums = [...g.albums];
                  albums[i] = { ...albums[i], ...updates };
                  return { ...g, albums };
                });
                markDirty();
              }}
            />
          ))}
        </div>
      </section>

      {/* Subpages */}
      <section className="builder-section">
        <div className="builder-section-header">
          <h2>📂 Subpages</h2>
          <button className="admin-btn admin-btn-sm" onClick={addSubpage}>
            + New Subpage
          </button>
        </div>

        {gallery.subpages.length === 0 && (
          <p className="empty-hint">
            No subpages. Create one to group albums under a custom URL path.
          </p>
        )}

        {gallery.subpages.map((sp, spIndex) => (
          <div key={spIndex} className="subpage-card">
            <div className="subpage-header">
              <div className="subpage-header-left">
                <div className="subpage-move-btns">
                  <button
                    className="admin-btn-icon"
                    onClick={() => moveSubpage(spIndex, -1)}
                    disabled={spIndex === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="admin-btn-icon"
                    onClick={() => moveSubpage(spIndex, 1)}
                    disabled={spIndex === gallery.subpages.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                <input
                  className="subpage-name-input"
                  value={sp.name}
                  onChange={(e) => updateSubpage(spIndex, { name: e.target.value })}
                  placeholder="Page name (used for URL)"
                />
              </div>
              <div className="subpage-header-right">
                <button
                  className="admin-btn-icon"
                  onClick={() => removeSubpage(spIndex)}
                  title="Delete subpage"
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Subpage metadata */}
            <div className="subpage-meta">
              <div className="admin-field-row">
                <div className="admin-field">
                  <label>Title (optional)</label>
                  <input
                    value={sp.title || ''}
                    onChange={(e) => updateSubpage(spIndex, { title: e.target.value || undefined })}
                    placeholder="Display title (defaults to name)"
                  />
                </div>
                <div className="admin-field">
                  <label>Subtitle</label>
                  <input
                    value={sp.subtitle || ''}
                    onChange={(e) =>
                      updateSubpage(spIndex, { subtitle: e.target.value || undefined })
                    }
                    placeholder="Subtitle text"
                  />
                </div>
              </div>
              <div className="admin-field-row">
                <div className="admin-field">
                  <label>Password (optional)</label>
                  <input
                    type="password"
                    value={sp.password || ''}
                    onChange={(e) =>
                      updateSubpage(spIndex, { password: e.target.value || undefined })
                    }
                    placeholder="Leave empty for public"
                  />
                </div>
              </div>
            </div>

            {/* Albums (if no sections) */}
            {(!sp.sections || sp.sections.length === 0) && (
              <div className="subpage-albums">
                <div className="subpage-albums-header">
                  <span>Albums</span>
                  <button
                    className="admin-btn admin-btn-xs"
                    onClick={() => setPickerTarget({ type: 'subpage', subpageIndex: spIndex })}
                  >
                    + Add
                  </button>
                </div>
                <div className="album-list">
                  {sp.albums.map((album, aIndex) => (
                    <AlbumCard
                      key={`${album.id}-${aIndex}`}
                      album={album}
                      name={getAlbumName(album.id)}
                      count={getAlbumCount(album.id)}
                      thumbnailId={getAlbumThumbnailId(album.id)}
                      onRemove={() => removeSubpageAlbum(spIndex, aIndex)}
                      onUpdate={(updates) => {
                        setGallery((g) => {
                          const subpages = [...g.subpages];
                          const sp2 = { ...subpages[spIndex] };
                          const albums = [...sp2.albums];
                          albums[aIndex] = { ...albums[aIndex], ...updates };
                          sp2.albums = albums;
                          subpages[spIndex] = sp2;
                          return { ...g, subpages };
                        });
                        markDirty();
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sections */}
            {sp.sections && sp.sections.length > 0 && (
              <div className="subpage-sections">
                {sp.sections.map((sec, secIndex) => (
                  <div key={secIndex} className="section-card">
                    <div className="section-header">
                      <input
                        className="section-title-input"
                        value={sec.title}
                        onChange={(e) =>
                          updateSection(spIndex, secIndex, { title: e.target.value })
                        }
                        placeholder="Section title"
                      />
                      <button
                        className="admin-btn-icon"
                        onClick={() => removeSection(spIndex, secIndex)}
                        title="Remove section"
                      >
                        ×
                      </button>
                    </div>
                    <div className="admin-field">
                      <input
                        value={sec.description || ''}
                        onChange={(e) =>
                          updateSection(spIndex, secIndex, {
                            description: e.target.value || undefined,
                          })
                        }
                        placeholder="Section description (optional)"
                        className="section-desc-input"
                      />
                    </div>
                    <div className="album-list">
                      {sec.albums.map((album, aIndex) => (
                        <AlbumCard
                          key={`${album.id}-${aIndex}`}
                          album={album}
                          name={getAlbumName(album.id)}
                          count={getAlbumCount(album.id)}
                          thumbnailId={getAlbumThumbnailId(album.id)}
                          onRemove={() => removeSectionAlbum(spIndex, secIndex, aIndex)}
                          onUpdate={(updates) => {
                            setGallery((g) => {
                              const subpages = [...g.subpages];
                              const sp2 = { ...subpages[spIndex] };
                              const sections = [...(sp2.sections || [])];
                              const sec2 = { ...sections[secIndex] };
                              const albums = [...sec2.albums];
                              albums[aIndex] = { ...albums[aIndex], ...updates };
                              sec2.albums = albums;
                              sections[secIndex] = sec2;
                              sp2.sections = sections;
                              subpages[spIndex] = sp2;
                              return { ...g, subpages };
                            });
                            markDirty();
                          }}
                        />
                      ))}
                    </div>
                    <button
                      className="admin-btn admin-btn-xs"
                      onClick={() =>
                        setPickerTarget({
                          type: 'section',
                          subpageIndex: spIndex,
                          sectionIndex: secIndex,
                        })
                      }
                    >
                      + Add Album
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="subpage-actions">
              <button className="admin-btn admin-btn-xs" onClick={() => addSection(spIndex)}>
                + Add Section
              </button>
              {sp.sections && sp.sections.length > 0 && (
                <button
                  className="admin-btn admin-btn-xs"
                  onClick={() => setPickerTarget({ type: 'subpage', subpageIndex: spIndex })}
                >
                  + Add Album (outside sections)
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Album Picker Modal */}
      {pickerTarget && (
        <AlbumPicker
          albums={immichAlbums}
          onSelect={handlePickAlbum}
          onClose={() => setPickerTarget(null)}
          usedAlbumIds={getAllUsedAlbumIds()}
        />
      )}
    </div>
  );

  function getAllUsedAlbumIds(): Set<string> {
    const ids = new Set<string>();
    gallery.albums.forEach((a) => ids.add(a.id));
    gallery.subpages.forEach((sp) => {
      sp.albums.forEach((a) => ids.add(a.id));
      sp.sections?.forEach((sec) => sec.albums.forEach((a) => ids.add(a.id)));
    });
    return ids;
  }
}

// ── Album Card Sub-component ───────────────────────────────────

interface AlbumCardProps {
  album: AlbumEntry;
  name: string;
  count: number;
  thumbnailId: string | null;
  onRemove: () => void;
  onUpdate: (updates: Partial<AlbumEntry>) => void;
}

function AlbumCard({ album, name, count, thumbnailId, onRemove, onUpdate }: AlbumCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="album-card">
      <div className="album-card-main">
        {thumbnailId && (
          <div className="album-card-thumb">
            <img
              src={`/api/admin/thumbnail/${thumbnailId}`}
              alt=""
              loading="lazy"
            />
          </div>
        )}
        <div className="album-card-info">
          <span className="album-card-name">{album.title || name}</span>
          <span className="album-card-count">{count} photos</span>
        </div>
        <div className="album-card-actions">
          <button
            className="admin-btn-icon"
            onClick={() => setExpanded(!expanded)}
            title="Edit details"
          >
            ✏️
          </button>
          <button className="admin-btn-icon" onClick={onRemove} title="Remove">
            ×
          </button>
        </div>
      </div>
      {expanded && (
        <div className="album-card-details">
          <div className="admin-field">
            <label>Title override</label>
            <input
              value={album.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value || undefined })}
              placeholder={name}
            />
          </div>
          <div className="admin-field">
            <label>Description</label>
            <input
              value={album.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value || undefined })}
              placeholder="Optional description"
            />
          </div>
          <div className="admin-field">
            <label>Password</label>
            <input
              type="password"
              value={album.password || ''}
              onChange={(e) => onUpdate({ password: e.target.value || undefined })}
              placeholder="Leave empty for public"
            />
          </div>
          <div className="album-card-uuid">
            <code>{album.id}</code>
          </div>
        </div>
      )}
    </div>
  );
}
