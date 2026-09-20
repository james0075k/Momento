#!/usr/bin/env bash
# Nightly MongoDB backup with mongodump. Needs the MongoDB Database Tools (mongodump) on the machine.
#
#   MONGODB_URI='mongodb+srv://...' BACKUP_DIR=/var/backups/momento bash backup-mongo.sh
#
# Cron (every night at 02:30):
#   30 2 * * *  MONGODB_URI='...' BACKUP_DIR=/var/backups/momento /var/www/momento-api/current/deploy/backup-mongo.sh >> /var/log/momento-backup.log 2>&1
#
# Copy the folder off the server too (see DEPLOYMENT.md): a backup on the same disk is not a backup.
set -euo pipefail

: "${MONGODB_URI:?Set MONGODB_URI}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/momento}"
KEEP_DAYS="${KEEP_DAYS:-14}"

umask 077
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/momento-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"

mongodump --uri="$MONGODB_URI" --gzip --archive="$FILE"
# A dump that is suspiciously small is a failed dump.
[ "$(stat -c %s "$FILE")" -gt 1024 ] || { echo "Backup $FILE is too small, treating as failed"; exit 1; }

# Optional off-server copy. Any rclone remote works (Google Drive, S3, Backblaze, another VPS over sftp):
#   OFFSITE_DEST='remote:momento-backups'  (set up once with `rclone config`)
if [ -n "${OFFSITE_DEST:-}" ]; then
  rclone copy "$FILE" "$OFFSITE_DEST" || { echo "Off-site copy to $OFFSITE_DEST FAILED"; exit 1; }
  echo "Copied off-site to $OFFSITE_DEST"
fi

find "$BACKUP_DIR" -name 'momento-*.archive.gz' -mtime +"$KEEP_DAYS" -delete
echo "Backup written: $FILE"
