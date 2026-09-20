#!/usr/bin/env bash
# Copy the whole database from one MongoDB to another (new Atlas cluster, new provider, new region,
# or a local copy for testing). It streams straight from one to the other: nothing is written to disk.
#
#   SOURCE_URI='mongodb+srv://old...' TARGET_URI='mongodb+srv://new...' bash transfer-mongo.sh
#
#   SOURCE_DB / TARGET_DB   database names (default: momento for both)
#
# Safe order for a real move (see DEPLOYMENT.md, "Moving the database"):
#   1. run this once to test, into an empty target;  2. put the shop in a quiet moment, run it again
#   with a fresh empty target;  3. change MONGODB_URI in the API's .env and restart;  4. keep the old one a week.
set -euo pipefail

: "${SOURCE_URI:?Set SOURCE_URI}"
: "${TARGET_URI:?Set TARGET_URI}"
[ "$SOURCE_URI" != "$TARGET_URI" ] || { echo "SOURCE_URI and TARGET_URI are the same"; exit 1; }
SOURCE_DB="${SOURCE_DB:-momento}"
TARGET_DB="${TARGET_DB:-momento}"

mongodump --uri="$SOURCE_URI" --db="$SOURCE_DB" --gzip --archive |
  mongorestore --uri="$TARGET_URI" --gzip --archive \
    --nsFrom="$SOURCE_DB.*" --nsTo="$TARGET_DB.*"
echo "Copied $SOURCE_DB to $TARGET_DB. Now compare the counts (see DEPLOYMENT.md) before switching over."
