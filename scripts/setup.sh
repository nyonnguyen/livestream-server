#!/bin/bash

# Livestream Server Setup Script
# This script helps with initial setup on Raspberry Pi

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   Livestream Server Setup                             ║"
echo "║   For Raspberry Pi 3/4/5                              ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ]; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    echo "   The setup will continue but may not work as expected"
    echo ""
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo ""
    echo "Install Docker with:"
    echo "  curl -sSL https://get.docker.com | sh"
    echo "  sudo usermod -aG docker \$USER"
    echo "  newgrp docker"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    echo ""
    echo "Install Docker Compose with:"
    echo "  sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "  sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo "✓ Docker installed: $(docker --version)"
echo "✓ Docker Compose installed: $(docker-compose --version)"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env

    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    if [ -n "$SERVER_IP" ]; then
        sed -i "s/SERVER_IP=.*/SERVER_IP=$SERVER_IP/" .env
        echo "✓ Set SERVER_IP=$SERVER_IP"
    fi

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    echo "✓ Generated JWT_SECRET"

    # Generate random stream keys
    STREAM_KEY_1="drone001_$(openssl rand -hex 16)"
    STREAM_KEY_2="phone001_$(openssl rand -hex 16)"
    STREAM_KEY_3="camera001_$(openssl rand -hex 16)"

    sed -i "s|DEFAULT_STREAM_KEY_1=.*|DEFAULT_STREAM_KEY_1=$STREAM_KEY_1|" .env
    sed -i "s|DEFAULT_STREAM_KEY_2=.*|DEFAULT_STREAM_KEY_2=$STREAM_KEY_2|" .env
    sed -i "s|DEFAULT_STREAM_KEY_3=.*|DEFAULT_STREAM_KEY_3=$STREAM_KEY_3|" .env
    echo "✓ Generated stream keys"

    echo ""
    echo "⚠️  IMPORTANT: Edit .env and change DEFAULT_ADMIN_PASSWORD!"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Create data directory
mkdir -p data
echo "✓ Created data directory"
echo ""

# Ask if user wants to build and start
read -p "Do you want to build and start the services now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Building Docker images (this may take 10-15 minutes on Pi3)..."
    docker-compose build

    echo ""
    echo "Starting services..."
    docker-compose up -d

    # Wait for services to be ready
    echo ""
    echo "Waiting for services to start..."
    sleep 10

    # Initialize database
    echo ""
    echo "Initializing database..."
    docker exec -it livestream-api npm run init-db

    echo ""
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║   Setup Complete!                                     ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""

    SERVER_IP=$(grep SERVER_IP .env | cut -d '=' -f2)
    DEFAULT_PWD=$(grep DEFAULT_ADMIN_PASSWORD .env | cut -d '=' -f2)

    echo "Access your livestream server:"
    echo "  Web UI: http://$SERVER_IP/"
    echo "  Login: admin / $DEFAULT_PWD"
    echo ""
    echo "⚠️  Change the admin password immediately after first login!"
    echo ""
    echo "Check service status:"
    echo "  docker-compose ps"
    echo ""
    echo "View logs:"
    echo "  docker-compose logs -f"
    echo ""
else
    echo ""
    echo "Setup files created. To start services manually:"
    echo "  1. Edit .env file with your settings"
    echo "  2. Run: docker-compose build"
    echo "  3. Run: docker-compose up -d"
    echo "  4. Run: docker exec -it livestream-api npm run init-db"
    echo ""
fi
