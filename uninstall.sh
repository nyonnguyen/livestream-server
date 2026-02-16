#!/bin/bash
#
# Nyon Livestream Server - Uninstall Script
# Author: Nyon (nyonnguyen@gmail.com)
# Description: Complete removal of livestream server
#
# Usage:
#   ./uninstall.sh                  # Remove app only (keep Docker)
#   ./uninstall.sh --full           # Remove app + Docker
#   ./uninstall.sh --keep-data      # Remove app but keep database
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
SERVICE_NAME="livestream-server"

# Parse arguments
KEEP_DATA=false
REMOVE_DOCKER=false

for arg in "$@"; do
    case $arg in
        --full)
            REMOVE_DOCKER=true
            ;;
        --keep-data)
            KEEP_DATA=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  (no args)        Remove application only (keep Docker installed)"
            echo "  --full           Remove application AND Docker"
            echo "  --keep-data      Keep database and configuration files"
            echo "  --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Standard uninstall"
            echo "  $0 --full             # Complete removal"
            echo "  $0 --keep-data        # Preserve your data"
            exit 0
            ;;
    esac
done

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║       Nyon Livestream Server - Uninstall Script               ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${GREEN}==>${NC} $1"
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

# Confirmation prompt
confirm_uninstall() {
    echo ""
    echo -e "${YELLOW}WARNING: This will remove the livestream server!${NC}"
    echo ""
    echo "What will be removed:"
    echo "  - Docker containers and images"
    echo "  - Application files in $INSTALL_DIR"
    if [ "$KEEP_DATA" = false ]; then
        echo "  - Database and configuration (--keep-data NOT set)"
    else
        echo "  - Database and configuration will be PRESERVED"
    fi
    echo "  - Systemd service"
    if [ "$REMOVE_DOCKER" = true ]; then
        echo "  - Docker and Docker Compose (--full flag set)"
    fi
    echo ""

    read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
    echo
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo "Uninstall cancelled."
        exit 1
    fi
}

# Stop and remove containers
stop_containers() {
    print_step "Stopping containers..."

    if [ -d "$INSTALL_DIR" ]; then
        cd "$INSTALL_DIR"

        # Try docker compose v2
        if docker compose version &> /dev/null; then
            if [ "$KEEP_DATA" = true ]; then
                docker compose down 2>/dev/null || true
            else
                docker compose down -v 2>/dev/null || true
            fi
        # Try docker-compose v1
        elif command -v docker-compose &> /dev/null; then
            if [ "$KEEP_DATA" = true ]; then
                docker-compose down 2>/dev/null || true
            else
                docker-compose down -v 2>/dev/null || true
            fi
        fi

        print_success "Containers stopped and removed"
    else
        print_warning "Installation directory not found, skipping container removal"
    fi
}

# Remove systemd service
remove_service() {
    print_step "Removing systemd service..."

    if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
        sudo systemctl stop $SERVICE_NAME
        print_success "Service stopped"
    fi

    if systemctl is-enabled --quiet $SERVICE_NAME 2>/dev/null; then
        sudo systemctl disable $SERVICE_NAME
        print_success "Service disabled"
    fi

    if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
        sudo rm "/etc/systemd/system/${SERVICE_NAME}.service"
        sudo systemctl daemon-reload
        print_success "Service file removed"
    fi
}

# Backup data if keeping
backup_data() {
    if [ "$KEEP_DATA" = true ] && [ -d "$INSTALL_DIR/data" ]; then
        print_step "Backing up data..."

        BACKUP_DIR="$HOME/livestream-backup-$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"

        # Copy database and .env
        cp -r "$INSTALL_DIR/data" "$BACKUP_DIR/" 2>/dev/null || true
        cp "$INSTALL_DIR/.env" "$BACKUP_DIR/" 2>/dev/null || true

        print_success "Data backed up to: $BACKUP_DIR"
        echo -e "${BLUE}ℹ${NC} Restore later by copying files back to $INSTALL_DIR"
    fi
}

# Remove application files
remove_application() {
    print_step "Removing application files..."

    if [ -d "$INSTALL_DIR" ]; then
        backup_data
        sudo rm -rf "$INSTALL_DIR"
        print_success "Application files removed"
    else
        print_warning "Installation directory not found"
    fi
}

# Remove Docker images
remove_images() {
    print_step "Removing Docker images..."

    # Remove livestream-specific images
    docker images | grep -E "livestream|ghcr.io/nyonnguyen/livestream-server" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

    # Remove SRS image
    docker rmi ossrs/srs:5 2>/dev/null || true

    # Remove nginx alpine
    docker rmi nginx:alpine 2>/dev/null || true

    print_success "Docker images removed"
}

# Remove Docker completely
remove_docker() {
    print_step "Removing Docker..."

    # Stop Docker service
    sudo systemctl stop docker 2>/dev/null || true

    # Remove Docker packages
    sudo apt-get remove -y docker.io docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
    sudo apt-get autoremove -y

    # Remove Docker data
    sudo rm -rf /var/lib/docker
    sudo rm -rf /var/lib/containerd

    print_success "Docker removed"
}

# Clean up system
cleanup_system() {
    print_step "Cleaning up system..."

    # Remove any leftover files
    rm -f ~/get-docker.sh 2>/dev/null || true

    print_success "System cleaned"
}

# Display final message
display_completion() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              Uninstallation Completed Successfully!            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$KEEP_DATA" = true ]; then
        echo -e "${BLUE}📦 Your data has been backed up${NC}"
        echo ""
    fi

    echo -e "${GREEN}What was removed:${NC}"
    echo "  ✓ Docker containers and volumes"
    echo "  ✓ Application files"
    echo "  ✓ Systemd service"

    if [ "$REMOVE_DOCKER" = true ]; then
        echo "  ✓ Docker and Docker Compose"
    fi

    echo ""
    echo -e "${BLUE}To reinstall:${NC}"
    echo "  curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash"
    echo ""
}

# Main uninstall flow
main() {
    print_header
    confirm_uninstall

    stop_containers
    remove_service
    remove_application

    if [ "$REMOVE_DOCKER" = false ]; then
        remove_images
    fi

    if [ "$REMOVE_DOCKER" = true ]; then
        remove_docker
    fi

    cleanup_system
    display_completion
}

# Run uninstall
main
