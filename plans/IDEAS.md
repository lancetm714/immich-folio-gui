# Portfolio Ideas

## 🧑‍💻 Developer

- **Internationalization (i18n)** — Multi-language UI support (DE/EN). Extend YAML config with locale files
- **ISR / Stale-While-Revalidate** — Replace `force-dynamic` with Incremental Static Regeneration + on-demand revalidation
- **Image CDN / Edge caching** — Add `Cache-Control` headers on `/api/image` proxy responses to reduce Immich load
- **Structured logging** — Replace console.log with `pino` for production observability (request IDs, timings, cache hits)
- **CI/CD pipeline** — GitHub Actions: lint → typecheck → unit tests → Playwright E2E → Docker build → push to GHCR
- **Content Security Policy** — CSP headers to lock down the public-facing site
- **Privacy-friendly analytics** — Plausible or Umami (self-hosted) to track album/photo engagement

## 📸 Photographer

- **Photo stories / Essays** — Vertical scroll format with images + text interspersed, like a photo essay. Portfolio differentiator
- **Map view** — Minimal world map from EXIF city/country data, each dot links to an album. Mapbox GL or Leaflet
- **Monochrome / Film simulation toggle** — CSS filters for grayscale, Tri-X, Portra 400 looks across the grid
- **Before/After slider** — Draggable comparison slider in lightbox for edit showcases
- **Collections by camera/lens** — Auto-generate virtual albums from EXIF data ("Shot on Leica Q3", "Summilux 35mm")
- **Photo of the day / Favorites** — Rotate a featured hero photo, driven by tag in Immich or `gallery.yaml`

## 👤 User / Visitor

- **Slideshow mode** — Auto-advance through photos (3s/5s/10s). Great for exhibitions and ambient display
- **Photo sharing** — "Copy link" button in lightbox with toast + per-photo OG image generation
- **Keyboard shortcut hints** — `?` button revealing available shortcuts (arrows, Esc, F for fullscreen)
- **Fullscreen API** — Chrome-free immersive viewing in lightbox
- **Pinch-to-zoom** — Touch gesture zoom in lightbox for detail viewing
- **Album / Subpage descriptions** — Markdown description per subpage in `gallery.yaml`, shown above the grid
- **Progressive loading animation** — Ken Burns zoom/pan on ThumbHash placeholders while loading

## 🏆 Quick Wins (High Impact / Low Effort)

| Idea | Effort | Impact |
|------|--------|--------|
| Slideshow mode | Low | High — exhibition ready |
| Copy link + per-photo OG | Low | High — shareability |
| Album descriptions in YAML | Low | Medium — context |
| Fullscreen API in lightbox | Low | Medium — immersive |
| Monochrome toggle | Low | Medium — Leica vibes |
| ISR caching | Medium | High — performance |
| Photo stories/essays | High | Very high — differentiator |
| Map view | Medium | High — wow factor |
