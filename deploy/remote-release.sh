#!/usr/bin/env bash
# Runs ON THE SERVER (piped over SSH by .github/workflows/deploy.yml).
#   APP_DIR=/var/www/momento-api bash remote-release.sh <release-id>
#
# Layout under APP_DIR:
#   releases/<id>/   one folder per deploy (uploaded by the workflow)
#   current          symlink to the live release
#   shared/.env      production secrets, never in git
#
# If the new release does not answer /health/ready, this switches back to the previous one and
# exits non-zero, so the GitHub job fails and the site keeps running the old version.
set -euo pipefail

RELEASE_ID="${1:?usage: remote-release.sh <release-id>}"
APP_DIR="${APP_DIR:-/var/www/momento-api}"
PORT="${PORT:-4000}"
KEEP=5

RELEASE="$APP_DIR/releases/$RELEASE_ID"
[ -d "$RELEASE/apps/api/dist" ] || { echo "Release $RELEASE_ID was not uploaded"; exit 1; }
[ -f "$APP_DIR/shared/.env" ] || { echo "Missing $APP_DIR/shared/.env (see DEPLOYMENT.md)"; exit 1; }

PREVIOUS=""
if [ -L "$APP_DIR/current" ]; then PREVIOUS="$(readlink -f "$APP_DIR/current")"; fi

echo "==> Installing production dependencies"
cd "$RELEASE"
ln -sfn "$APP_DIR/shared/.env" "$RELEASE/.env"
pnpm install --frozen-lockfile --prod --filter "@momento/api..."

start_release() {
  # Fork mode restarts the process, so there is a second or two of downtime. One instance on purpose:
  # the rate limiter keeps its counters in memory, and a second instance would split them.
  ln -sfn "$1" "$APP_DIR/current"
  cd "$APP_DIR/current/apps/api"
  APP_DIR="$APP_DIR" pm2 startOrReload "$APP_DIR/current/deploy/ecosystem.config.cjs" --update-env
  pm2 save >/dev/null
}

healthy() {
  for _ in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:$PORT/health/ready" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

echo "==> Switching to $RELEASE_ID"
start_release "$RELEASE"

if healthy; then
  echo "==> Healthy. Release $RELEASE_ID is live."
else
  echo "!! /health/ready failed after deploy"
  pm2 logs momento-api --lines 30 --nostream || true
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
    echo "==> Rolling back to $PREVIOUS"
    start_release "$PREVIOUS"
    healthy && echo "==> Rolled back; previous release is serving." || echo "!! Previous release is not healthy either"
  fi
  exit 1
fi

echo "==> Removing old releases (keeping $KEEP)"
cd "$APP_DIR/releases"
# shellcheck disable=SC2012
ls -1t | tail -n +$((KEEP + 1)) | while read -r old; do
  [ "$APP_DIR/releases/$old" = "$(readlink -f "$APP_DIR/current")" ] || rm -rf "$APP_DIR/releases/$old"
done
