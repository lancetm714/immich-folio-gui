# Gallery Configuration

All gallery structure is defined in `content/gallery.yaml`. Copy the example to get started:

```bash
cp content/gallery.yaml.example content/gallery.yaml
```

## Hero Images

Single image or crossfade carousel on the homepage:

```yaml
# Single hero image
hero: 00000000-0000-0000-0000-000000000000

# Carousel (crossfade between multiple images)
hero:
  - 00000000-0000-0000-0000-000000000000
  - 11111111-1111-1111-1111-111111111111
  - 22222222-2222-2222-2222-222222222222
```

## Standalone Albums

Albums shown directly on the homepage as cards:

```yaml
albums:
  - 11111111-1111-1111-1111-111111111111
  - 22222222-2222-2222-2222-222222222222
```

## Subpages

Group multiple albums into named collections. URLs are auto-generated from the name:

```yaml
subpages:
  - name: Japan                    # → /japan
    albums:
      - 33333333-3333-3333-3333-333333333333  # Tokyo
      - 44444444-4444-4444-4444-444444444444  # Kyoto

  - name: Wedding – Smith         # → /wedding-smith
    password: clientpass123        # password-protected
    albums:
      - 55555555-5555-5555-5555-555555555555
```

## Grid Layout

Configure the photo grid globally or per-subpage:

```yaml
# Global defaults
grid:
  columns: 3            # number of columns (default: 3)
  gap: 12               # gap in pixels (default: 12)
  aspectRatio: "1"       # "1", "3/2", "auto", etc. (default: "1")
  layout: masonry        # "masonry" or "uniform" (default: "masonry")

subpages:
  - name: Japan
    grid:                # per-subpage override
      columns: 4
      layout: uniform
      aspectRatio: "3/2"
    albums:
      - ...
```

## EXIF on Hover

Show camera/lens/settings when hovering over photos (enabled by default):

```yaml
exifOnHover: false    # set to false to disable
```

## Footer

Optional minimal footer with social links:

```yaml
footer:
  name: John Doe
  instagram: johndoe
  email: hello@example.com
  website: https://example.com
```

## About Page

Create `content/about.md` with YAML frontmatter:

```markdown
---
portrait: asset-uuid-for-your-portrait
name: Your Name
location: City, Country
gear:
  - Camera Body
  - Favorite Lens
---

Your bio text here. Supports full Markdown.
```

## Finding UUIDs

- **Album UUIDs**: In Immich, go to Albums → click an album → the UUID is in the URL bar
- **Asset UUIDs**: Click any photo → the UUID is in the URL bar
