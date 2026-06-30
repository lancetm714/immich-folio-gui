#!/bin/sh
# This entrypoint:
# 1. Maps PUID/PGID to the nextjs user for Synology NAS compatibility
# 2. Sources persisted env vars from content/.env (written by install wizard)
# 3. Auto-generates AUTH_SECRET if missing
# 4. Drops privileges and runs the Next.js server

# Map PUID/PGID to the nextjs user so bind-mounted files match host permissions
PUID=${PUID:-1001}
PGID=${PGID:-1001}

if [ "$PGID" != "1001" ]; then
  groupmod -o -g "$PGID" nodejs 2>/dev/null || true
fi
if [ "$PUID" != "1001" ]; then
  usermod -o -u "$PUID" nextjs 2>/dev/null || true
fi

if [ -d /app/content ]; then
  chown -R nextjs:nodejs /app/content 2>/dev/null || true

  # Source persisted env vars from content/.env (written by install wizard)
  if [ -f /app/content/.env ]; then
    set -a
    . /app/content/.env
    set +a
  fi

  # Auto-generate AUTH_SECRET if still not set and persist it
  if [ -z "$AUTH_SECRET" ]; then
    AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    echo "AUTH_SECRET=$AUTH_SECRET" >> /app/content/.env
    chown nextjs:nodejs /app/content/.env
  fi
fi

export AUTH_SECRET

# Drop privileges and run the app as nextjs
exec su-exec nextjs node server.js
