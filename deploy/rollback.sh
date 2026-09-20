#!/usr/bin/env bash
# Runs ON THE SERVER. Switches the API back to an earlier release.
#   APP_DIR=/var/www/momento-api bash rollback.sh            # the release before the current one
#   APP_DIR=/var/www/momento-api bash rollback.sh <release>  # a specific release id (see: ls releases)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/momento-api}"
PORT="${PORT:-4000}"
CURRENT="$(readlink -f "$APP_DIR/current")"

if [ -n "${1:-}" ]; then
  TARGET="$APP_DIR/releases/$1"
else
  # Newest release that is not the live one.
  TARGET=""
  for dir in $(ls -1t "$APP_DIR/releases"); do
    if [ "$APP_DIR/releases/$dir" != "$CURRENT" ]; then TARGET="$APP_DIR/releases/$dir"; break; fi
  done
fi
[ -n "$TARGET" ] && [ -d "$TARGET/apps/api/dist" ] || { echo "No release to roll back to"; exit 1; }

echo "==> Rolling back $CURRENT -> $TARGET"
ln -sfn "$TARGET" "$APP_DIR/current"
cd "$APP_DIR/current/apps/api"
APP_DIR="$APP_DIR" pm2 startOrReload "$APP_DIR/current/deploy/ecosystem.config.cjs" --update-env
pm2 save >/dev/null

for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/health/ready" >/dev/null 2>&1; then
    echo "==> Healthy on $(basename "$TARGET")"
    exit 0
  fi
  sleep 2
done
echo "!! Rolled back, but /health/ready is not answering. Check: pm2 logs momento-api"
exit 1
