FROM node:20-alpine AS base

# ── Dependencies ──────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Build ─────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Dummy env vars for build — pages are force-dynamic so these are
# never used at runtime, but Next.js page-data collection imports
# env.ts which runs Zod validation on import.
ENV IMMICH_API_URL="http://localhost:2283"
ENV IMMICH_API_KEY="build-placeholder"
ENV AUTH_SECRET="build-placeholder"

RUN npm run build

# ── Runtime ───────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 7211

ENV PORT=7211
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7211/api/health || exit 1

CMD ["node", "server.js"]
