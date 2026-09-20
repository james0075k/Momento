#!/usr/bin/env bash
# Restore a backup made by backup-mongo.sh into a database you choose.
#
#   TARGET_URI='mongodb+srv://...' ARCHIVE=/var/backups/momento/momento-<date>.archive.gz bash restore-mongo.sh
#
# By default it restores into a NEW database (momento_restore) next to the live one, so nothing is
# overwritten: check the data, then point MONGODB_URI at it or copy what you need.
#
#   SOURCE_DB   database name inside the backup            (default: momento)
#   TARGET_DB   database to restore into                   (default: momento_restore)
#
# Restoring over the live database drops each collection first, so it asks for a second, explicit yes:
#   TARGET_DB=momento I_UNDERSTAND_THIS_OVERWRITES=yes ...
set -euo pipefail

: "${TARGET_URI:?Set TARGET_URI}"
: "${ARCHIVE:?Set ARCHIVE to the .archive.gz file}"
SOURCE_DB="${SOURCE_DB:-momento}"
TARGET_DB="${TARGET_DB:-momento_restore}"

[ -s "$ARCHIVE" ] || { echo "Backup file not found or empty: $ARCHIVE"; exit 1; }

DROP=()
if [ "$TARGET_DB" = "$SOURCE_DB" ]; then
  [ "${I_UNDERSTAND_THIS_OVERWRITES:-}" = "yes" ] || {
    echo "TARGET_DB is the live database ($TARGET_DB). This replaces its data."
    echo "Set I_UNDERSTAND_THIS_OVERWRITES=yes if you really mean it (take a fresh backup first)."
    exit 1
  }
  DROP=(--drop)
fi

mongorestore --uri="$TARGET_URI" --gzip --archive="$ARCHIVE" \
  --nsFrom="$SOURCE_DB.*" --nsTo="$TARGET_DB.*" ${DROP[@]+"${DROP[@]}"}
echo "Restored $ARCHIVE into database $TARGET_DB"
