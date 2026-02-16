#!/bin/bash

# Auto-update script for livestream-server
# This script is triggered by the web UI "Update Now" button

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Determine the installation directory
if [ -d "/opt/livestream-server" ]; then
    INSTALL_DIR="/opt/livestream-server"
elif [ -d "$HOME/livestream-server" ]; then
    INSTALL_DIR="$HOME/livestream-server"
else
    error "Cannot find livestream-server installation directory"
    echo "[UPDATE FAILED]"
    exit 1
fi

log "Starting update process..."
log "Installation directory: $INSTALL_DIR"

cd "$INSTALL_DIR" || exit 1

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    error "Not a git repository"
    echo "[UPDATE FAILED]"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "unknown")
log "Current version: $CURRENT_VERSION"

# Fetch latest changes
log "Fetching latest changes from GitHub..."
if ! git fetch origin main 2>&1; then
    error "Failed to fetch from GitHub"
    echo "[UPDATE FAILED]"
    exit 1
fi

# Check if there are updates
if git diff --quiet HEAD origin/main; then
    log "Already up to date!"
    echo "[UPDATE COMPLETE]"
    exit 0
fi

# Show what will be updated
log "Changes to be applied:"
git log --oneline HEAD..origin/main | head -5

# Pull latest code
log "Pulling latest code..."
if ! git pull origin main 2>&1; then
    error "Failed to pull latest code"
    echo "[UPDATE FAILED]"
    exit 1
fi

# Get new version
NEW_VERSION=$(cat VERSION 2>/dev/null || echo "unknown")
log "New version: $NEW_VERSION"

# Pull latest Docker images
log "Pulling latest Docker images..."
if ! docker compose pull 2>&1; then
    warn "Failed to pull Docker images, will rebuild locally"
fi

# Rebuild and restart containers
log "Rebuilding containers..."
if ! docker compose build 2>&1; then
    error "Failed to build containers"
    echo "[UPDATE FAILED]"
    exit 1
fi

log "Restarting services..."
if ! docker compose up -d 2>&1; then
    error "Failed to restart services"
    echo "[UPDATE FAILED]"
    exit 1
fi

# Wait for services to be healthy
log "Waiting for services to start..."
sleep 5

# Check if containers are running
RUNNING_CONTAINERS=$(docker compose ps --services --filter "status=running" | wc -l)
TOTAL_CONTAINERS=$(docker compose ps --services | wc -l)

if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_CONTAINERS" ]; then
    log "All containers are running!"
else
    warn "$RUNNING_CONTAINERS/$TOTAL_CONTAINERS containers running"
fi

log "Update completed successfully!"
log "Updated from version $CURRENT_VERSION to $NEW_VERSION"
echo "[UPDATE COMPLETE]"

exit 0
