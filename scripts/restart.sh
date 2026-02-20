#!/bin/bash

# Restart script for livestream-server
# Forces a complete restart of all containers with current source code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Parse command line arguments
REBUILD=false
NO_CACHE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            REBUILD=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            REBUILD=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --rebuild     Rebuild containers before restarting"
            echo "  --no-cache    Rebuild without using cache (implies --rebuild)"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Quick restart"
            echo "  $0 --rebuild          # Rebuild and restart"
            echo "  $0 --no-cache         # Full rebuild from scratch"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Determine installation directory
if [ -d "/opt/livestream-server" ]; then
    INSTALL_DIR="/opt/livestream-server"
elif [ -d "$HOME/livestream-server" ]; then
    INSTALL_DIR="$HOME/livestream-server"
else
    error "Cannot find livestream-server installation directory"
    exit 1
fi

log "Livestream Server Restart Script"
log "Installation directory: $INSTALL_DIR"

cd "$INSTALL_DIR" || exit 1

# Get current version
CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "unknown")
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

info "Current version: $CURRENT_VERSION"
info "Current branch: $CURRENT_BRANCH"
echo ""

# Show current container status
log "Current container status:"
docker compose ps
echo ""

# Stop all containers
log "Stopping all containers..."
docker compose down

if [ $? -ne 0 ]; then
    error "Failed to stop containers"
    exit 1
fi

log "All containers stopped"
echo ""

# Rebuild if requested
if [ "$REBUILD" = true ]; then
    if [ "$NO_CACHE" = true ]; then
        log "Rebuilding containers without cache (this may take several minutes)..."
        docker compose build --no-cache
    else
        log "Rebuilding containers..."
        docker compose build
    fi

    if [ $? -ne 0 ]; then
        error "Failed to rebuild containers"
        exit 1
    fi

    log "Containers rebuilt successfully"
    echo ""
fi

# Start all containers
log "Starting all containers..."
docker compose up -d

if [ $? -ne 0 ]; then
    error "Failed to start containers"
    exit 1
fi

log "Containers started"
echo ""

# Wait for services to be ready
log "Waiting for services to initialize..."
sleep 10

# Check container status
log "Checking container status..."
RUNNING_CONTAINERS=$(docker compose ps --services --filter "status=running" | wc -l)
TOTAL_CONTAINERS=$(docker compose ps --services | wc -l)

echo ""
docker compose ps
echo ""

# Health check
log "Performing health checks..."

# Check API health
if command -v curl &> /dev/null; then
    info "Testing API endpoint..."
    if curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log "✅ API is responding"
    else
        warn "⚠️  API health check failed (may still be starting up)"
    fi
else
    warn "curl not installed, skipping health check"
fi

echo ""

# Summary
if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_CONTAINERS" ]; then
    log "╔════════════════════════════════════════════════════════╗"
    log "║          ✅ All Containers Running Successfully        ║"
    log "╚════════════════════════════════════════════════════════╝"
else
    warn "╔════════════════════════════════════════════════════════╗"
    warn "║    ⚠️  Some Containers May Not Be Running            ║"
    warn "╚════════════════════════════════════════════════════════╝"
    warn "$RUNNING_CONTAINERS/$TOTAL_CONTAINERS containers are running"
    warn "Check logs with: docker compose logs"
fi

echo ""
info "Restart completed!"
echo ""
info "Useful commands:"
info "  - View logs: docker compose logs -f"
info "  - Check status: docker compose ps"
info "  - Stop: docker compose down"
echo ""

exit 0
