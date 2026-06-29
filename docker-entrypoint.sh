#!/bin/sh
# Ensure the content directory is writable by the nextjs user (UID 1001).
# This is needed when ./content is bind-mounted from the host.

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
