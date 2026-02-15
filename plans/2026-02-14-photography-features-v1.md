# Photography Features

> **Status: ✅ Complete** — All items implemented and shipped.

## Objective

Implement four photography-focused enhancements to the gallery: a hero image carousel with crossfade transitions, automatic full-bleed rendering when a subpage contains only one album, EXIF metadata on grid hover with a global toggle, and a configurable grid layout system supporting masonry vs. uniform modes, custom column counts, gaps, and aspect ratios.

## Implementation Plan

---

### Feature 1 — Hero Carousel

- [x] 1. **Add `hero` list support to `gallery.yaml` and config** — Extend the `GalleryYaml` interface in `lib/config.ts:32` so that `hero` accepts either a single UUID string (backward compatible) or an array of UUID strings. Add a validation step that normalizes the value to an array (`heroImages: string[]`) in `AppConfig` at `lib/config.ts:100`. Update `gallery.yaml.example` with a commented example showing the array syntax. This lets users define 3–5 hero images.

- [x] 2. **Create `HeroCarousel` client component** — Create a new `components/HeroCarousel.tsx` client component. It receives a list of `{ src, blurDataURL }` objects. It rotates through images on a timer (e.g. 6 seconds), crossfading by layering two `next/image` elements with CSS opacity transitions. Only two are mounted at any time (current + next). Use `priority` on the first image only. Clear/restart the interval on unmount. If only one image is provided, render a single static image with no timer — this maintains backward compatibility with the current single-hero setup.

- [x] 3. **Update homepage to use `HeroCarousel`** — Modify `app/page.tsx:62-79` to replace the single `<Image>` with the `HeroCarousel` component. Fetch `getAssetInfo` for each hero image in `config.heroImages`, generate placeholder data via `assetPlaceholder`, and pass the array to the carousel. If no hero images are configured, fall back to the existing placeholder div.

- [x] 4. **Add carousel CSS** — Add CSS rules in `app/globals.css` for the carousel: stack images with `position: absolute`, crossfade using `opacity` transitions with `var(--transition-slow)`, handle `z-index` layering. Ensure the `.hero__right` container already has `position: relative; overflow: hidden` (it does) so images fill correctly.

---

### Feature 2 — Full-Bleed Single Albums

- [x] 5. **Detect single-album subpages in the catch-all route** — In `app/[...path]/page.tsx:150-202` (the subpage rendering branch), after fetching `getSubpageAlbums`, check if `albums.length === 1`. If so, skip the subpage album grid entirely and instead render the album detail view (album header + `PhotoGrid`) directly, consistent with how a standalone album renders. Include the back-link pointing to `/` since the intermediate subpage grid is being bypassed.

- [x] 6. **Preserve metadata for single-album subpages** — In `generateMetadata` at `app/[...path]/page.tsx:46-48`, when the slug is a subpage, also check if only one album exists. If so, generate metadata using the album name and photo count instead of the subpage name, since the user lands directly in the album.

---

### Feature 3 — EXIF on Hover

- [x] 7. **Extend `PhotoItem` with EXIF summary fields** — Add optional `camera` (string), `lens` (string), and `focalLength` (string) fields to the `PhotoItem` interface in `app/[...path]/PhotoGrid.tsx:12-20`. These are compact summary strings derived server-side from `ImmichExifInfo.model`, `ImmichExifInfo.lensModel`, and `ImmichExifInfo.focalLength` on each asset.

- [x] 8. **Pass EXIF summary data from server pages** — In `app/[...path]/page.tsx`, when building the `PhotoItem` array for `PhotoGrid`, extract the EXIF summary from `asset.exifInfo` (already present on `ImmichAsset`). Construct the compact strings (e.g. `"Leica M11"`, `"50mm Summilux"`, `"50mm"`) and include them in each `PhotoItem`. Only include fields that are non-null.

- [x] 9. **Add EXIF hover tooltip to `PhotoGrid`** — In `PhotoGrid.tsx`, render a small overlay div inside each `.photo-grid__item` when `camera` or `lens` is present. The overlay shows camera + lens + focal length in a compact one-line format. Use CSS `opacity: 0` by default and `opacity: 1` on `.photo-grid__item:hover`, matching the existing hover transition timing. Position at the bottom of the grid cell.

- [x] 10. **Add an `exifOnHover` toggle to `gallery.yaml`** — Add an optional boolean `exifOnHover` field (default `true`) to the `GalleryYaml` interface and `AppConfig` in `lib/config.ts`. When `false`, the server pages skip attaching the EXIF data to `PhotoItem`, and the overlay elements are not rendered. Pass the flag through to `PhotoGrid` as a prop.

- [x] 11. **Add CSS for EXIF hover overlay** — Add styles in `app/globals.css` for `.photo-grid__item-exif`: positioned at the bottom of the grid cell using `position: absolute; bottom: 0`, with a dark gradient background, small white text (font-size ~0.7rem), `opacity: 0` transitioning to `1` on parent hover, with `pointer-events: none` so it doesn't interfere with click-to-lightbox.

---

### Feature 4 — Customizable Grid Layout

- [x] 12. **Add grid configuration to `gallery.yaml`** — Extend `GalleryYaml` and `AppConfig` in `lib/config.ts` with a `grid` object containing: `columns` (number, default 3), `gap` (number in px, default 12), `aspectRatio` (string like `"1"`, `"3/2"`, `"auto"`, default `"1"`), and `layout` (enum `"masonry"` | `"uniform"`, default `"masonry"`). Parse and validate these in `getConfig()`. Update `gallery.yaml.example` with commented examples.

- [x] 13. **Pass grid config as CSS custom properties** — In the server page components (`app/[...path]/page.tsx`), wrap `PhotoGrid` in a container div that sets CSS custom properties from the grid config: `--grid-columns`, `--grid-gap`, `--grid-aspect-ratio`. This keeps the client component simple — it just reads props and the CSS handles the rest.

- [x] 14. **Update `PhotoGrid` to accept grid layout prop** — Add a `layout` prop (`"masonry" | "uniform"`) to `PhotoGridProps`. When `"masonry"`, use the existing CSS `column-count` approach. When `"uniform"`, switch to CSS `display: grid` with `grid-template-columns: repeat(var(--grid-columns), 1fr)`. Apply different classnames: `.photo-grid--masonry` vs `.photo-grid--uniform`.

- [x] 15. **Update CSS grid styles** — Replace the hardcoded `column-count: 3`, `column-gap: 12px`, and `aspect-ratio: 1` values in `app/globals.css:390-414` with CSS custom properties: `column-count: var(--grid-columns)`, `column-gap: var(--grid-gap)`, `aspect-ratio: var(--grid-aspect-ratio)`. Add `.photo-grid--uniform` styles that use CSS Grid instead of columns. Update responsive breakpoints to adjust `--grid-columns` accordingly. When `aspectRatio` is `"auto"`, remove the fixed aspect ratio from masonry items and restore `height: auto`.

---

## Verification Criteria

- `npx tsc --noEmit` passes with zero errors
- `npm run lint` passes with zero warnings
- Single hero image config still works identically (backward compatible)
- Array hero config shows crossfade carousel with smooth transitions
- Subpages with 1 album go straight to PhotoGrid (no intermediate album card grid)
- Subpages with 2+ albums still show the album card grid
- EXIF overlay appears on grid hover when `exifOnHover: true` or when omitted (default)
- EXIF overlay does not appear when `exifOnHover: false`
- Grid respects `columns`, `gap`, `aspectRatio`, and `layout` from `gallery.yaml`
- Responsive breakpoints still reduce columns on small viewports

## Potential Risks and Mitigations

1. **Hero carousel timer causes memory leaks on fast navigation**
   Mitigation: Clear interval on component unmount via `useEffect` cleanup. Only mount the timer when the component is visible.

2. **EXIF data bloats server-rendered HTML for large albums**
   Mitigation: Only pass 3 short strings per asset (camera, lens, focal length), not the full EXIF object. This adds ~50-100 bytes per image to the serialized props — negligible even for 200+ photo albums.

3. **Grid layout changes break existing CSS overrides or custom styles**
   Mitigation: Use CSS custom properties with sensible defaults so existing deployments work without any `gallery.yaml` changes. The defaults match the current hardcoded values.

4. **Full-bleed single albums lose the subpage name context**
   Mitigation: Include the subpage name in the back-link text and update metadata to use the album name directly.

## Alternative Approaches

1. **Hero carousel via CSS-only (no client component)**: Could use CSS animations with `animation-delay` on stacked images, avoiding React state. Trade-off: harder to control timing, no pause-on-hover, and can't preload images intelligently. Rejected in favor of the React component approach for better control.

2. **EXIF on hover via client-side fetch (lazy)**: Instead of passing EXIF data server-side, could fetch on first hover per image. Trade-off: adds latency on hover and requires per-image API calls. Since `exifInfo` is already on `ImmichAsset`, passing it server-side is both simpler and faster.

3. **Grid config via a separate `lightbox.config.ts` file**: Could create a dedicated TypeScript config file instead of extending `gallery.yaml`. Trade-off: adds another config surface. Since `gallery.yaml` already serves as the central configuration point and the grid settings are gallery-specific, extending it keeps things consolidated.
