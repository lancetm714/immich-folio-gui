# Immich Folio

A self-hosted photography portfolio powered by [Immich](https://immich.app). Turns your Immich albums into a beautiful, public-facing gallery — without ever exposing your Immich server to the internet.

Immich Folio acts as a **secure reverse proxy** between your visitors and your private Immich instance. Your Immich server stays on your local network, completely invisible to the outside world.

## Features

- **Portfolio-style navigation** — horizontal nav bar with all your collections
- **Split hero homepage** — configurable hero image with navigation links
- **Subpage grouping** — organize albums under named collections (e.g. `/japan/tokyo-2023`)
- **Masonry photo grid** — responsive layout with lightbox viewer
- **EXIF metadata** — camera, lens, and settings displayed on demand
- **Aggressive caching** — configurable TTL for fast repeat loads

## Security

Immich Folio adds a full security layer between the public internet and your Immich instance:

| Concern | Protection |
|---------|-----------|
| **Server exposure** | Immich URL and port are never sent to the browser — all requests are proxied server-side |
| **API key** | Stored only in `.env.local`, never included in client-side code or responses |
| **Asset IDs** | Immich UUIDs are encrypted (AES-256) into opaque tokens — visitors cannot guess or enumerate asset IDs |
| **Album scope** | Only albums explicitly listed in `LIGHTBOX_ALBUMS` are accessible — everything else is blocked |
| **No direct access** | Visitors interact only with the Next.js app; they have zero knowledge of your Immich server's existence |

## Quick Start

```bash
# Clone and install
git clone https://github.com/ralksta/immich-folio.git
cd immich-folio
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
docker build -t immich-folio .
docker run -p 3000:3000 --env-file .env.local immich-folio
```

## License

Private — all rights reserved.
