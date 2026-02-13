# Immich Folio

A self-hosted photography portfolio powered by [Immich](https://immich.app). Turns your Immich albums into a beautiful, public-facing gallery — no database required.

## Features

- **Portfolio-style navigation** — horizontal nav bar with all your collections
- **Split hero homepage** — configurable hero image with navigation links
- **Subpage grouping** — organize albums under named collections (e.g. `/japan/tokyo-2023`)
- **Image proxy** — serves Immich assets without exposing your server or API key
- **Obfuscated URLs** — asset IDs are encrypted, never exposed to the public
- **Masonry photo grid** — responsive layout with lightbox viewer
- **EXIF metadata** — camera, lens, and settings displayed on demand
- **Aggressive caching** — configurable TTL for fast repeat loads

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USER/immich-lightbox.git
cd immich-lightbox
npm install

# Configure
cp .env.local.example .env.local
# Edit .env.local with your Immich server details

# Run
npm run dev
```

## Configuration

All configuration is done via environment variables in `.env.local`:

```env
# Required
IMMICH_API_URL=http://your-immich-server:2283
IMMICH_API_KEY=your-api-key

# Albums to publish (comma-separated UUIDs, optional labels)
LIGHTBOX_ALBUMS=Wedding:uuid-1, Vacation:uuid-2

# Group albums into subpages (one per line, wrap in quotes)
LIGHTBOX_SUBPAGES="
Japan > uuid-tokyo, uuid-kyoto
Italy > uuid-rome, uuid-florence
"

# Optional
SITE_TITLE=My Portfolio
SITE_SUBTITLE=Photography
HERO_IMAGE=asset-uuid-for-homepage
CACHE_TTL=300
```

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Vanilla CSS** (no framework)

## Docker

```bash
docker build -t immich-lightbox .
docker run -p 3000:3000 --env-file .env.local immich-lightbox
```

## License

Private — all rights reserved.
