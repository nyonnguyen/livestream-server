#!/bin/bash
#
# Nyon Livestream Server - One-Command Installer for Raspberry Pi
# Author: Nyon (nyonnguyen@gmail.com)
# Description: Installs and configures livestream server with auto-start on boot
#
# Usage: curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
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
GITHUB_REPO="https://github.com/nyonnguyen/livestream-server.git"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Nyon Livestream Server - Installation Script          ║"
    echo "║                    Raspberry Pi 3 Edition                      ║"
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

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root or with sudo"
        print_info "The script will request sudo permissions when needed"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    print_step "Checking system requirements..."

    # Check if running on Raspberry Pi
    if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        print_warning "This script is optimized for Raspberry Pi 3+"
    fi

    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" != "aarch64" ]] && [[ "$ARCH" != "armv7l" ]]; then
        print_warning "Detected architecture: $ARCH (recommended: aarch64)"
    fi

    # Check available memory
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_MEM" -lt 900 ]; then
        print_error "Insufficient memory: ${TOTAL_MEM}MB (minimum: 1GB)"
        exit 1
    fi
    print_success "Memory check passed: ${TOTAL_MEM}MB available"

    # Check disk space
    AVAILABLE_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 2 ]; then
        print_error "Insufficient disk space: ${AVAILABLE_SPACE}GB (minimum: 2GB)"
        exit 1
    fi
    print_success "Disk space check passed: ${AVAILABLE_SPACE}GB available"
}

# Install Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker is already installed ($(docker --version))"
        return
    fi

    print_step "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh

    # Add current user to docker group
    sudo usermod -aG docker $USER
    print_success "Docker installed successfully"
    print_warning "You may need to log out and back in for docker group changes to take effect"
}

# Check Docker Compose
check_docker_compose() {
    # Check for Docker Compose v2 (comes with Docker)
    if docker compose version &> /dev/null; then
        print_success "Docker Compose v2 is available ($(docker compose version))"
        return 0
    fi

    # Check for legacy docker-compose v1
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose v1 is available ($(docker-compose --version))"
        print_info "Note: Docker Compose v2 is recommended. The script will use v1."
        return 0
    fi

    print_error "Docker Compose not found!"
    print_info "Docker Compose v2 should be installed with Docker."
    print_info "If using older Docker, install Compose with:"
    print_info "  sudo apt-get install docker-compose-plugin"
    return 1
}

# Helper function to run docker-compose commands (supports both v1 and v2)
run_compose() {
    if docker compose version &> /dev/null; then
        # Use Docker Compose v2
        docker compose "$@"
    else
        # Use Docker Compose v1
        docker-compose "$@"
    fi
}

# Clone or update repository
setup_repository() {
    print_step "Setting up repository..."

    if [ -d "$INSTALL_DIR" ]; then
        print_info "Repository already exists, updating..."
        cd "$INSTALL_DIR"
        sudo git fetch origin
        sudo git checkout "$GITHUB_BRANCH"
        sudo git pull origin "$GITHUB_BRANCH"
    else
        print_info "Cloning repository..."
        sudo mkdir -p "$INSTALL_DIR"
        sudo chown $USER:$USER "$INSTALL_DIR"
        git clone -b "$GITHUB_BRANCH" "$GITHUB_REPO" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    print_success "Repository ready at $INSTALL_DIR"
}

# Generate random secrets
generate_secrets() {
    print_step "Generating secure secrets..."

    JWT_SECRET=$(openssl rand -hex 32)
    ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)
    STREAM_KEY_1=$(openssl rand -hex 16)
    STREAM_KEY_2=$(openssl rand -hex 16)
    STREAM_KEY_3=$(openssl rand -hex 16)

    print_success "Secrets generated"
}

# Setup environment configuration
setup_environment() {
    print_step "Configuring environment..."

    cd "$INSTALL_DIR"

    if [ -f ".env" ]; then
        print_info "Environment file already exists, backing up..."
        sudo cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi

    # Detect server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')

    # Create .env file
    cat > .env <<EOF
# Server Configuration
SERVER_IP=$SERVER_IP
NODE_ENV=production

# Security (Auto-generated)
JWT_SECRET=$JWT_SECRET
DEFAULT_ADMIN_PASSWORD=$ADMIN_PASSWORD

# Stream Configuration
MAX_CONCURRENT_STREAMS=3
DEFAULT_STREAM_KEY_1=dronestream1_$STREAM_KEY_1
DEFAULT_STREAM_KEY_2=phonestream1_$STREAM_KEY_2
DEFAULT_STREAM_KEY_3=camerastream1_$STREAM_KEY_3

# Database
DB_PATH=/app/data/livestream.db

# SRS API
SRS_HTTP_API_URL=http://srs:1985/api/v1

# API Configuration
API_PORT=3000
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX_REQUESTS=5
EOF

    print_success "Environment configured"
    print_info "Server IP: $SERVER_IP"
    print_info "Admin password: $ADMIN_PASSWORD (Save this!)"
}

# Pull or build Docker images
setup_docker_images() {
    print_step "Setting up Docker images..."

    cd "$INSTALL_DIR"

    # Try to pull pre-built images first
    if docker pull ghcr.io/nyonnguyen/livestream-server/web-api:latest &> /dev/null && \
       docker pull ghcr.io/nyonnguyen/livestream-server/web-ui:latest &> /dev/null; then
        print_success "Pulled pre-built images from GitHub Container Registry"
        USE_PROD=true
    else
        print_warning "Pre-built images not available, building locally..."
        print_info "This may take 10-15 minutes on Raspberry Pi 3..."
        USE_PROD=false
    fi
}

# Start the application
start_application() {
    print_step "Starting application..."

    cd "$INSTALL_DIR"

    # Create data directory
    mkdir -p data

    # Start services
    if [ "$USE_PROD" = true ]; then
        run_compose -f docker-compose.prod.yml up -d
    else
        run_compose up -d --build
    fi

    print_success "Application started"
}

# Setup systemd service for auto-start on boot
setup_systemd_service() {
    print_step "Setting up auto-start on boot..."

    # Determine which docker-compose command to use
    local COMPOSE_CMD
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    # Determine compose file
    local COMPOSE_FILE="docker-compose.yml"
    if [ "$USE_PROD" = true ]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    fi

    sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Nyon Livestream Server
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=$COMPOSE_CMD -f $COMPOSE_FILE up -d
ExecStop=$COMPOSE_CMD -f $COMPOSE_FILE down
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}.service

    print_success "Auto-start on boot enabled"
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
}

# Display success message
display_success() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  Installation Successful! 🎉                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📍 Installation Directory:${NC} $INSTALL_DIR"
    echo -e "${BLUE}🌐 Web Interface:${NC} http://$SERVER_IP"
    echo -e "${BLUE}🔑 Admin Username:${NC} admin"
    echo -e "${BLUE}🔒 Admin Password:${NC} $ADMIN_PASSWORD"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Save your admin password!${NC}"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "1. Access web interface: http://$SERVER_IP"
    echo "2. Login with username 'admin' and password above"
    echo "3. Change your password in Settings"
    echo "4. Configure your streams in the Streams tab"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  Start:   sudo systemctl start $SERVICE_NAME"
    echo "  Stop:    sudo systemctl stop $SERVICE_NAME"
    echo "  Restart: sudo systemctl restart $SERVICE_NAME"
    echo "  Status:  sudo systemctl status $SERVICE_NAME"
    echo "  Logs:    docker-compose logs -f"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "  GitHub: https://github.com/nyonnguyen/livestream-server"
    echo "  Help:   http://$SERVER_IP/help"
    echo ""
    echo -e "${GREEN}🚀 Your livestream server is now running and will auto-start on boot!${NC}"
    echo ""
}

# Main installation flow
main() {
    print_header

    check_root
    check_requirements
    install_docker
    check_docker_compose || exit 1
    setup_repository
    generate_secrets
    setup_environment
    setup_docker_images
    start_application
    setup_systemd_service
    wait_for_services
    display_success
}

# Run installation
main
