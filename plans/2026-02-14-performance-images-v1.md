# Performance & Images

## Objective

Replace all raw `<img>` tags with `next/image`, add ThumbHash blur-up placeholders from Immich metadata, and extract dominant-color placeholders — giving every image a near-instant perceived load with automatic WebP/AVIF optimization and responsive srcsets.

## User Review Required

> [!IMPORTANT]
> **`next/image` with custom proxy** — because images are served through our own `/api/image/:token` proxy, `next/image` cannot optimize them server-side by default. Two approaches:
>
> 1. **Custom loader** — tell `next/image` to build URLs that point back to our own proxy, passing `width` and `quality` as query params. The proxy then asks Immich for the appropriate size. This is the recommended approach and what this plan proposes.
> 2. **`unoptimized` prop** — skip Next.js image optimization entirely and only get the blur-up / lazy-load benefits. Simpler but loses WebP/AVIF transcoding and responsive srcsets.
>
> This plan uses approach 1 (custom loader) for maximum benefit.

> [!WARNING]
> **Lightbox images stay as raw `<img>`** — the Lightbox component is a client-side fullscreen overlay that loads the preview-quality image into a `<img>`. Converting this to `next/image` would add unnecessary overhead (srcset negotiation, layout shifts) for an image that's already viewport-sized. The plan leaves Lightbox images as raw `<img>` but still adds ThumbHash blur placeholders to them.

## Implementation Plan

- [ ] 1. **Extend the image proxy to accept width/quality params** — Modify [route.ts](file:///Users/ralfo/git/immich-lightbox/app/api/image/[id]/route.ts) to accept optional `w` (width) and `q` (quality) query parameters. When `w` is provided, map it to the closest Immich size tier (`thumbnail` ≤ 250, `preview` ≤ 1440, `original` otherwise). Keep backward compatibility so existing `?size=` calls continue to work unchanged.

- [ ] 2. **Create a custom `next/image` loader** — Add [immichLoader.ts](file:///Users/ralfo/git/immich-lightbox/lib/immichLoader.ts) exporting a loader function that generates `/api/image/:token?w=WIDTH&q=QUALITY` URLs. Must be a standalone file referenced via `loaderFile` in `next.config.ts` (required for App Router). Handles the `src → token → proxy URL` mapping.

- [ ] 3. **Configure Next.js for the custom loader** — Modify [next.config.ts](file:///Users/ralfo/git/immich-lightbox/next.config.ts) to add `images.loader: 'custom'` and `images.loaderFile: './lib/immichLoader.ts'` so `next/image` uses our proxy globally.

- [ ] 4. **Add `thumbhash` dependency** — Modify [package.json](file:///Users/ralfo/git/immich-lightbox/package.json) to add the `thumbhash` npm package (~2 KB, pure JS, no native deps). Run `npm install`.

- [ ] 5. **Create ThumbHash helper utilities** — Add [thumbhash.ts](file:///Users/ralfo/git/immich-lightbox/lib/thumbhash.ts) with two helpers: `thumbHashToDataUrl(base64)` converting Immich's base64-encoded ThumbHash into a tiny data URL for `next/image`'s `blurDataURL` prop, and `thumbHashToDominantColor(base64)` extracting the average/dominant color as a hex string from the ThumbHash's decoded RGBA data. Since ThumbHash encodes both shape and color, both blur placeholder and dominant color come from the same Immich field — no extra API calls.

- [ ] 6. **Add placeholder helper to URL utilities** — Modify [urls.ts](file:///Users/ralfo/git/immich-lightbox/lib/urls.ts) to add an `assetPlaceholder(asset)` helper returning `{ blurDataURL, dominantColor } | null`. This encapsulates ThumbHash → placeholder conversion server-side so page components just pass it through as props.

- [ ] 7. **Migrate homepage hero to `next/image`** — Modify [page.tsx](file:///Users/ralfo/git/immich-lightbox/app/page.tsx) to replace the raw `<img>` (line 58) with `next/image` using `fill` layout and `priority` (above-the-fold LCP image). Add `blurDataURL` and `placeholder="blur"` from the hero asset's ThumbHash. Fetch ThumbHash via `immich.getAssetInfo()` for the hero image ID.

- [ ] 8. **Migrate subpage album covers to `next/image`** — Modify [page.tsx](file:///Users/ralfo/git/immich-lightbox/app/[...path]/page.tsx) to replace album cover `<img>` tags (line 98) with `next/image` using `fill` layout. Pass `blurDataURL` and `placeholder="blur"` from each album's thumbnail asset ThumbHash. Batch-fetch ThumbHash data for `albumThumbnailAssetId` when loading subpage data.

- [ ] 9. **Migrate about page portrait to `next/image`** — Modify [about/page.tsx](file:///Users/ralfo/git/immich-lightbox/app/about/page.tsx) to replace the portrait `<img>` (line 33) with `next/image` using `fill` layout and ThumbHash blur placeholder.

- [ ] 10. **Migrate photo grid thumbnails to `next/image`** — Modify [PhotoGrid.tsx](file:///Users/ralfo/git/immich-lightbox/app/[...path]/PhotoGrid.tsx) to replace grid `<img>` tags (line 84) with `next/image` using `fill` layout and `sizes` attribute for responsive sizing. Extend the `PhotoItem` interface with optional `blurDataURL` and `dominantColor` fields, generated server-side and passed as props. Use `placeholder="blur"` when available. Use `dominantColor` as CSS `background-color` on the grid item container for an instant color flash.

- [ ] 11. **Add placeholders to the Lightbox** — Modify [Lightbox.tsx](file:///Users/ralfo/git/immich-lightbox/components/Lightbox.tsx) to keep using raw `<img>` for fullscreen preview but add dominant-color background on `.lightbox__image-container` and show the ThumbHash blur as a CSS `background-image` while the main image loads, fading it out with a CSS transition on the image's `onload` event.

- [ ] 12. **Add CSS for placeholder transitions** — Modify [globals.css](file:///Users/ralfo/git/immich-lightbox/app/globals.css) to add smooth blur-to-sharp opacity transitions on grid items (pseudo-element or background-image), dominant color background styling for grid items, lightbox container, and album covers.

- [ ] 13. **Verify build and lint** — Run `npm run build` and `npm run lint` to confirm no TypeScript or ESLint errors.

- [ ] 14. **Manual visual verification** — Run `npm run dev`, test homepage hero blur, subpage album cover placeholders, photo grid blur-up, lightbox dominant color background, and about page portrait placeholder. Throttle to Slow 3G in DevTools to validate placeholder visibility.

## Verification Criteria

### Automated Tests

- `npm run build` — verify the project builds successfully with all changes (no TypeScript / ESLint errors)
- `npm run lint` — verify ESLint passes

### Manual Verification

1. **Run `npm run dev`** and open [http://localhost:3000](http://localhost:3000) in the browser
2. **Homepage hero**: Verify the hero image loads with a visible blur placeholder that transitions to the sharp image. Open DevTools Network tab and confirm the image request goes through `/api/image/` and the response Content-Type is `image/webp` or `image/avif`
3. **Subpage grid**: Navigate to a subpage, verify album cover cards show a colored/blurred placeholder before the cover image loads
4. **Photo grid**: Open an album, verify grid thumbnails show blur-up placeholders. Inspect a thumbnail `<img>` in DevTools and confirm it has `srcset` with multiple widths
5. **Lightbox**: Click a photo, verify the lightbox shows a dominant color background before the full preview loads
6. **About page**: Navigate to `/about`, verify the portrait image uses blur-up placeholder
7. **Slow connection test**: In DevTools, throttle network to "Slow 3G" and reload an album page — confirm placeholder behavior is clearly visible (blur → sharp transition)

## Potential Risks and Mitigations

1. **`next/image` with custom loader may not support all optimization features**
   Mitigation: The custom loader approach is officially documented by Next.js. Worst case, we fall back to `unoptimized` mode and still get blur placeholders.

2. **ThumbHash decoding adds server-side compute per page render**
   Mitigation: ThumbHash decoding is extremely fast (microseconds per hash). The data is already cached in the album response. We decode once per render, and albums are cached via the existing TTL cache.

3. **Missing ThumbHash data for some assets**
   Mitigation: All helpers return `null` when ThumbHash is unavailable. Components fall back gracefully — no placeholder shown, image loads normally (current behavior).

4. **Lightbox image loading UX regression**
   Mitigation: We're adding placeholders to the lightbox (improvement), not changing the image loading mechanism. The raw `<img>` stays, so no layout shift or srcset complexity.

## Alternative Approaches

1. **BlurHash instead of ThumbHash**: Immich uses ThumbHash (not BlurHash) internally. ThumbHash is the newer format and encodes both blur shape + color info, making it strictly better for our use case. No reason to use the older BlurHash format.

2. **Server-side image optimization (Sharp)**: Instead of the custom loader approach, we could add Sharp to the proxy route and actually resize/transcode images server-side. This would give true optimization but adds significant CPU and memory load to the server. Not recommended for a self-hosted gallery.

3. **`plaiceholder` package**: A popular Next.js package for generating blur placeholders. However, it requires fetching the actual image server-side to compute the placeholder. Since Immich already provides ThumbHash data, using it directly is much more efficient.
