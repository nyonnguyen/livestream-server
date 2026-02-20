#!/bin/sh

# Auto-update script for livestream-server
# This script is triggered by the web UI "Update Now" button

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Ensure [UPDATE FAILED] is written on any unexpected exit
trap 'error "Script exited unexpectedly"; echo "[UPDATE FAILED]"' EXIT

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
    trap - EXIT
    exit 1
fi

log "Starting update process..."
log "Installation directory: $INSTALL_DIR"

cd "$INSTALL_DIR" || { error "Cannot cd to $INSTALL_DIR"; echo "[UPDATE FAILED]"; trap - EXIT; exit 1; }

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    error "Not a git repository"
    echo "[UPDATE FAILED]"
    trap - EXIT
    exit 1
fi

# Configure git to trust the mounted directory and set pull strategy
git config --global --add safe.directory "$INSTALL_DIR" 2>/dev/null || true
git config --global --add safe.directory "*" 2>/dev/null || true
git config pull.rebase false 2>/dev/null || true

# Log diagnostic info
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "unknown")
log "Remote URL: $REMOTE_URL"

# If remote is SSH, convert to HTTPS for container access
case "$REMOTE_URL" in
    git@github.com:*)
        HTTPS_URL="https://github.com/$(echo "$REMOTE_URL" | sed 's|git@github.com:||' | sed 's|\.git$||').git"
        warn "Remote uses SSH which won't work inside container. Switching to HTTPS..."
        log "Converting: $REMOTE_URL -> $HTTPS_URL"
        git remote set-url origin "$HTTPS_URL" 2>&1
        REMOTE_URL="$HTTPS_URL"
        ;;
esac

# Test connectivity
log "Testing connectivity to remote..."
if ! git ls-remote --exit-code origin HEAD >/dev/null 2>&1; then
    error "Cannot reach remote repository: $REMOTE_URL"
    log "Checking DNS resolution..."
    nslookup github.com 2>&1 || true
    echo "[UPDATE FAILED]"
    trap - EXIT
    exit 1
fi
log "Remote is reachable"

# Get current version and branch
CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "unknown")
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
log "Current version: $CURRENT_VERSION"
log "Current branch: $CURRENT_BRANCH"

# Fetch latest changes
log "Fetching latest changes from GitHub..."
if ! git fetch origin main 2>&1; then
    error "Failed to fetch from GitHub"
    echo "[UPDATE FAILED]"
    trap - EXIT
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
        trap - EXIT
        exit 1
    fi
fi

# Check if there are updates
if git diff --quiet HEAD origin/main; then
    log "Already up to date!"
    echo "[UPDATE COMPLETE]"
    trap - EXIT
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
    trap - EXIT
    exit 1
fi

# Get new version
NEW_VERSION=$(cat VERSION 2>/dev/null || echo "unknown")
log "New version: $NEW_VERSION"
log "Updated from version $CURRENT_VERSION to $NEW_VERSION"

# Check if running in container (web update)
if [ -f "/.dockerenv" ] || [ -d "/host_project" ]; then
    log "Detected container environment - performing automatic rebuild..."

    # Determine which docker compose command to use
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        error "Neither 'docker compose' nor 'docker-compose' found!"
        warn "Please rebuild containers manually:"
        warn "  cd /opt/livestream-server && docker compose up -d --build"
        echo "[UPDATE COMPLETE]"
        exit 0
    fi

    log "Using compose command: $COMPOSE_CMD"

    # Pull latest images (if using pre-built images)
    log "Pulling latest Docker images..."
    if ! $COMPOSE_CMD -f docker-compose.prod.yml pull 2>&1; then
        warn "Failed to pull images (may not exist), will build locally"
    fi

    # Stop containers
    log "Stopping containers..."
    if ! $COMPOSE_CMD down 2>&1; then
        error "Failed to stop containers"
        echo "[UPDATE FAILED]"
        exit 1
    fi

    # Build containers
    log "Building containers (this may take several minutes)..."
    if ! $COMPOSE_CMD build --no-cache 2>&1; then
        error "Failed to build containers"
        echo "[UPDATE FAILED]"
        exit 1
    fi

    # Start containers
    log "Starting containers..."
    if ! $COMPOSE_CMD up -d 2>&1; then
        error "Failed to start containers"
        echo "[UPDATE FAILED]"
        exit 1
    fi

    # Wait for services to be ready
    log "Waiting for services to initialize..."
    sleep 10

    # Check if containers are running
    RUNNING_CONTAINERS=$($COMPOSE_CMD ps --services --filter "status=running" 2>/dev/null | wc -l)
    TOTAL_CONTAINERS=$($COMPOSE_CMD ps --services 2>/dev/null | wc -l)

    log "Container status: $RUNNING_CONTAINERS/$TOTAL_CONTAINERS running"

    if [ "$RUNNING_CONTAINERS" -lt "$TOTAL_CONTAINERS" ]; then
        warn "Not all containers are running, check logs with: docker compose logs"
    fi

    log "Update and rebuild completed successfully!"
    log "All containers have been restarted with new version: $NEW_VERSION"
    echo "[UPDATE COMPLETE]"
else
    # Running locally - show manual instructions
    echo ""
    warn "================================================"
    warn "Code updated successfully!"
    warn ""
    warn "To apply the changes, please run:"
    warn "  1. cd /opt/livestream-server"
    warn "  2. docker compose build"
    warn "  3. docker compose up -d"
    warn "================================================"
    echo ""
    log "Update completed!"
    echo "[UPDATE COMPLETE]"
fi

# Clear the trap on successful exit
trap - EXIT
exit 0
