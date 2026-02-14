# Immich Lightbox — Public Photo Gallery

## Objective

Build a public-facing web gallery that connects to a private Immich server via its API, selects specific albums, and presents them as a beautiful, Lightroom-style portfolio website — similar in spirit to [ralfo.myportfolio.com](http://ralfo.myportfolio.com/). The Immich server stays behind the firewall; only curated album images flow outward through this app.

### Key Goals

- **Album curation** — Admin picks which Immich albums to publish; only those appear on the public site
- **Proxy architecture** — The gallery server talks to Immich; visitors never touch Immich directly. API key stays server-side
- **Portfolio-grade design** — Clean, dark, image-first aesthetic with masonry/grid layout, smooth lightbox, and responsive behavior
- **Low operational overhead** — Single Docker container, minimal config, no database needed

---

## Architecture Overview

**Visitor (Browser)** → HTTPS → **Lightbox Server (Next.js)** → HTTP → **Immich Server (Private API)**

The Lightbox Server sits between visitors and Immich. It proxies images, caches API responses, and holds the album selection config. The Immich server stays private and serves album data and original images only to the Lightbox Server.

**Stack:**

- **Next.js 15** (App Router) — SSR for fast first paint, API routes for proxying
- **TypeScript** — End-to-end type safety
- **CSS Modules + CSS custom properties** — Clean, maintainable dark-theme styling
- **Docker** — Single-container deployment

---

## Implementation Plan

- [ ] 1. **Scaffold the Next.js project** — Initialize a Next.js 15 app with TypeScript in the current workspace directory using `npx -y create-next-app@latest ./`. Configure project settings (app router, TypeScript, ESLint). This is the foundation everything else builds on.

- [ ] 2. **Create the Immich API client module** — Build a server-only module (`lib/immich.ts`) that wraps the Immich REST API. This module handles authentication (API key from env vars), album listing (`GET /api/albums`), album detail fetching (`GET /api/albums/{id}`), and asset thumbnail/original URL construction. All API calls happen server-side only — the API key never reaches the browser.

- [ ] 3. **Create environment configuration** — Set up `.env.local.example` documenting required variables: `IMMICH_API_URL` (the Immich server base URL), `IMMICH_API_KEY` (service account key), and `LIGHTBOX_ALBUMS` (comma-separated album IDs to publish). Add a `lib/config.ts` module that validates and exports typed config at startup.

- [ ] 4. **Build the image proxy API route** — Create `app/api/image/[id]/route.ts` that proxies image requests through to Immich. Accepts an asset ID and optional `size` query param (thumbnail vs. original). Streams the response from Immich to the client, setting appropriate cache headers (long `Cache-Control` since images are immutable). This keeps the Immich server unexposed while serving images to visitors.

- [ ] 5. **Design and implement the global layout and theme** — Create the root layout (`app/layout.tsx`) and global styles (`app/globals.css`). Establish a dark, minimal design system: near-black backgrounds, subtle borders, elegant typography (Google Fonts — Inter or similar). Include a minimal header/nav with the site title and responsive breakpoints. The aesthetic should feel premium and image-focused, not app-like.

- [ ] 6. **Build the homepage — album grid** — Create `app/page.tsx` as a server component that fetches the configured albums from Immich, displays them in a responsive grid layout. Each album card shows its cover image (fetched via the proxy), album title, and asset count. Clicking an album navigates to its detail page. Add hover effects (subtle scale, overlay with title) for an engaging, interactive feel.

- [ ] 7. **Build the album detail page — photo grid** — Create `app/album/[id]/page.tsx` as a server component. Fetches all assets in the selected album from Immich, displays them in a masonry or justified grid using CSS Grid. Shows thumbnails initially for fast loading. A back-to-home navigation link or breadcrumb provides context. Each image is clickable to open a fullscreen lightbox.

- [ ] 8. **Build the client-side lightbox component** — Create a `components/Lightbox.tsx` client component. When a user clicks a photo in the album grid, an overlay opens showing the full-resolution image with smooth fade/slide transitions. Include previous/next navigation (arrow keys + swipe on mobile), close button (Esc key support), and an optional EXIF info overlay (camera, lens, ISO, aperture, shutter speed — data from Immich). Preload adjacent images for snappy navigation.

- [ ] 9. **Add EXIF metadata display** — Enhance the Immich API client to fetch asset EXIF data (`GET /api/assets/{id}`). Display this in the lightbox as an optional info panel: camera model, lens, focal length, aperture, shutter speed, ISO. This adds the "photographer's portfolio" feel that distinguishes this from a basic gallery.

- [ ] 10. **Implement image loading optimizations** — Use Next.js `<Image>` component with blur placeholder data-URLs (generated server-side from Immich thumbnails). Implement progressive loading: show tiny blurred thumbnails instantly, then swap to full thumbnails on load. Apply `loading="lazy"` on below-the-fold images. Set proper `sizes` attributes for responsive image delivery.

- [ ] 11. **Add server-side caching layer** — Implement an in-memory LRU cache (or file-based cache in production) for Immich API responses. Album lists and metadata rarely change, so cache with a configurable TTL (default 5 minutes). Image proxy responses rely on HTTP cache headers; no server-side image caching needed. This dramatically reduces Immich API load.

- [ ] 12. **Create the Docker deployment setup** — Write a `Dockerfile` (multi-stage: build + runtime) and `docker-compose.yml`. The compose file references env vars for Immich connection details. Include health check and proper signal handling. Document deployment in `README.md`.

- [ ] 13. **Write the README and configuration guide** — Create a comprehensive `README.md` covering: project overview, screenshots, setup instructions (how to get an Immich API key, how to find album IDs, env var reference), Docker deployment, and development workflow.

---

## Verification Criteria

- **Album selection**: Only albums specified in `LIGHTBOX_ALBUMS` appear on the homepage; other Immich albums are hidden
- **Image proxying**: Browser Network tab shows all image requests going to the Lightbox server, never directly to Immich. The `x-api-key` header never appears in browser-visible requests
- **Responsive layout**: Gallery looks correct on mobile (375px), tablet (768px), and desktop (1440px)
- **Lightbox navigation**: Arrow keys, swipe gestures, and on-screen buttons all work for prev/next. Esc closes the lightbox
- **Performance**: Homepage loads in under 2 seconds with cached data. Lighthouse performance score ≥ 85
- **Docker deployment**: `docker compose up` brings the app up and serves the gallery

### Automated Tests

- Run `npm run build` to validate TypeScript compilation and Next.js build succeeds
- Run `npm run lint` to check for code quality issues

### Manual Verification

> [!IMPORTANT]
> You will need a running Immich instance with at least 2 albums to test against. Please confirm your Immich server URL and provide an API key before we begin implementation.

1. **Homepage check** — Open `http://localhost:3000` in a browser, confirm only the configured albums appear as cards with cover images
2. **Album detail check** — Click an album card, confirm all photos from that album load in a grid
3. **Lightbox check** — Click a photo, confirm the lightbox opens with full-res image, arrow navigation works, Esc closes
4. **Security check** — Open browser DevTools → Network tab, confirm no requests go directly to the Immich server URL, and the API key does not appear in any request headers or URLs
5. **Mobile check** — Use browser responsive mode at 375px width, confirm the layout adapts cleanly

---

## Potential Risks and Mitigations

1. **Immich API changes between versions**
   Mitigation: Pin to a specific Immich API version in documentation. Use defensive coding with optional chaining and fallbacks for missing fields. The OpenAPI spec is stable for core album/asset endpoints.

2. **Large albums (1000+ images) causing slow page loads**
   Mitigation: Implement pagination or virtual scrolling in the album detail view. Initially load 50 thumbnails and lazy-load more on scroll.

3. **Immich server unreachable causes gallery downtime**
   Mitigation: The server-side cache ensures the gallery continues serving recently-fetched data even if Immich is temporarily down. Add graceful error states showing "Gallery temporarily unavailable."

4. **Image proxy becomes a bandwidth bottleneck**
   Mitigation: Set aggressive `Cache-Control` headers (1 year for immutable images) so browsers and CDNs cache aggressively. Consider optional CDN (Cloudflare) in front.

5. **API key exposure**
   Mitigation: API key is only used in server-side code (API routes, server components). It never appears in client bundles or browser requests. Environment variables are validated at startup.

---

## Alternative Approaches

1. **Static Site Generation (SSG) instead of SSR** — Pre-render all pages at build time, deploy to a static host (Netlify, Vercel). Eliminates the need for a running server. Trade-off: requires a rebuild whenever album contents change; no real-time sync with Immich.

2. **Use Immich Shared Links instead of API** — Create shared links for each album in Immich and embed/proxy those. Trade-off: less control over presentation, relies on Immich's built-in sharing UI, and shared link URLs may expire.

3. **Client-side only (SPA)** — Fetch everything from the browser via CORS. Trade-off: exposes the Immich API key to the browser, which is a security risk. Not recommended.

4. **Sync + Static Files** — A cron job syncs selected album images to local disk, then a static site serves them. Trade-off: duplicates storage, adds operational complexity, but provides complete decoupling from Immich availability.
