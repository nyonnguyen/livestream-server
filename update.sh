#!/bin/bash
#
# Nyon Livestream Server - Update Script
# Author: Nyon (nyonnguyen@gmail.com)
# Description: Updates the livestream server to the latest version
#
# Usage: ./update.sh [branch]
# Example: ./update.sh main
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/livestream-server"
BRANCH="${1:-main}"

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Nyon Livestream Server - Update Script                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${GREEN}==>${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Check if running in correct directory
check_directory() {
    if [ ! -f "VERSION" ] || [ ! -f "docker-compose.yml" ]; then
        print_error "Please run this script from the livestream-server directory"
        print_info "Expected location: $INSTALL_DIR"
        exit 1
    fi
}

# Get current version
get_current_version() {
    if [ -f "VERSION" ]; then
        CURRENT_VERSION=$(cat VERSION | tr -d '\n')
        print_info "Current version: $CURRENT_VERSION"
    else
        print_warning "VERSION file not found"
        CURRENT_VERSION="unknown"
    fi
}

# Check for uncommitted changes
check_uncommitted_changes() {
    print_step "Checking for uncommitted changes..."

    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        print_warning "You have uncommitted changes:"
        git status --short
        echo ""
        read -p "Continue anyway? This may cause conflicts. (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Update cancelled"
            exit 0
        fi
    else
        print_success "Working directory is clean"
    fi
}

# Backup configuration
backup_env() {
    print_step "Backing up configuration..."

    if [ -f ".env" ]; then
        BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env "$BACKUP_FILE"
        print_success "Configuration backed up to $BACKUP_FILE"
    else
        print_warning "No .env file found to backup"
    fi
}

# Check what will be updated
check_updates_available() {
    print_step "Checking for updates..."

    print_info "Branch: $BRANCH"
    git fetch origin

    # Get current commit
    CURRENT_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse origin/$BRANCH)

    if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
        print_success "Already up to date!"
        echo ""
        read -p "Continue anyway to rebuild containers? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Update cancelled"
            exit 0
        fi
        SKIP_GIT_PULL=true
    else
        # Show what commits will be pulled
        echo ""
        print_info "New commits available:"
        echo ""
        git log --oneline --decorate --color HEAD..origin/$BRANCH | head -10
        echo ""

        # Show if there are more commits
        COMMIT_COUNT=$(git rev-list --count HEAD..origin/$BRANCH)
        if [ "$COMMIT_COUNT" -gt 10 ]; then
            print_info "...and $((COMMIT_COUNT - 10)) more commits"
            echo ""
        fi

        read -p "Do you want to update? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Update cancelled"
            exit 0
        fi
        SKIP_GIT_PULL=false
    fi
}

# Pull latest code
pull_updates() {
    if [ "$SKIP_GIT_PULL" = true ]; then
        print_info "Skipping git pull (already up to date)"
        return
    fi

    print_step "Pulling latest code from GitHub..."

    git checkout "$BRANCH"
    git pull origin "$BRANCH"

    print_success "Code updated successfully"
}

# Get new version
get_new_version() {
    if [ -f "VERSION" ]; then
        NEW_VERSION=$(cat VERSION | tr -d '\n')
        print_success "New version: $NEW_VERSION"
    else
        NEW_VERSION="unknown"
    fi
}

# Determine compose command
get_compose_command() {
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
}

# Pull Docker images
pull_images() {
    print_step "Pulling latest Docker images..."

    # Try to pull pre-built images
    if docker pull ghcr.io/nyonnguyen/livestream-server/web-api:latest &> /dev/null && \
       docker pull ghcr.io/nyonnguyen/livestream-server/web-ui:latest &> /dev/null; then
        print_success "Pulled pre-built images"
        USE_PROD=true
    else
        print_warning "Pre-built images not available"
        USE_PROD=false
    fi

    # Pull SRS image
    docker pull ossrs/srs:5 &> /dev/null || true

    print_success "Docker images updated"
}

# Restart services
restart_services() {
    print_step "Restarting services..."

    if [ "$USE_PROD" = true ] && [ -f "docker-compose.prod.yml" ]; then
        print_info "Using production configuration"
        $COMPOSE_CMD -f docker-compose.prod.yml down
        $COMPOSE_CMD -f docker-compose.prod.yml up -d
    else
        print_info "Building and starting services"
        $COMPOSE_CMD down
        $COMPOSE_CMD up -d --build
    fi

    print_success "Services restarted"
}

# Wait for services to be ready
wait_for_services() {
    print_step "Waiting for services to start..."

    MAX_WAIT=60
    ELAPSED=0

    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "Services are ready!"
            return
        fi
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        echo -n "."
    done

    echo ""
    print_warning "Services may still be starting (this can take a few minutes)"
    print_info "Check status with: $COMPOSE_CMD logs -f"
}

# Show service status
show_status() {
    print_step "Service status..."

    $COMPOSE_CMD ps
}

# Display success message
display_success() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Update Successful! 🎉                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
        echo -e "${BLUE}📦 Version:${NC} $CURRENT_VERSION → $NEW_VERSION"
    else
        echo -e "${BLUE}📦 Version:${NC} $NEW_VERSION (no version change)"
    fi

    echo -e "${BLUE}🌐 Web Interface:${NC} http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "1. Test your streams to ensure everything works"
    echo "2. Check the web interface for any changes"
    echo "3. Review the changelog for new features"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  Status:  $COMPOSE_CMD ps"
    echo "  Logs:    $COMPOSE_CMD logs -f"
    echo "  Restart: $COMPOSE_CMD restart"
    echo ""
}

# Rollback function
show_rollback_info() {
    echo -e "${YELLOW}If you encounter issues:${NC}"
    echo "1. Restore config: cp .env.backup.* .env"
    echo "2. Rollback code: git checkout <previous-commit>"
    echo "3. Restart: $COMPOSE_CMD restart"
    echo ""
}

# Main update flow
main() {
    print_header

    check_directory
    get_current_version
    check_uncommitted_changes
    check_updates_available
    backup_env
    pull_updates
    get_new_version
    get_compose_command
    pull_images
    restart_services
    wait_for_services
    show_status
    display_success
    show_rollback_info
}

# Run update
main
