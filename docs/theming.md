# Theming

Control the visual identity of your gallery from `content/gallery.yaml`. Choose a built-in preset or customize individual properties — no CSS editing required.

## Quick Start

Add a single line to your `gallery.yaml`:

```yaml
theme: minimal
```

That's it. Your entire gallery switches to the minimal theme.

## Built-in Presets

| Preset | Look | Accent | Fonts | Corners | Frame | Grain |
|--------|------|--------|-------|---------|-------|-------|
| **studio** | Leica-inspired, editorial | 🔴 `#e60012` | Playfair Display + DM Sans | Sharp | Passepartout | ✓ |
| **minimal** | Clean, no distractions | ⚪ `#666666` | Inter | Sharp | None | ✗ |
| **editorial** | Magazine feel | ⚫ `#1a1a1a` | Libre Baskerville + Source Sans | Slight | Shadow | ✗ |
| **classic** | Warm, inviting | 🟡 `#8b6914` | Cormorant Garamond + Lato | Rounded | None | ✗ |

Default is `studio` if no theme is specified.

## Custom Theme

Start from any preset and override individual properties:

```yaml
theme:
  preset: studio              # base preset to extend (default: studio)
  accent: "#2563eb"           # brand/accent color (any hex)
  fonts:
    heading: "Inter"          # Google Fonts name for headings
    body: "Inter"             # body text
    caption: "JetBrains Mono" # EXIF captions
  radius: 8                   # border-radius in px (0 = sharp corners)
  photoFrame: none            # "none" | "passepartout" | "shadow"
  grain: false                # film grain overlay on photos
  headerDot: false            # accent-colored dot in the nav bar
  heroStyle: split            # "split" | "fullbleed" | "minimal"
```

All properties are optional — omitted values fall back to the preset defaults.

## Properties Reference

### `accent`

The brand color used for hover effects, navigation highlights, the header dot, and OG social preview images.

### `fonts`

Google Fonts names. Fonts are loaded automatically — just use the name as it appears on [fonts.google.com](https://fonts.google.com). Three font slots:

- **heading** — album titles, hero title, section labels
- **body** — navigation, descriptions, UI text
- **caption** — EXIF metadata, photo captions

### `radius`

Border radius in pixels applied to photo grid items and album cards:
- `0` — sharp, editorial corners
- `4-8` — subtle rounding
- `12+` — soft, modern feel

### `photoFrame`

How photos are framed in the grid:

- **`none`** — photos fill the grid cell directly
- **`passepartout`** — museum-style mat border around each photo with print-style EXIF captions below
- **`shadow`** — subtle drop shadow behind each photo

### `grain`

When `true`, a subtle film grain texture overlays each photo in the grid. Adds an analog, filmic character.

### `headerDot`

When `true`, shows a small accent-colored dot in the navigation bar (inspired by the Leica red dot).

### `heroStyle`

Controls the homepage hero layout:
- **`split`** — title/nav on the left, hero image on the right (default)
- **`fullbleed`** — hero image fills the entire viewport
- **`minimal`** — text-only, no hero image

## Examples

### Minimal portfolio
```yaml
theme:
  preset: minimal
  accent: "#0066cc"
  fonts:
    heading: "Outfit"
    body: "Outfit"
```

### Film photography blog
```yaml
theme:
  preset: studio
  accent: "#d4a017"
  grain: true
  photoFrame: passepartout
```

### Modern magazine
```yaml
theme:
  preset: editorial
  radius: 12
  fonts:
    heading: "Fraunces"
    body: "Inter"
    caption: "IBM Plex Mono"
```
