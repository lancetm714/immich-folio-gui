/**
 * DevToolbar — floating visual builder for theme previewing.
 *
 * Only renders when NODE_ENV === 'development'.
 * Modifies data-* attributes on <html> to live-preview themes,
 * photo frames, dark/light mode, and grain without a rebuild.
 *
 * Hero styles and grid layouts require server re-render, so
 * those sections show a copyable YAML snippet instead.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

const PRESETS = ['studio', 'minimal', 'editorial', 'classic', 'noir', 'monograph', 'botanica'];
const FRAMES = ['none', 'passepartout', 'shadow'];
const HERO_STYLES = ['split', 'fullbleed', 'minimal', 'stacked', 'typographic', 'mosaic'];
const GRID_LAYOUTS = ['masonry', 'uniform', 'showcase', 'filmstrip', 'editorial-flow'];

// Font stacks for each preset (must match THEME_PRESETS in config.ts)
const PRESET_FONTS: Record<string, { heading: string; body: string; caption: string }> = {
    studio: { heading: 'Playfair Display', body: 'DM Sans', caption: 'EB Garamond' },
    minimal: { heading: 'Geist', body: 'Geist', caption: 'IBM Plex Mono' },
    editorial: { heading: 'Bodoni Moda', body: 'Newsreader', caption: 'IBM Plex Mono' },
    classic: { heading: 'Cinzel', body: 'Crimson Pro', caption: 'EB Garamond' },
    noir: { heading: 'Libre Baskerville', body: 'Source Sans 3', caption: 'IBM Plex Mono' },
    monograph: { heading: 'Instrument Serif', body: 'Inter', caption: 'JetBrains Mono' },
    botanica: { heading: 'Cormorant Garamond', body: 'Nunito Sans', caption: 'Lora' },
};

const PRESET_ACCENTS: Record<string, string> = {
    studio: '#e60012',
    minimal: '#000000',
    editorial: '#8B2500',
    classic: '#c49a3c',
    noir: '#ff6b35',
    monograph: '#333333',
    botanica: '#4a7c59',
};

function getAttr(attr: string): string {
    return document.documentElement.getAttribute(attr) ?? '';
}

function setAttr(attr: string, value: string) {
    document.documentElement.setAttribute(attr, value);
}

function setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
}

export function DevToolbar() {
    const [open, setOpen] = useState(false);
    const [preset, setPreset] = useState('');
    const [frame, setFrame] = useState('');
    const [theme, setTheme] = useState('');
    const [grain, setGrain] = useState('');
    const [copiedYaml, setCopiedYaml] = useState('');
    const [gridCols, setGridCols] = useState(3);
    const [gridGap, setGridGap] = useState(12);

    // Read initial values from DOM
    useEffect(() => {
        setPreset(getAttr('data-preset'));
        setFrame(getAttr('data-photo-frame'));
        setTheme(getAttr('data-theme') || 'dark');
        setGrain(getAttr('data-grain'));
        // Read grid vars
        const style = getComputedStyle(document.documentElement);
        const cols = parseInt(style.getPropertyValue('--grid-columns') || '3', 10);
        const gap = parseInt(style.getPropertyValue('--grid-gap') || '12', 10);
        if (!isNaN(cols)) setGridCols(cols);
        if (!isNaN(gap)) setGridGap(gap);
    }, []);

    const switchPreset = useCallback((p: string) => {
        setAttr('data-preset', p);
        setPreset(p);
        // Update accent + fonts
        const accent = PRESET_ACCENTS[p] || '#e60012';
        setVar('--accent', accent);
        setVar('--accent-dim', `${accent}1f`);
        const fonts = PRESET_FONTS[p];
        if (fonts) {
            setVar('--font-serif', `'${fonts.heading}', Georgia, 'Times New Roman', serif`);
            setVar('--font-sans', `'${fonts.body}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`);
            setVar('--font-caption', `'${fonts.caption}', Georgia, serif`);
            // Dynamically load Google Fonts if not already loaded
            const families = [fonts.heading, fonts.body, fonts.caption]
                .filter((f, i, a) => a.indexOf(f) === i)
                .map((f) => `family=${f.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400`)
                .join('&');
            const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
            // Check if already loaded
            const existing = document.querySelector(`link[href="${href}"]`);
            if (!existing) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            }
        }
    }, []);

    const switchFrame = useCallback((f: string) => {
        setAttr('data-photo-frame', f);
        setFrame(f);
    }, []);

    const switchTheme = useCallback((t: string) => {
        setAttr('data-theme', t);
        setTheme(t);
    }, []);

    const toggleGrain = useCallback(() => {
        const next = grain === 'true' ? 'false' : 'true';
        setAttr('data-grain', next);
        setGrain(next);
    }, [grain]);

    const updateGridCols = useCallback((cols: number) => {
        setGridCols(cols);
        // Update all photo-grid elements
        document.querySelectorAll<HTMLElement>('.photo-grid').forEach((el) => {
            el.style.setProperty('--grid-columns', String(cols));
        });
    }, []);

    const updateGridGap = useCallback((gap: number) => {
        setGridGap(gap);
        document.querySelectorAll<HTMLElement>('.photo-grid').forEach((el) => {
            el.style.setProperty('--grid-gap', `${gap}px`);
        });
    }, []);

    const copyYaml = useCallback(
        (section: string, yaml: string) => {
            navigator.clipboard.writeText(yaml);
            setCopiedYaml(section);
            setTimeout(() => setCopiedYaml(''), 1500);
        },
        [],
    );

    const currentYaml = `theme:
  preset: ${preset}
  photoFrame: ${frame}
  grain: ${grain === 'true'}`;

    // Keyboard shortcut: Ctrl/Cmd + Shift + T
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    return (
        <>
            {/* ── Floating Toggle Button ─────────────────────── */}
            <button
                onClick={() => setOpen(!open)}
                aria-label="Dev Toolbar"
                style={{
                    position: 'fixed',
                    bottom: 20,
                    left: 20,
                    zIndex: 99999,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)',
                    background: open
                        ? 'linear-gradient(135deg, #f43f5e, #a855f7)'
                        : 'rgba(30,30,30,0.9)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}
            >
                {open ? '✕' : '🎨'}
            </button>

            {/* ── Panel ──────────────────────────────────────── */}
            {open && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 76,
                        left: 20,
                        zIndex: 99998,
                        width: 300,
                        maxHeight: 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        background: 'rgba(18,18,22,0.96)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 16,
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
                        color: '#e4e4e7',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        fontSize: 12,
                        padding: 0,
                    }}
                >
                    {/* ── Header ──────────────────────────── */}
                    <div
                        style={{
                            padding: '14px 16px 10px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>
                            🎨 Theme Builder
                        </span>
                        <span
                            style={{
                                fontSize: 10,
                                color: '#71717a',
                                background: 'rgba(255,255,255,0.06)',
                                padding: '2px 8px',
                                borderRadius: 6,
                            }}
                        >
                            DEV ONLY
                        </span>
                    </div>

                    {/* ── Preset ──────────────────────────── */}
                    <Section title="Preset">
                        <PillGrid
                            items={PRESETS}
                            active={preset}
                            onSelect={switchPreset}
                        />
                    </Section>

                    {/* ── Dark / Light ────────────────────── */}
                    <Section title="Mode">
                        <PillGrid
                            items={['dark', 'light']}
                            active={theme}
                            onSelect={switchTheme}
                        />
                    </Section>

                    {/* ── Photo Frame ─────────────────────── */}
                    <Section title="Photo Frame">
                        <PillGrid
                            items={FRAMES}
                            active={frame}
                            onSelect={switchFrame}
                        />
                    </Section>

                    {/* ── Grain ───────────────────────────── */}
                    <Section title="Film Grain">
                        <button
                            onClick={toggleGrain}
                            style={{
                                ...pillStyle,
                                background: grain === 'true'
                                    ? 'linear-gradient(135deg, #f43f5e, #a855f7)'
                                    : 'rgba(255,255,255,0.06)',
                                color: grain === 'true' ? '#fff' : '#a1a1aa',
                                border: grain === 'true' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            {grain === 'true' ? '● On' : '○ Off'}
                        </button>
                    </Section>

                    {/* ── Grid Controls ───────────────────── */}
                    <Section title="Grid">
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <label style={{ color: '#71717a', fontSize: 11, minWidth: 45 }}>Cols: {gridCols}</label>
                            <input
                                type="range"
                                min={1}
                                max={6}
                                value={gridCols}
                                onChange={(e) => updateGridCols(Number(e.target.value))}
                                style={{ flex: 1, accentColor: '#a855f7' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                            <label style={{ color: '#71717a', fontSize: 11, minWidth: 45 }}>Gap: {gridGap}px</label>
                            <input
                                type="range"
                                min={0}
                                max={32}
                                value={gridGap}
                                onChange={(e) => updateGridGap(Number(e.target.value))}
                                style={{ flex: 1, accentColor: '#a855f7' }}
                            />
                        </div>
                    </Section>

                    {/* ── Hero Style (info only) ──────────── */}
                    <Section title="Hero Style (server)">
                        <PillGrid items={HERO_STYLES} active="" onSelect={(h) => {
                            copyYaml('hero', `theme:\n  heroStyle: ${h}`);
                        }} />
                        {copiedYaml === 'hero' && <CopyBadge />}
                    </Section>

                    {/* ── Grid Layout (info only) ─────────── */}
                    <Section title="Grid Layout (server)">
                        <PillGrid items={GRID_LAYOUTS} active="" onSelect={(l) => {
                            copyYaml('layout', `grid:\n  layout: ${l}`);
                        }} />
                        {copiedYaml === 'layout' && <CopyBadge />}
                    </Section>

                    {/* ── Export YAML ──────────────────────── */}
                    <div
                        style={{
                            padding: '12px 16px 16px',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <button
                            onClick={() => copyYaml('all', currentYaml)}
                            style={{
                                width: '100%',
                                padding: '10px 0',
                                borderRadius: 10,
                                border: 'none',
                                background: copiedYaml === 'all'
                                    ? '#22c55e'
                                    : 'linear-gradient(135deg, #a855f7, #6366f1)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: 12,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                letterSpacing: '0.02em',
                            }}
                        >
                            {copiedYaml === 'all' ? '✓ Copied to clipboard' : 'Copy YAML to clipboard'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Sub-components ───────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: '12px 16px 8px' }}>
            <div
                style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#71717a',
                    marginBottom: 8,
                }}
            >
                {title}
            </div>
            {children}
        </div>
    );
}

const pillStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap',
};

function PillGrid({
    items,
    active,
    onSelect,
}: {
    items: string[];
    active: string;
    onSelect: (item: string) => void;
}) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {items.map((item) => (
                <button
                    key={item}
                    onClick={() => onSelect(item)}
                    style={{
                        ...pillStyle,
                        background:
                            item === active
                                ? 'linear-gradient(135deg, #a855f7, #6366f1)'
                                : 'rgba(255,255,255,0.06)',
                        color: item === active ? '#fff' : '#a1a1aa',
                        border:
                            item === active
                                ? '1px solid rgba(255,255,255,0.2)'
                                : '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    {item}
                </button>
            ))}
        </div>
    );
}

function CopyBadge() {
    return (
        <span
            style={{
                display: 'inline-block',
                marginTop: 6,
                fontSize: 10,
                color: '#22c55e',
                fontWeight: 500,
            }}
        >
            ✓ YAML copied — paste into gallery.yaml
        </span>
    );
}
