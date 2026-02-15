#!/bin/bash

# Livestream Server - macOS Testing Script

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   Livestream Server - macOS Test                      ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check Docker Desktop
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker Desktop is not running"
    echo "   Please start Docker Desktop and try again"
    exit 1
fi

echo "✓ Docker Desktop is running"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file for testing..."
    cp .env.example .env

    # Set localhost
    sed -i '' "s/SERVER_IP=.*/SERVER_IP=localhost/" .env

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env

    # Generate stream keys
    STREAM_KEY_1="drone001_$(openssl rand -hex 16)"
    STREAM_KEY_2="phone001_$(openssl rand -hex 16)"
    STREAM_KEY_3="camera001_$(openssl rand -hex 16)"

    sed -i '' "s|DEFAULT_STREAM_KEY_1=.*|DEFAULT_STREAM_KEY_1=$STREAM_KEY_1|" .env
    sed -i '' "s|DEFAULT_STREAM_KEY_2=.*|DEFAULT_STREAM_KEY_2=$STREAM_KEY_2|" .env
    sed -i '' "s|DEFAULT_STREAM_KEY_3=.*|DEFAULT_STREAM_KEY_3=$STREAM_KEY_3|" .env

    # Increase concurrent streams for testing on Mac
    sed -i '' "s/MAX_CONCURRENT_STREAMS=.*/MAX_CONCURRENT_STREAMS=5/" .env

    echo "✓ Created .env file"
else
    echo "✓ .env file exists"
fi
echo ""

# Build images
echo "Building Docker images..."
echo "(This may take a few minutes on first run)"
docker-compose build

echo ""
echo "Starting services..."
docker-compose up -d

# Wait for services
echo ""
echo "Waiting for services to start..."
sleep 10

# Check if API is responding
echo "Checking API health..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✓ API is responding"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  API is not responding yet, but continuing..."
    fi
    sleep 1
done

echo ""
echo "Initializing database..."
docker exec livestream-api npm run init-db

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   Test Environment Ready!                             ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Access your livestream server:"
echo "  Web UI:  http://localhost"
echo "  Login:   admin / admin123"
echo ""
echo "Stream URLs (use in OBS):"
echo "  RTMP Server: rtmp://localhost:1935/live"
echo "  Stream Key:  (get from web UI)"
echo ""
echo "Playback URL (use in VLC):"
echo "  http://localhost:8080/live/[stream_key].flv"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f     # View logs"
echo "  docker-compose ps          # Check status"
echo "  docker-compose down        # Stop everything"
echo ""
echo "⚠️  Note: This is for testing only!"
echo "   For production on Raspberry Pi, use scripts/setup.sh"
echo ""
