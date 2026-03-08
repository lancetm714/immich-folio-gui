# Theming System — Feature Plan

Make the app themeable so photographers with different aesthetic preferences can fully customize the look without touching component code.

## Current State

The CSS architecture is already 80% of the way there:
- **Design tokens** in `tokens.css` — colors, fonts, radii, transitions, spacing
- **Dark/light toggle** via `[data-theme]` attribute
- All components reference tokens exclusively (`var(--text-primary)`, `var(--font-serif)`, etc.)

**What's NOT themeable yet:**
- The "Studio/Leica" aesthetic is hardcoded into `globals.css` (lines 607–783) — red dot, film grain, passepartout borders, uppercase titles, sharp corners
- Header glass effect colors are hardcoded (`rgba(26, 26, 26, 0.9)`)
- Font imports are hardcoded in `tokens.css`
- The OG image generator has hardcoded colors

---

## Proposed Architecture

### Theme as a YAML config

Add a `theme` section to `gallery.yaml`. Photographers configure their visual identity alongside their gallery structure — no CSS editing required.

```yaml
# gallery.yaml

theme: editorial   # built-in preset (or "studio", "minimal", "classic")

# OR fully custom:
theme:
  preset: minimal                         # start from a base
  accent: "#2563eb"                       # brand color
  fonts:
    heading: "Inter"                      # Google Fonts name
    body: "Inter"
    caption: "JetBrains Mono"
  radius: 8                               # border-radius in px (0 = sharp)
  photoFrame: none                        # "none" | "passepartout" | "shadow"
  grain: false                            # film grain overlay
  headerDot: false                        # red dot in nav
  heroStyle: split                        # "split" | "fullbleed" | "minimal"
```

### How it works

```
gallery.yaml (theme config)
       │
       ▼
  getConfig()  ← reads theme key
       │
       ▼
  RootLayout   ← injects CSS custom properties as inline style on <html>
       │         + conditionally loads Google Fonts <link>
       ▼
  tokens.css   ← contains fallback defaults only
       │
       ▼
  globals.css  ← component styles use var() tokens
                  conditional classes for optional features
```

### Implementation Layers

#### Layer 1: Extract theme tokens from config

**Files:** `lib/config.ts`, `app/layout.tsx`

1. Add `ThemeConfig` type to `config.ts`:
```ts
interface ThemeConfig {
  accent: string;
  fonts: { heading: string; body: string; caption: string };
  radius: number;
  photoFrame: 'none' | 'passepartout' | 'shadow';
  grain: boolean;
  headerDot: boolean;
  heroStyle: 'split' | 'fullbleed' | 'minimal';
}
```

2. In `layout.tsx`, inject theme values as CSS custom properties:
```tsx
<html style={{
  '--accent': theme.accent,
  '--font-serif': `'${theme.fonts.heading}', Georgia, serif`,
  '--font-sans': `'${theme.fonts.body}', system-ui, sans-serif`,
  '--radius-sm': `${theme.radius}px`,
  '--radius-md': `${theme.radius * 1.5}px`,
}}>
```

3. Dynamically build the Google Fonts `<link>` URL from the font names.

#### Layer 2: Make component CSS conditional

**Files:** `globals.css`, `tokens.css`

1. Move the "Studio-Inspired Defaults" block (lines 607–783) into a separate file `themes/studio.css`
2. Create `themes/minimal.css`, `themes/classic.css`, `themes/editorial.css` with different aesthetic overrides
3. The base `globals.css` becomes theme-agnostic — clean, neutral component styles
4. Conditional features controlled by data attributes:

```css
/* Only show if theme.grain is true */
[data-grain="true"] .photo-grid__item::after { /* grain overlay */ }

/* Only show if theme.headerDot is true */
[data-header-dot="true"] .header__nav::before { /* red dot */ }

/* Passepartout frame */
[data-photo-frame="passepartout"] .photo-grid__item { padding: 8px; border: 1px solid ... }

/* Shadow frame */
[data-photo-frame="shadow"] .photo-grid__item { box-shadow: 0 2px 20px rgba(0,0,0,0.3); }
```

#### Layer 3: Built-in presets

Ship 4 presets that photographers can pick with a single word:

| Preset | Aesthetic | Accent | Fonts | Radius | Frame | Grain |
|--------|-----------|--------|-------|--------|-------|-------|
| `studio` | Current Leica look | `#e60012` | Playfair+DM Sans | 0 | passepartout | ✓ |
| `minimal` | Clean, no distractions | `#666` | Inter | 0 | none | ✗ |
| `editorial` | Magazine feel | `#1a1a1a` | Libre Baskerville+Source Sans | 4 | shadow | ✗ |
| `classic` | Warm, inviting | `#8b6914` | Cormorant+Lato | 8 | none | ✗ |

Presets are just default values — every property can be overridden individually.

#### Layer 4: OG image theming

Update `/api/og/route.tsx` to read accent color and fonts from config, replacing the hardcoded `#0a0a0a` / `#d4af37`.

---

## File Changes Summary

| File | Change |
|------|--------|
| `lib/config.ts` | Add `ThemeConfig` type + parsing from YAML |
| `app/layout.tsx` | Inject CSS vars inline, dynamic Google Fonts link |
| `app/tokens.css` | Tokens become fallback defaults only |
| `app/globals.css` | Remove hardcoded "Studio" overrides, use data attributes |
| `themes/studio.css` | [NEW] Extracted studio/Leica aesthetic |
| `themes/minimal.css` | [NEW] Clean minimal preset |
| `themes/editorial.css` | [NEW] Magazine preset |
| `themes/classic.css` | [NEW] Warm classic preset |
| `app/api/og/route.tsx` | Read accent color from config |
| `content/gallery.yaml.example` | Add `theme:` section |
| `README.md` | Document theme customization |

---

## Migration Path

**Zero breaking changes.** If no `theme` key exists in `gallery.yaml`, the app defaults to `studio` (current look). Existing deployments see no visual change.

---

## Not In Scope (Future)

- **Live theme preview** — a `/theme-editor` page where you tweak and see changes in real time
- **Custom CSS injection** — a `customCss` field in YAML for power users to inject arbitrary CSS
- **Per-album themes** — different themes for different subpages
- **Background texture/pattern** options beyond grain
