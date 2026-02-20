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
# If running in container, use current directory (which should be /host_project mounted from host)
if [ -f "/.dockerenv" ] || [ -d "/host_project" ]; then
    INSTALL_DIR="$(pwd)"
    log "Detected container environment, using current directory"
elif [ -d "/opt/livestream-server" ]; then
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

# Configure git to trust the mounted directory and set pull strategy
git config --global --add safe.directory "$INSTALL_DIR" 2>/dev/null || true
git config pull.rebase false 2>/dev/null || true

# Get current version and branch
CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "unknown")
CURRENT_BRANCH=$(git branch --show-current)
log "Current version: $CURRENT_VERSION"
log "Current branch: $CURRENT_BRANCH"

# Fetch latest changes
log "Fetching latest changes from GitHub..."
if ! git fetch origin main 2>&1; then
    error "Failed to fetch from GitHub"
    echo "[UPDATE FAILED]"
    exit 1
fi

# If not on main branch, switch to it
if [ "$CURRENT_BRANCH" != "main" ]; then
    warn "Currently on branch '$CURRENT_BRANCH', switching to 'main'..."

    # Stash any local changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log "Stashing local changes..."
        git stash push -m "Auto-stash before update at $(date)" 2>&1 || true
    fi

    # Switch to main branch
    if ! git checkout main 2>&1; then
        error "Failed to switch to main branch"
        echo "[UPDATE FAILED]"
        exit 1
    fi
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

echo ""
warn "================================================"
warn "Code updated successfully!"
warn "Updated from version $CURRENT_VERSION to $NEW_VERSION"
warn ""
warn "To apply the changes, please run:"
warn "  1. SSH to your server"
warn "  2. cd /opt/livestream-server"
warn "  3. docker compose build"
warn "  4. docker compose up -d"
warn ""
warn "The containers must be rebuilt manually to use"
warn "the new code. This ensures a safe update process."
warn "================================================"
echo ""

log "Update completed successfully!"
echo "[UPDATE COMPLETE]"

exit 0
