# Portfolio Ideas

## 🧑‍💻 Developer

- **Internationalization (i18n)** — Multi-language UI support (DE/EN). Extend YAML config with locale files
- **ISR / Stale-While-Revalidate** — Replace `force-dynamic` with Incremental Static Regeneration + on-demand revalidation

## 📸 Photographer

- **Photo stories / Essays** — Vertical scroll format with images + text interspersed, like a photo essay. Portfolio differentiator
- **Map view** — Minimal world map from EXIF city/country data, each dot links to an album. Mapbox GL or Leaflet
- **Collections by camera/lens** — Auto-generate virtual albums from EXIF data ("Shot on Leica Q3", "Summilux 35mm")

## 👤 User / Visitor

- **Slideshow mode** — Auto-advance through photos (3s/5s/10s). Great for exhibitions and ambient display
- **Photo sharing** — "Copy link" button in lightbox with toast notification
- **Keyboard shortcut hints** — `?` button revealing available shortcuts (arrows, Esc, F for fullscreen)
- **Fullscreen API** — Chrome-free immersive viewing in lightbox
- **Pinch-to-zoom** — Touch gesture zoom in lightbox for detail viewing
- **Progressive loading animation** — Ken Burns zoom/pan on ThumbHash placeholders while loading

## 🏆 Quick Wins (High Impact / Low Effort)

| Idea | Effort | Impact |
|------|--------|--------|
| Slideshow mode | Low | High — exhibition ready |
| Fullscreen API in lightbox | Low | Medium — immersive |
| Monochrome toggle | Low | Medium — Leica vibes |
| ISR caching | Medium | High — performance |
| Photo stories/essays | High | Very high — differentiator |
| Map view | Medium | High — wow factor |

## ✅ Already Implemented

| Feature | Notes |
|---------|-------|
| Image CDN / Edge caching | `Cache-Control: immutable` on `/api/image` proxy |
| OG image generation | Dynamic OG images via `/api/og` |
| Hero image carousel | Crossfade carousel from `gallery.yaml` hero images |
| EXIF metadata display | Print-style captions on photo grid hover |
| Per-album password protection | Cookie-based auth gate per subpage |
| Asset ID obfuscation | AES-encrypted tokens in public URLs |
| Rate limiting | On image proxy endpoint |
| YAML-based config | `gallery.yaml` replaces env-var config |
| Playwright E2E tests | Basic test suite in `e2e/` |
| Fade-in animations | Intersection Observer based |
| Theme toggle (dark/light) | Persisted via cookie |
| Scroll-to-top button | Appears on scroll |
| Footer with social links | Configurable via `gallery.yaml` |
| Image count badges | On subpage cover tiles |
| Custom cursor (crosshair) | On photo grid items |
| About page | Markdown-driven with portrait + gear |
| Content Security Policy | CSP + security headers in `next.config.ts` |
| Album descriptions | Uses Immich's built-in album description field |
