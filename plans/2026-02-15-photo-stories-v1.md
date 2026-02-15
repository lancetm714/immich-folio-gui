# Photo Stories / Essays

Add a Markdown-driven photo essay system to the gallery, allowing the photographer to create long-form vertical scroll pages that intersperse Immich images with narrative text — like a photo essay or editorial blog post.

## Design Decisions

> [!IMPORTANT]
> **Content authoring via Markdown files** — follows the same pattern as the existing `content/about.md` (frontmatter + `gray-matter`). Each story lives in `content/stories/<slug>.md`. This keeps content in the repo, versioned with Git, and avoids any database or CMS dependency.

> [!IMPORTANT]
> **Image references use Immich asset UUIDs** — stories reference images by UUID (e.g. `![caption](asset:UUID)`). The renderer resolves these to proxied URLs with ThumbHash placeholders. No images are stored locally — they flow through the existing `/api/image` proxy like everything else.

> [!WARNING]
> **Stories are a separate content type from albums** — they don't live under subpages. They get their own top-level routes at `/stories/<slug>` and appear in the header nav and footer as a "Stories" link. This avoids polluting the album/subpage routing logic.

## Proposed Changes

### Content Layer

#### [NEW] [content/stories/](file:///Users/ralfo/git/immich-lightbox/content/stories/)

New directory for story Markdown files. Each story is a `.md` file with YAML frontmatter:

```yaml
---
title: "A Weekend in Potsdam"
date: 2026-02-10
cover: <immich-asset-uuid>     # cover image for the story card
---

An opening paragraph of text. Sets the mood.

![Sanssouci Palace at dawn](asset:<uuid>)

More narrative text explaining the moment, the light, the feeling.

![Two images side by side](asset:<uuid1>)
![](asset:<uuid2>)

A closing paragraph.
```

**Authoring rules:**
- Standard Markdown for text (paragraphs, headings, blockquotes, emphasis)
- Images use `![caption](asset:<UUID>)` syntax — the custom renderer swaps these for proxied `next/image` with ThumbHash blur
- Two `![...]` on consecutive lines → rendered as a **side-by-side pair** (2-column layout)
- A single `![...]` → rendered **full-width** (edge-to-edge)
- The `cover` frontmatter UUID is used for the story card thumbnail and OG image

---

### Configuration

#### [MODIFY] [gallery.yaml](file:///Users/ralfo/git/immich-lightbox/content/gallery.yaml)

No changes needed — stories are auto-discovered from `content/stories/*.md`. This keeps configuration minimal and avoids requiring UUID registration for every story.

#### [MODIFY] [config.ts](file:///Users/ralfo/git/immich-lightbox/lib/config.ts)

Add a `stories` property to `AppConfig`:

```typescript
export interface StoryConfig {
  slug: string;
  title: string;
  date: string;
  cover: string;  // Immich asset UUID
}

// In AppConfig:
stories: StoryConfig[];
```

Add a `loadStories()` function that scans `content/stories/*.md`, reads frontmatter from each, validates the cover UUID, and returns a sorted array (newest first).

---

### Library

#### [NEW] [storyParser.ts](file:///Users/ralfo/git/immich-lightbox/lib/storyParser.ts)

Parses a story Markdown file into a structured block array for rendering:

```typescript
type StoryBlock =
  | { type: 'text'; html: string }
  | { type: 'image'; assetId: string; caption?: string; blurDataURL?: string; aspectRatio?: number }
  | { type: 'image-pair'; images: [StoryImageData, StoryImageData] };
```

**Logic:**
1. Parse frontmatter with `gray-matter`
2. Split the body into blocks separated by blank lines
3. Detect `![caption](asset:UUID)` patterns
4. Two consecutive image lines → group as `image-pair`
5. Text blocks → render to HTML with a lightweight Markdown renderer (use `marked` or inline custom parser since the about page already does line-splitting — but for stories we want headings, emphasis, blockquotes)
6. For each image block, call `immich.getAssetInfo()` to fetch ThumbHash and aspect ratio

---

### Pages

#### [NEW] [app/stories/page.tsx](file:///Users/ralfo/git/immich-lightbox/app/stories/page.tsx)

**Stories index page** at `/stories` — lists all stories as cards in a masonry or vertical list.

Each card shows:
- Cover image (proxied from Immich, with ThumbHash blur)
- Title
- Date
- Click → navigates to `/stories/<slug>`

Server component. Reads the story configs from `getConfig().stories` and fetches ThumbHash for each cover.

#### [NEW] [app/stories/[slug]/page.tsx](file:///Users/ralfo/git/immich-lightbox/app/stories/%5Bslug%5D/page.tsx)

**Story detail page** at `/stories/<slug>`.

Server component that:
1. Reads the Markdown file from `content/stories/<slug>.md`
2. Parses it through `storyParser.ts`
3. Fetches ThumbHash/aspect data for all referenced images
4. Renders the block array as a vertical scroll layout with alternating text and full-bleed images
5. Generates metadata (title, OG image from cover)

---

### Styling

#### [NEW] [app/stories/stories.css](file:///Users/ralfo/git/immich-lightbox/app/stories/stories.css)

Story index page styles — card grid similar to the subpage grid.

#### [NEW] [app/stories/[slug]/story.css](file:///Users/ralfo/git/immich-lightbox/app/stories/%5Bslug%5D/story.css)

Story detail page styles:

- `.story` — max-width container (680px for text, full-bleed for images)
- `.story__header` — title + date, large serif typography
- `.story__text` — paragraph styles, headings, blockquotes. Serif body text for editorial feel
- `.story__image` — single full-width image with optional caption below
- `.story__image-pair` — two images side-by-side with equal height (CSS Grid `1fr 1fr`)
- `.story__caption` — small italic text below images
- Responsive: image pairs stack vertically on mobile (< 640px)
- Generous vertical spacing between blocks (48–64px) for a magazine feel
- Smooth fade-in animations on scroll using existing `FadeIn` component

---

### Navigation

#### [MODIFY] [layout.tsx](file:///Users/ralfo/git/immich-lightbox/app/layout.tsx)

Add a "Stories" link to the header nav (between the subpage links and "About"), conditionally rendered only when `getConfig().stories.length > 0`.

---

### Dependencies

#### [MODIFY] [package.json](file:///Users/ralfo/git/immich-lightbox/package.json)

Add `marked` (lightweight Markdown → HTML renderer, ~40KB) for rendering story text blocks. The about page's basic `split('\n')` approach won't suffice for stories since they need headings, emphasis, blockquotes, and links.

---

## Summary of Files

| Action | File | Purpose |
|--------|------|---------|
| NEW | `content/stories/` | Story markdown files directory |
| MODIFY | `lib/config.ts` | Add `StoryConfig` type, `loadStories()`, `stories` to `AppConfig` |
| NEW | `lib/storyParser.ts` | Parse story MD → structured block array |
| NEW | `app/stories/page.tsx` | Stories index page (list of cards) |
| NEW | `app/stories/stories.css` | Styles for stories index |
| NEW | `app/stories/[slug]/page.tsx` | Story detail page (essay reader) |
| NEW | `app/stories/[slug]/story.css` | Styles for story reader |
| MODIFY | `app/layout.tsx` | Add conditional "Stories" nav link |
| MODIFY | `package.json` | Add `marked` dependency |

## Verification Plan

### Automated Tests

1. **Unit test for `storyParser`** — add `lib/__tests__/storyParser.test.ts`:
   - Parses a single image `![caption](asset:UUID)` into an `image` block
   - Parses two consecutive images into an `image-pair` block
   - Parses plain text into a `text` block with rendered HTML
   - Handles mixed content (text → image → text → pair → text)
   - Rejects malformed `asset:` references gracefully
   - Run: `npx vitest run lib/__tests__/storyParser.test.ts`

2. **Unit test for `loadStories`** — add to `lib/__tests__/config.test.ts`:
   - Returns empty array when no stories directory exists
   - Sorts stories by date descending
   - Run: `npx vitest run lib/__tests__/config.test.ts`

3. **Build check** — `npm run build` passes with no TypeScript errors

4. **Lint check** — `npm run lint` passes clean

### Manual Verification

1. Create a sample story at `content/stories/test-story.md` with mixed text + images
2. Run `npm run dev`, navigate to `/stories` — confirm the story card appears with cover image
3. Click into the story — confirm text renders with proper typography, images load with blur-up placeholders, and image pairs display side-by-side on desktop
4. Test mobile (375px) — confirm image pairs stack vertically and text is readable
5. Check `/stories` link appears in header nav
6. Check that removing all `content/stories/*.md` files makes the "Stories" nav link disappear
