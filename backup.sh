#!/bin/bash
set -e

BACKUP_DIR="$HOME/backups"
VOLUME_NAME="girvel_looper2_db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="looper2_$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

docker run --rm \
    -v "$VOLUME_NAME":/db \
    -v "$BACKUP_DIR":/backup \
    alpine sh -c "apk add --no-cache sqlite && sqlite3 /db/looper2.db \".backup '/backup/$FILENAME'\""
