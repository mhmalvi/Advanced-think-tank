#!/bin/bash
# Advanced Think Tank blue-green deploy script
# Builds new image, verifies it in a temporary container, then swaps.
# Rolls back to the previous image if the new one fails health checks.
set -euo pipefail

LOG="/var/log/advanced-think-tank-deploy.log"
REPO="/opt/advanced-think-tank/repo"
COMPOSE_DIR="/opt/advanced-think-tank/repo"
GREEN_PORT=3001
APP_SERVICE="app"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') — $1" | tee -a "$LOG"; }

cleanup_green() {
  log "Cleaning up green container..."
  docker rm -f advanced-think-tank-green 2>/dev/null || true
}

log "Deploy triggered"

# Pull latest code
cd "$REPO"
git fetch origin main
BEFORE=$(git rev-parse HEAD)
git reset --hard origin/main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  log "No changes detected (${BEFORE:0:8}), skipping build"
  exit 0
fi

log "Updating from ${BEFORE:0:8} to ${AFTER:0:8}"

cd "$COMPOSE_DIR"

# Save current image so we can rollback
CURRENT_IMAGE=$(docker compose images --format json "$APP_SERVICE" 2>/dev/null | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Repository']+':'+d['Tag'])" 2>/dev/null || echo "")
if [ -n "$CURRENT_IMAGE" ] && [ "$CURRENT_IMAGE" != ":" ]; then
  log "Tagging current image as rollback: $CURRENT_IMAGE -> rollback"
  docker tag "$CURRENT_IMAGE" "${CURRENT_IMAGE%%:*}:rollback" 2>/dev/null || true
fi

# Build new image
log "Building new image..."
docker compose build "$APP_SERVICE" 2>&1 | tail -5 >> "$LOG"

# Get the newly built image name
NEW_IMAGE=$(docker compose images --format json "$APP_SERVICE" 2>/dev/null | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Repository']+':'+d['Tag'])" 2>/dev/null || echo "")
log "New image: ${NEW_IMAGE:-unknown}"

# Start a temporary green container on a different port to verify the build
cleanup_green
log "Starting green container on port $GREEN_PORT for verification..."
docker run -d \
  --name advanced-think-tank-green \
  --memory=512m \
  --cpus=0.5 \
  -p "127.0.0.1:${GREEN_PORT}:80" \
  "$NEW_IMAGE" 2>&1 >> "$LOG"

# Wait for green container to pass health check
log "Waiting for green container health check..."
GREEN_HEALTHY=false
for i in $(seq 1 30); do
  if wget --no-verbose --tries=1 --spider "http://127.0.0.1:${GREEN_PORT}/" 2>/dev/null; then
    GREEN_HEALTHY=true
    log "Green container healthy after ${i}s"
    break
  fi
  sleep 1
done

# Remove green container regardless of result
cleanup_green

if [ "$GREEN_HEALTHY" = false ]; then
  log "ERROR: Green container failed health check, rolling back image"
  # Rollback: restore previous image tag if we have one
  if [ -n "$CURRENT_IMAGE" ] && [ "$CURRENT_IMAGE" != ":" ]; then
    ROLLBACK_IMAGE="${CURRENT_IMAGE%%:*}:rollback"
    docker tag "$ROLLBACK_IMAGE" "$CURRENT_IMAGE" 2>/dev/null || true
    log "Restored previous image tag"
  fi
  exit 1
fi

# Green verified — now swap the real service
log "Green verified, swapping production container..."
docker compose up -d "$APP_SERVICE" 2>&1 >> "$LOG"

# Final health check on the live service
log "Verifying production deployment..."
PROD_HEALTHY=false
for i in $(seq 1 30); do
  if docker compose exec -T "$APP_SERVICE" wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ 2>/dev/null; then
    PROD_HEALTHY=true
    log "Production health check passed after ${i}s"
    break
  fi
  sleep 1
done

if [ "$PROD_HEALTHY" = false ]; then
  log "ERROR: Production health check failed after swap, attempting rollback"
  if [ -n "$CURRENT_IMAGE" ] && [ "$CURRENT_IMAGE" != ":" ]; then
    ROLLBACK_IMAGE="${CURRENT_IMAGE%%:*}:rollback"
    docker tag "$ROLLBACK_IMAGE" "$CURRENT_IMAGE" 2>/dev/null || true
    docker compose up -d "$APP_SERVICE" 2>&1 >> "$LOG"
    log "Rolled back to previous image"
  fi
  exit 1
fi

# Prune old images (including the rollback tag)
docker image prune -f >> "$LOG" 2>&1

log "Deploy complete (${AFTER:0:8})"
