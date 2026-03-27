#!/bin/bash
# Advanced Think Tank backup script — run via cron daily
# Backs up: n8n SQLite database, Docker volume data, .env files
set -euo pipefail

BACKUP_DIR="/opt/advanced-think-tank/backups"
DATE=$(date '+%Y%m%d_%H%M%S')
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

echo "$(date) — Starting backup"

# 1. Backup n8n SQLite database (copy from running container)
N8N_CONTAINER=$(docker ps -qf "name=n8n" 2>/dev/null || true)
if [ -n "$N8N_CONTAINER" ]; then
  docker cp "$N8N_CONTAINER":/home/node/.n8n/database.sqlite "$BACKUP_DIR/n8n_db_${DATE}.sqlite"
  echo "  n8n database backed up"
else
  echo "  WARN: n8n container not running, skipping DB backup"
fi

# 2. Backup environment files
if [ -f /opt/advanced-think-tank/repo/.env ]; then
  cp /opt/advanced-think-tank/repo/.env "$BACKUP_DIR/env_${DATE}.bak"
  echo "  .env backed up"
fi

# 3. Backup docker-compose config
cp /opt/advanced-think-tank/repo/docker-compose.yml "$BACKUP_DIR/docker-compose_${DATE}.yml"
echo "  docker-compose.yml backed up"

# 4. Compress all today's backups
ARCHIVE="$BACKUP_DIR/advanced-think-tank_backup_${DATE}.tar.gz"
cd "$BACKUP_DIR"
tar -czf "$ARCHIVE" *_${DATE}* 2>/dev/null && rm -f *_${DATE}.sqlite *_${DATE}.bak *_${DATE}.yml
echo "  Compressed to $ARCHIVE"

# 5. Remove backups older than retention period
find "$BACKUP_DIR" -name "advanced-think-tank_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "  Cleaned up backups older than ${RETENTION_DAYS} days"

echo "$(date) — Backup complete: $ARCHIVE"
