'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const THEME_PRESETS = [
  { id: 'studio', label: 'Studio', desc: 'Bold red accent', dot: '#e60012' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean & neutral', dot: '#111111' },
  { id: 'editorial', label: 'Editorial', desc: 'Magazine feel', dot: '#d4a373' },
  { id: 'classic', label: 'Classic', desc: 'Timeless serif', dot: '#8b4513' },
  { id: 'noir', label: 'Noir', desc: 'Dark & moody', dot: '#c0c0c0' },
  { id: 'monograph', label: 'Monograph', desc: 'Single hue', dot: '#2c2c2c' },
] as const;

const LAYOUTS = [
  { id: 'masonry', label: 'Masonry' },
  { id: 'uniform', label: 'Uniform' },
  { id: 'showcase', label: 'Showcase' },
  { id: 'filmstrip', label: 'Filmstrip' },
  { id: 'editorial-flow', label: 'Editorial' },
] as const;

const PHOTO_FRAMES = [
  { id: 'none', label: 'None' },
  { id: 'passepartout', label: 'Border' },
  { id: 'shadow', label: 'Shadow' },
] as const;

const HERO_STYLES = [
  { id: 'split', label: 'Split' },
  { id: 'fullbleed', label: 'Fullbleed' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'stacked', label: 'Stacked' },
  { id: 'typographic', label: 'Typographic' },
  { id: 'mosaic', label: 'Mosaic' },
] as const;

const ASPECT_RATIOS = [
  { id: '1', label: '1:1' },
  { id: '4/5', label: '4:5' },
  { id: '2/3', label: '2:3' },
  { id: '3/2', label: '3:2' },
  { id: '16/9', label: '16:9' },
] as const;

const STEPS = ['Connection', 'Site', 'Theme', 'Grid', 'Footer', 'Security'] as const;

interface AlbumOverride {
  uuid: string;
  titleOverride: string;
  description: string;
  password: string;
  heroImage: string;
}

interface SubpageSectionForm {
  title: string;
  description: string;
  albumUuids: string;
}

interface SubpageForm {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  password: string;
  gridColumns: number;
  gridGap: number;
  gridAspectRatio: string;
  gridLayout: string;
  albumUuids: string;
  sections: SubpageSectionForm[];
}

interface FormData {
  immichApiUrl: string;
  immichApiKey: string;
  siteTitle: string;
  siteSubtitle: string;
  lang: string;
  seoTitle: string;
  seoDescription: string;
  noIndex: boolean;
  noFollow: boolean;
  exifOnHover: boolean;
  mapEnabled: boolean;
  transitions: boolean;
  themePreset: string;
  accentColor: string;
  photoFrame: string;
  heroStyle: string;
  grain: boolean;
  headerDot: boolean;
  themeFontHeading: string;
  themeFontBody: string;
  themeFontCaption: string;
  themeRadius: number;
  gridLayout: string;
  gridColumns: number;
  gridGap: number;
  gridAspectRatio: string;
  footerName: string;
  footerInstagram: string;
  footerEmail: string;
  footerWebsite: string;
  legalEnabled: boolean;
  legalName: string;
  legalAddress: string;
  legalZipCity: string;
  legalCountry: string;
  legalEmail: string;
  legalPhone: string;
  legalTaxId: string;
  legalVatId: string;
  legalExtraInfo: string;
  aboutPortrait: string;
  aboutName: string;
  aboutLocation: string;
  aboutGear: string;
  aboutBio: string;
  heroImages: string;
  albumIds: string;
  albumOverridesJson: string;
  subpagesJson: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  authSecret: string;
  cacheTtl: number;
  rateLimitRpm: number;
  trustedProxies: string;
  webhookSecret: string;
}

const INITIAL_DATA: FormData = {
  immichApiUrl: '',
  immichApiKey: '',
  siteTitle: 'My Portfolio',
  siteSubtitle: 'A visual journal',
  lang: 'en',
  seoTitle: '',
  seoDescription: '',
  noIndex: false,
  noFollow: false,
  exifOnHover: true,
  mapEnabled: false,
  transitions: true,
  themePreset: 'studio',
  accentColor: '#e60012',
  photoFrame: 'passepartout',
  heroStyle: 'split',
  grain: true,
  headerDot: true,
  themeFontHeading: '',
  themeFontBody: '',
  themeFontCaption: '',
  themeRadius: 0,
  gridLayout: 'masonry',
  gridColumns: 3,
  gridGap: 12,
  gridAspectRatio: '1',
  footerName: '',
  footerInstagram: '',
  footerEmail: '',
  footerWebsite: '',
  legalEnabled: false,
  legalName: '',
  legalAddress: '',
  legalZipCity: '',
  legalCountry: '',
  legalEmail: '',
  legalPhone: '',
  legalTaxId: '',
  legalVatId: '',
  legalExtraInfo: '',
  aboutPortrait: '',
  aboutName: '',
  aboutLocation: '',
  aboutGear: '',
  aboutBio: '',
  heroImages: '',
  albumIds: '',
  albumOverridesJson: '{}',
  subpagesJson: '[]',
  adminPassword: '',
  adminPasswordConfirm: '',
  authSecret: '',
  cacheTtl: 300,
  rateLimitRpm: 120,
  trustedProxies: '',
  webhookSecret: '',
};

export default function InstallPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/install')
      .then((r) => r.json())
      .then((data) => {
        if (!data.needsSetup) router.replace('/');
      })
      .catch(() => {});
  }, [router]);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(INITIAL_DATA);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [installResult, setInstallResult] = useState<{
    success: boolean;
    message: string;
    envFile?: string;
    note?: string;
  } | null>(null);

  const update = useCallback((field: keyof FormData, value: string | boolean | number) => {
    setData((d) => ({ ...d, [field]: value }));
  }, []);

  const canProceed = useCallback(() => {
    if (step === 0) {
      return data.immichApiUrl.trim().length > 0 && data.immichApiKey.trim().length > 0;
    }
    if (step === 5) {
      if (data.adminPassword && data.adminPassword !== data.adminPasswordConfirm) {
        return false;
      }
    }
    return true;
  }, [step, data]);

  async function testConnection() {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const res = await fetch('/api/install/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.immichApiUrl, apiKey: data.immichApiKey }),
      });
      const result = await res.json();
      if (result.success) {
        setConnectionStatus({
          type: 'success',
          message: `Connected — ${result.albumCount} album(s) found`,
        });
      } else {
        setConnectionStatus({ type: 'error', message: result.error || 'Connection failed' });
      }
    } catch {
      setConnectionStatus({ type: 'error', message: 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  }

  async function handleInstall() {
    setInstalling(true);
    setInstallError('');
    try {
      const res = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setInstallResult(result);
      } else {
        setInstallError(result.error || 'Installation failed');
      }
    } catch {
      setInstallError('Failed to save configuration');
    } finally {
      setInstalling(false);
    }
  }

  if (installResult?.success) {
    return (
      <div className="install-layout">
        <div className="install-container">
          <div className="install-success">
            <div className="install-success-icon">&#10003;</div>
            <h2>Configuration Complete</h2>
            <p>
              {installResult.message}
              <br />
              {installResult.note}
            </p>
            <div className="install-success-actions">
              <Link href="/" className="install-btn install-btn-primary">
                Go to Gallery
              </Link>
              <Link href="/admin" className="install-btn install-btn-ghost">
                Open Admin Panel
              </Link>
            </div>
            {installResult.envFile && (
              <details style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: 'var(--install-text-dim)',
                  }}
                >
                  Environment variables (manual setup)
                </summary>
                <pre
                  style={{
                    marginTop: '0.75rem',
                    padding: '1rem',
                    background: 'var(--install-bg)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {installResult.envFile}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="install-layout">
      <div className="install-container">
        <div className="install-header">
          <h1>Immich Folio</h1>
          <p>Set up your photography portfolio</p>
        </div>

        <div className="install-steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`install-step-label${i === step ? ' active' : ''}`}>
              <span className="step-num">{i + 1}</span>
              {label}
            </div>
          ))}
        </div>

        <div className="install-card">
          {step === 0 && (
            <ConnectionStep
              data={data}
              update={update}
              connectionStatus={connectionStatus}
              testConnection={testConnection}
              testing={testing}
            />
          )}
          {step === 1 && <SiteStep data={data} update={update} />}
          {step === 2 && <ThemeStep data={data} update={update} />}
          {step === 3 && <GridStep data={data} update={update} />}
          {step === 4 && <FooterStep data={data} update={update} />}
          {step === 5 && <SecurityStep data={data} update={update} installError={installError} />}
        </div>

        <div className="install-nav">
          <button
            className="install-btn install-btn-ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            Back
          </button>
          <div className="install-nav-right">
            {step < 5 ? (
              <button
                className="install-btn install-btn-primary"
                onClick={() => setStep(Math.min(5, step + 1))}
                disabled={!canProceed()}
              >
                Continue
              </button>
            ) : (
              <button
                className="install-btn install-btn-primary"
                onClick={handleInstall}
                disabled={installing || !canProceed()}
              >
                {installing ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Connection ────────────────────────────────── */

function ConnectionStep({
  data,
  update,
  connectionStatus,
  testConnection,
  testing,
}: {
  data: FormData;
  update: (f: keyof FormData, v: string | boolean | number) => void;
  connectionStatus: { type: string; message: string } | null;
  testConnection: () => void;
  testing: boolean;
}) {
  return (
    <>
      <h2>Immich Connection</h2>
      <p className="install-desc">
        Connect to your Immich server. This is required for the gallery to work.
      </p>

      <div className="install-field">
        <label>Immich Server URL</label>
        <input
          type="url"
          value={data.immichApiUrl}
          onChange={(e) => update('immichApiUrl', e.target.value)}
          placeholder="http://your-immich-server:2283"
        />
        <div className="install-hint">Include the port if needed, without trailing /api</div>
      </div>

      <div className="install-field">
        <label>API Key</label>
        <input
          type="password"
          value={data.immichApiKey}
          onChange={(e) => update('immichApiKey', e.target.value)}
          placeholder="Your Immich API key"
        />
      </div>

      <div className="install-test-row">
        <button
          className="install-btn install-btn-ghost"
          onClick={testConnection}
          disabled={testing}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        {connectionStatus && (
          <div className={`install-test-status ${connectionStatus.type}`}>
            {connectionStatus.message}
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>Advanced</h2>

      <div className="install-field">
        <label>Trusted Proxies</label>
        <input
          value={data.trustedProxies}
          onChange={(e) => update('trustedProxies', e.target.value)}
          placeholder="10.0.0.1, 192.168.1.100"
        />
        <div className="install-hint">
          Comma-separated IPs trusted for X-Forwarded-For (e.g., behind Nginx/Traefik)
        </div>
      </div>

      <div className="install-field">
        <label>Webhook Secret</label>
        <input
          type="password"
          value={data.webhookSecret}
          onChange={(e) => update('webhookSecret', e.target.value)}
          placeholder="Optional: HMAC secret for Immich webhook"
        />
        <div className="install-hint">
          Enables automatic cache invalidation when Immich albums change
        </div>
      </div>
    </>
  );
}

/* ── Step 2: Site ──────────────────────────────────────── */

function SiteStep({
  data,
  update,
}: {
  data: FormData;
  update: (f: keyof FormData, v: string | boolean | number) => void;
}) {
  return (
    <>
      <h2>Site Identity</h2>
      <p className="install-desc">Configure your portfolio name and SEO settings.</p>

      <div className="install-field-row">
        <div className="install-field">
          <label>Site Title</label>
          <input
            value={data.siteTitle}
            onChange={(e) => update('siteTitle', e.target.value)}
            placeholder="My Portfolio"
          />
        </div>
        <div className="install-field">
          <label>Language</label>
          <select value={data.lang} onChange={(e) => update('lang', e.target.value)}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      <div className="install-field">
        <label>Subtitle</label>
        <input
          value={data.siteSubtitle}
          onChange={(e) => update('siteSubtitle', e.target.value)}
          placeholder="A visual journal"
        />
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>SEO</h2>
      <div className="install-field-row">
        <div className="install-field">
          <label>SEO Title</label>
          <input
            value={data.seoTitle}
            onChange={(e) => update('seoTitle', e.target.value)}
            placeholder="Overrides site title"
          />
        </div>
        <div className="install-field">
          <label>Description</label>
          <input
            value={data.seoDescription}
            onChange={(e) => update('seoDescription', e.target.value)}
            placeholder="Meta description"
          />
        </div>
      </div>

      <div className="install-check">
        <input
          type="checkbox"
          id="noIndex"
          checked={data.noIndex}
          onChange={(e) => update('noIndex', e.target.checked)}
        />
        <label htmlFor="noIndex">Block search indexing (noIndex)</label>
      </div>

      <div className="install-check">
        <input
          type="checkbox"
          id="noFollow"
          checked={data.noFollow}
          onChange={(e) => update('noFollow', e.target.checked)}
        />
        <label htmlFor="noFollow">Block link following (noFollow)</label>
      </div>

      <div className="install-check">
        <input
          type="checkbox"
          id="transitions"
          checked={data.transitions}
          onChange={(e) => update('transitions', e.target.checked)}
        />
        <label htmlFor="transitions">Enable page transitions</label>
      </div>

      <div className="install-check">
        <input
          type="checkbox"
          id="exifOnHover"
          checked={data.exifOnHover}
          onChange={(e) => update('exifOnHover', e.target.checked)}
        />
        <label htmlFor="exifOnHover">Show EXIF data on hover</label>
      </div>

      <div className="install-check">
        <input
          type="checkbox"
          id="mapEnabled"
          checked={data.mapEnabled}
          onChange={(e) => update('mapEnabled', e.target.checked)}
        />
        <label htmlFor="mapEnabled">Enable map view</label>
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>About Page</h2>
      <div className="install-field">
        <label>Portrait Asset UUID</label>
        <input
          value={data.aboutPortrait}
          onChange={(e) => update('aboutPortrait', e.target.value)}
          placeholder="Immich asset UUID"
        />
      </div>
      <div className="install-field-row">
        <div className="install-field">
          <label>Name</label>
          <input
            value={data.aboutName}
            onChange={(e) => update('aboutName', e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="install-field">
          <label>Location</label>
          <input
            value={data.aboutLocation}
            onChange={(e) => update('aboutLocation', e.target.value)}
            placeholder="City, Country"
          />
        </div>
      </div>
      <div className="install-field">
        <label>Gear (one per line)</label>
        <textarea
          value={data.aboutGear}
          onChange={(e) => update('aboutGear', e.target.value)}
          placeholder="Leica Q3&#10;Summilux 35mm"
        />
      </div>
      <div className="install-field">
        <label>Bio</label>
        <textarea
          value={data.aboutBio}
          onChange={(e) => update('aboutBio', e.target.value)}
          placeholder="Photographer based in..."
        />
      </div>
    </>
  );
}

/* ── Step 3: Theme ─────────────────────────────────────── */

function ThemeStep({
  data,
  update,
}: {
  data: FormData;
  update: (f: keyof FormData, v: string | boolean | number) => void;
}) {
  return (
    <>
      <h2>Theme</h2>
      <p className="install-desc">Choose a preset and customize the look.</p>

      <label
        style={{
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'var(--install-text-dim)',
          marginBottom: '0.5rem',
          display: 'block',
        }}
      >
        Theme Preset
      </label>
      <div className="install-presets">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.id}
            className={`install-preset${data.themePreset === p.id ? ' selected' : ''}`}
            onClick={() => update('themePreset', p.id)}
          >
            <span className="preset-dot" style={{ backgroundColor: p.dot }} />
            <span className="preset-label">{p.label}</span>
            <span className="preset-desc">{p.desc}</span>
          </button>
        ))}
      </div>

      <div className="install-field">
        <label>Accent Color</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="color"
            value={data.accentColor}
            onChange={(e) => update('accentColor', e.target.value)}
            style={{
              width: '40px',
              height: '40px',
              padding: '2px',
              border: '1px solid var(--install-border)',
              borderRadius: '4px',
              background: 'none',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--install-text-dim)' }}>
            {data.accentColor}
          </span>
        </div>
      </div>

      <div className="install-field">
        <label>Photo Frame</label>
        <div className="install-presets" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {PHOTO_FRAMES.map((f) => (
            <button
              key={f.id}
              className={`install-preset${data.photoFrame === f.id ? ' selected' : ''}`}
              onClick={() => update('photoFrame', f.id)}
            >
              <span className="preset-label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="install-field">
        <label>Hero Style</label>
        <div className="install-presets" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {HERO_STYLES.map((h) => (
            <button
              key={h.id}
              className={`install-preset${data.heroStyle === h.id ? ' selected' : ''}`}
              onClick={() => update('heroStyle', h.id)}
            >
              <span className="preset-label">{h.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="install-check">
        <input
          type="checkbox"
          id="grain"
          checked={data.grain}
          onChange={(e) => update('grain', e.target.checked)}
        />
        <label htmlFor="grain">Film grain overlay</label>
      </div>

      <div className="install-check">
        <input
          type="checkbox"
          id="headerDot"
          checked={data.headerDot}
          onChange={(e) => update('headerDot', e.target.checked)}
        />
        <label htmlFor="headerDot">Navigation dot indicator</label>
      </div>

      <h2 style={{ fontSize: '1rem', marginTop: '1.5rem' }}>Font Overrides</h2>
      <p className="install-desc">Leave empty to use preset defaults.</p>
      <div className="install-field-row">
        <div className="install-field">
          <label>Heading Font</label>
          <input
            value={data.themeFontHeading}
            onChange={(e) => update('themeFontHeading', e.target.value)}
            placeholder="e.g. Playfair Display"
          />
        </div>
        <div className="install-field">
          <label>Body Font</label>
          <input
            value={data.themeFontBody}
            onChange={(e) => update('themeFontBody', e.target.value)}
            placeholder="e.g. DM Sans"
          />
        </div>
        <div className="install-field">
          <label>Caption Font</label>
          <input
            value={data.themeFontCaption}
            onChange={(e) => update('themeFontCaption', e.target.value)}
            placeholder="e.g. EB Garamond"
          />
        </div>
      </div>

      <div className="install-field">
        <label>Border Radius (px)</label>
        <input
          type="number"
          min={0}
          max={24}
          value={data.themeRadius}
          onChange={(e) => update('themeRadius', parseInt(e.target.value, 10) || 0)}
        />
        <div className="install-hint">Leave 0 for preset default</div>
      </div>
    </>
  );
}

/* ── Step 4: Grid + Albums + Subpages ──────────────────── */

function GridStep({
  data,
  update,
}: {
  data: FormData;
  update: (f: keyof FormData, v: string | boolean | number) => void;
}) {
  /* ── Album overrides state ─────────────────────────── */
  const [overrides, setOverrides] = useState<Record<string, AlbumOverride>>(() => {
    try {
      return JSON.parse(data.albumOverridesJson);
    } catch {
      return {};
    }
  });

  function updateOverride(uuid: string, field: keyof AlbumOverride, value: string) {
    const next = { ...overrides };
    if (!next[uuid]) next[uuid] = { uuid, titleOverride: '', description: '', password: '', heroImage: '' };
    next[uuid] = { ...next[uuid], [field]: value };
    setOverrides(next);
    update('albumOverridesJson', JSON.stringify(next));
  }

  function removeOverride(uuid: string) {
    const next = { ...overrides };
    delete next[uuid];
    setOverrides(next);
    update('albumOverridesJson', JSON.stringify(next));
  }

  const albumUuidList = data.albumIds.split(',').map((s) => s.trim()).filter(Boolean);

  /* ── Subpages state ────────────────────────────────── */
  const [subpages, setSubpages] = useState<SubpageForm[]>(() => {
    try {
      return JSON.parse(data.subpagesJson);
    } catch {
      return [];
    }
  });

  function serializeSubpages(sp: SubpageForm[]) {
    setSubpages(sp);
    update('subpagesJson', JSON.stringify(sp));
  }

  function addSubpage() {
    serializeSubpages([
      ...subpages,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        name: '',
        title: '',
        subtitle: '',
        password: '',
        gridColumns: 3,
        gridGap: 12,
        gridAspectRatio: '1',
        gridLayout: 'masonry',
        albumUuids: '',
        sections: [],
      },
    ]);
  }

  function updateSubpage(id: string, field: keyof SubpageForm, value: string | number | SubpageSectionForm[]) {
    serializeSubpages(
      subpages.map((sp) => (sp.id === id ? { ...sp, [field]: value } : sp)),
    );
  }

  function removeSubpage(id: string) {
    serializeSubpages(subpages.filter((sp) => sp.id !== id));
  }

  function addSection(subpageId: string) {
    const section: SubpageSectionForm = { title: '', description: '', albumUuids: '' };
    const sp = subpages.find((s) => s.id === subpageId);
    if (sp) updateSubpage(subpageId, 'sections', [...sp.sections, section]);
  }

  function updateSection(subpageId: string, idx: number, field: keyof SubpageSectionForm, value: string) {
    const sp = subpages.find((s) => s.id === subpageId);
    if (!sp) return;
    const sections = [...sp.sections];
    sections[idx] = { ...sections[idx], [field]: value };
    updateSubpage(subpageId, 'sections', sections);
  }

  function removeSection(subpageId: string, idx: number) {
    const sp = subpages.find((s) => s.id === subpageId);
    if (!sp) return;
    updateSubpage(subpageId, 'sections', sp.sections.filter((_, i) => i !== idx));
  }

  return (
    <>
      <h2>Grid Layout</h2>
      <p className="install-desc">Configure how your photos are displayed.</p>

      <label
        style={{
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'var(--install-text-dim)',
          marginBottom: '0.5rem',
          display: 'block',
        }}
      >
        Layout Style
      </label>
      <div className="install-layouts">
        {LAYOUTS.map((l) => (
          <button
            key={l.id}
            className={`install-layout-btn${data.gridLayout === l.id ? ' selected' : ''}`}
            onClick={() => update('gridLayout', l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="install-field-row">
        <div className="install-field">
          <label>Columns</label>
          <input
            type="number"
            min={1}
            max={8}
            value={data.gridColumns}
            onChange={(e) => update('gridColumns', parseInt(e.target.value, 10) || 3)}
          />
        </div>
        <div className="install-field">
          <label>Gap (px)</label>
          <input
            type="number"
            min={0}
            max={48}
            value={data.gridGap}
            onChange={(e) => update('gridGap', parseInt(e.target.value, 10) || 12)}
          />
        </div>
      </div>

      <label
        style={{
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'var(--install-text-dim)',
          marginBottom: '0.5rem',
          display: 'block',
        }}
      >
        Aspect Ratio
      </label>
      <div className="install-presets" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {ASPECT_RATIOS.map((r) => (
          <button
            key={r.id}
            className={`install-preset${data.gridAspectRatio === r.id ? ' selected' : ''}`}
            onClick={() => update('gridAspectRatio', r.id)}
          >
            <span className="preset-label">{r.label}</span>
          </button>
        ))}
      </div>

      {/* ── Standalone Albums ──────────────────────────── */}
      <h2 style={{ marginTop: '1.5rem' }}>Standalone Albums</h2>
      <p className="install-desc">
        Albums shown directly on the homepage. Add subpages below to group albums.
      </p>

      <div className="install-field">
        <label>Album UUIDs (comma-separated)</label>
        <textarea
          value={data.albumIds}
          onChange={(e) => update('albumIds', e.target.value)}
          placeholder="album-uuid-1, album-uuid-2"
          style={{ minHeight: '60px' }}
        />
      </div>

      {/* ── Per-album overrides ────────────────────────── */}
      {albumUuidList.length > 0 && (
        <details className="install-details">
          <summary className="install-details-summary">
            Per-Album Overrides ({Object.keys(overrides).length} configured)
          </summary>
          <div className="install-details-body">
            {albumUuidList.map((uuid) => {
              const ov = overrides[uuid] || { uuid, titleOverride: '', description: '', password: '', heroImage: '' };
              return (
                <div key={uuid} className="install-override-row">
                  <div className="install-override-header">
                    <code className="install-override-uuid">{uuid}</code>
                    {overrides[uuid] && (
                      <button className="install-btn-small install-btn-danger" onClick={() => removeOverride(uuid)}>
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="install-field-row">
                    <div className="install-field">
                      <label>Title Override</label>
                      <input
                        value={ov.titleOverride}
                        onChange={(e) => updateOverride(uuid, 'titleOverride', e.target.value)}
                        placeholder="Custom title"
                      />
                    </div>
                    <div className="install-field">
                      <label>Description</label>
                      <input
                        value={ov.description}
                        onChange={(e) => updateOverride(uuid, 'description', e.target.value)}
                        placeholder="Album description"
                      />
                    </div>
                  </div>
                  <div className="install-field-row">
                    <div className="install-field">
                      <label>Password</label>
                      <input
                        type="password"
                        value={ov.password}
                        onChange={(e) => updateOverride(uuid, 'password', e.target.value)}
                        placeholder="Optional password"
                      />
                    </div>
                    <div className="install-field">
                      <label>Hero Image UUID</label>
                      <input
                        value={ov.heroImage}
                        onChange={(e) => updateOverride(uuid, 'heroImage', e.target.value)}
                        placeholder="Asset UUID"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="install-field">
        <label>Hero Image Asset UUIDs (comma-separated)</label>
        <input
          value={data.heroImages}
          onChange={(e) => update('heroImages', e.target.value)}
          placeholder="asset-uuid-1, asset-uuid-2"
        />
        <div className="install-hint">Displayed in the homepage hero carousel</div>
      </div>

      {/* ── Subpage Builder ────────────────────────────── */}
      <h2 style={{ marginTop: '1.5rem' }}>Subpages</h2>
      <p className="install-desc">
        Subpages group albums under custom URL paths (e.g. /travel/japan).
      </p>

      {subpages.length > 0 && (
        <div className="install-subpages">
          {subpages.map((sp, idx) => (
            <div key={sp.id} className="install-subpage-card">
              <div className="install-subpage-header">
                <span className="install-subpage-num">Subpage {idx + 1}</span>
                <button
                  className="install-btn-small install-btn-danger"
                  onClick={() => removeSubpage(sp.id)}
                >
                  Remove
                </button>
              </div>

              <div className="install-field-row">
                <div className="install-field" style={{ flex: 2 }}>
                  <label>Name *</label>
                  <input
                    value={sp.name}
                    onChange={(e) => updateSubpage(sp.id, 'name', e.target.value)}
                    placeholder="e.g. Japan"
                  />
                  <div className="install-hint">Used as URL slug and navigation label</div>
                </div>
                <div className="install-field">
                  <label>Title</label>
                  <input
                    value={sp.title}
                    onChange={(e) => updateSubpage(sp.id, 'title', e.target.value)}
                    placeholder="Optional display title"
                  />
                </div>
                <div className="install-field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={sp.password}
                    onChange={(e) => updateSubpage(sp.id, 'password', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="install-field">
                <label>Subtitle</label>
                <input
                  value={sp.subtitle}
                  onChange={(e) => updateSubpage(sp.id, 'subtitle', e.target.value)}
                  placeholder="A collection of highlights"
                />
              </div>

              <details className="install-details" style={{ marginBottom: '0.75rem' }}>
                <summary className="install-details-summary">Grid Overrides (optional)</summary>
                <div className="install-details-body">
                  <div className="install-field-row">
                    <div className="install-field">
                      <label>Columns</label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={sp.gridColumns}
                        onChange={(e) =>
                          updateSubpage(sp.id, 'gridColumns', parseInt(e.target.value, 10) || 3)
                        }
                      />
                    </div>
                    <div className="install-field">
                      <label>Gap (px)</label>
                      <input
                        type="number"
                        min={0}
                        max={48}
                        value={sp.gridGap}
                        onChange={(e) =>
                          updateSubpage(sp.id, 'gridGap', parseInt(e.target.value, 10) || 12)
                        }
                      />
                    </div>
                    <div className="install-field">
                      <label>Aspect Ratio</label>
                      <select
                        value={sp.gridAspectRatio}
                        onChange={(e) => updateSubpage(sp.id, 'gridAspectRatio', e.target.value)}
                      >
                        {ASPECT_RATIOS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="install-field">
                      <label>Layout</label>
                      <select
                        value={sp.gridLayout}
                        onChange={(e) => updateSubpage(sp.id, 'gridLayout', e.target.value)}
                      >
                        {LAYOUTS.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </details>

              <div className="install-field">
                <label>Album UUIDs</label>
                <textarea
                  value={sp.albumUuids}
                  onChange={(e) => updateSubpage(sp.id, 'albumUuids', e.target.value)}
                  placeholder="album-uuid-1, album-uuid-2"
                  style={{ minHeight: '40px' }}
                />
              </div>

              {/* ── Sections ──────────────────────────────── */}
              <details className="install-details">
                <summary className="install-details-summary">
                  Sections ({sp.sections.length})
                </summary>
                <div className="install-details-body">
                  {sp.sections.map((sec, si) => (
                    <div key={si} className="install-section-card">
                      <div className="install-section-header">
                        <span>Section {si + 1}</span>
                        <button
                          className="install-btn-small install-btn-danger"
                          onClick={() => removeSection(sp.id, si)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="install-field-row">
                        <div className="install-field">
                          <label>Title *</label>
                          <input
                            value={sec.title}
                            onChange={(e) =>
                              updateSection(sp.id, si, 'title', e.target.value)
                            }
                            placeholder="e.g. Tokyo"
                          />
                        </div>
                        <div className="install-field">
                          <label>Description</label>
                          <input
                            value={sec.description}
                            onChange={(e) =>
                              updateSection(sp.id, si, 'description', e.target.value)
                            }
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                      <div className="install-field">
                        <label>Album UUIDs</label>
                        <textarea
                          value={sec.albumUuids}
                          onChange={(e) =>
                            updateSection(sp.id, si, 'albumUuids', e.target.value)
                          }
                          placeholder="album-uuid-1, album-uuid-2"
                          style={{ minHeight: '36px' }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    className="install-btn install-btn-ghost install-btn-sm"
                    onClick={() => addSection(sp.id)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Add Section
                  </button>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      <button
        className="install-btn install-btn-ghost"
        onClick={addSubpage}
        style={{ marginTop: '0.75rem' }}
      >
        + Add Subpage
      </button>
    </>
  );
}

/* ── Step 5: Footer & Legal ────────────────────────────── */

function FooterStep({
  data,
  update,
}: {
  data: FormData;
  update: (f: keyof FormData, v: string | boolean | number) => void;
}) {
  return (
    <>
      <h2>Footer &amp; Legal</h2>
      <p className="install-desc">Optional footer links and legal information.</p>

      <h2 style={{ fontSize: '1rem' }}>Footer</h2>
      <div className="install-field">
        <label>Display Name</label>
        <input
          value={data.footerName}
          onChange={(e) => update('footerName', e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div className="install-field">
        <label>Instagram Handle</label>
        <input
          value={data.footerInstagram}
          onChange={(e) => update('footerInstagram', e.target.value)}
          placeholder="https://instagram.com/your-handle"
        />
      </div>
      <div className="install-field-row">
        <div className="install-field">
          <label>Email</label>
          <input
            type="email"
            value={data.footerEmail}
            onChange={(e) => update('footerEmail', e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="install-field">
          <label>Website</label>
          <input
            type="url"
            value={data.footerWebsite}
            onChange={(e) => update('footerWebsite', e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>

      <h2 style={{ fontSize: '1rem', marginTop: '1.5rem' }}>Legal / Imprint</h2>
      <div className="install-check">
        <input
          type="checkbox"
          id="legalEnabled"
          checked={data.legalEnabled}
          onChange={(e) => update('legalEnabled', e.target.checked)}
        />
        <label htmlFor="legalEnabled">Enable legal notice page</label>
      </div>

      {data.legalEnabled && (
        <>
          <div className="install-field">
            <label>Name</label>
            <input
              value={data.legalName}
              onChange={(e) => update('legalName', e.target.value)}
              placeholder="Business or personal name"
            />
          </div>
          <div className="install-field">
            <label>Address</label>
            <input
              value={data.legalAddress}
              onChange={(e) => update('legalAddress', e.target.value)}
              placeholder="Street and number"
            />
          </div>
          <div className="install-field-row">
            <div className="install-field">
              <label>ZIP / City</label>
              <input
                value={data.legalZipCity}
                onChange={(e) => update('legalZipCity', e.target.value)}
                placeholder="1010 Vienna"
              />
            </div>
            <div className="install-field">
              <label>Country</label>
              <input
                value={data.legalCountry}
                onChange={(e) => update('legalCountry', e.target.value)}
                placeholder="Austria"
              />
            </div>
          </div>
          <div className="install-field-row">
            <div className="install-field">
              <label>Legal Email</label>
              <input
                type="email"
                value={data.legalEmail}
                onChange={(e) => update('legalEmail', e.target.value)}
                placeholder="legal@example.com"
              />
            </div>
            <div className="install-field">
              <label>Phone</label>
              <input
                type="tel"
                value={data.legalPhone}
                onChange={(e) => update('legalPhone', e.target.value)}
                placeholder="+43 123 456789"
              />
            </div>
          </div>
          <div className="install-field-row">
            <div className="install-field">
              <label>Tax ID</label>
              <input
                value={data.legalTaxId}
                onChange={(e) => update('legalTaxId', e.target.value)}
                placeholder="DE123456789"
              />
            </div>
            <div className="install-field">
              <label>VAT ID</label>
              <input
                value={data.legalVatId}
                onChange={(e) => update('legalVatId', e.target.value)}
                placeholder="12/345/67890"
              />
            </div>
          </div>
          <div className="install-field">
            <label>Extra Legal Info</label>
            <textarea
              value={data.legalExtraInfo}
              onChange={(e) => update('legalExtraInfo', e.target.value)}
              placeholder="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Max Mustermann"
            />
          </div>
        </>
      )}
    </>
  );
}

/* ── Step 6: Security & Summary ────────────────────────── */

function SecurityStep({
  data,
  update,
  installError,
}: {
  data: FormData;
  update: (f: keyof FormData, v: string | boolean | number) => void;
  installError: string;
}) {
  return (
    <>
      <h2>Security &amp; Summary</h2>
      <p className="install-desc">Set admin credentials and review your configuration.</p>

      <h2 style={{ fontSize: '1rem' }}>Admin Panel</h2>
      <div className="install-field">
        <label>Admin Password</label>
        <input
          type="password"
          value={data.adminPassword}
          onChange={(e) => update('adminPassword', e.target.value)}
          placeholder="Leave empty to disable admin panel"
        />
      </div>
      {data.adminPassword && (
        <div className="install-field">
          <label>Confirm Password</label>
          <input
            type="password"
            value={data.adminPasswordConfirm}
            onChange={(e) => update('adminPasswordConfirm', e.target.value)}
            placeholder="Re-enter password"
          />
          {data.adminPassword !== data.adminPasswordConfirm && (
            <div className="install-hint" style={{ color: 'var(--install-error)' }}>
              Passwords do not match
            </div>
          )}
        </div>
      )}

      <h2 style={{ fontSize: '1rem', marginTop: '1.5rem' }}>Advanced</h2>
      <div className="install-field">
        <label>Auth Secret (AUTH_SECRET)</label>
        <input
          value={data.authSecret}
          onChange={(e) => update('authSecret', e.target.value)}
          placeholder="Leave empty for auto-generated"
        />
        <div className="install-hint">
          Used for token encryption. Generate a random string if unsure.
        </div>
      </div>
      <div className="install-field-row">
        <div className="install-field">
          <label>Cache TTL (seconds)</label>
          <input
            type="number"
            min={0}
            value={data.cacheTtl}
            onChange={(e) => update('cacheTtl', parseInt(e.target.value, 10) || 300)}
          />
        </div>
        <div className="install-field">
          <label>Rate Limit (req/min)</label>
          <input
            type="number"
            min={1}
            value={data.rateLimitRpm}
            onChange={(e) => update('rateLimitRpm', parseInt(e.target.value, 10) || 120)}
          />
        </div>
      </div>

      <h2 style={{ fontSize: '1rem', marginTop: '1.5rem' }}>Configuration Summary</h2>
      <div className="install-summary">
        <div className="install-summary-section">
          <h3>Connection</h3>
          <div className="install-summary-row">
            <span className="install-summary-label">Server</span>
            <span className="install-summary-value">{data.immichApiUrl}</span>
          </div>
          <div className="install-summary-row">
            <span className="install-summary-label">API Key</span>
            <span className="install-summary-value">{data.immichApiKey.substring(0, 8)}...</span>
          </div>
          {data.trustedProxies && (
            <div className="install-summary-row">
              <span className="install-summary-label">Proxies</span>
              <span className="install-summary-value">{data.trustedProxies}</span>
            </div>
          )}
        </div>
        <div className="install-summary-section">
          <h3>Site</h3>
          <div className="install-summary-row">
            <span className="install-summary-label">Title</span>
            <span className="install-summary-value">{data.siteTitle}</span>
          </div>
          <div className="install-summary-row">
            <span className="install-summary-label">Theme</span>
            <span className="install-summary-value">{data.themePreset}</span>
          </div>
          <div className="install-summary-row">
            <span className="install-summary-label">Layout</span>
            <span className="install-summary-value">{data.gridLayout}</span>
          </div>
          <div className="install-summary-row">
            <span className="install-summary-label">Subpages</span>
            <span className="install-summary-value">{JSON.parse(data.subpagesJson || '[]').length}</span>
          </div>
        </div>
      </div>

      {installError && (
        <div className="install-test-status error" style={{ marginTop: '1rem' }}>
          {installError}
        </div>
      )}
    </>
  );
}
