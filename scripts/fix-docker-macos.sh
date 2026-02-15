#!/bin/bash

# Fix common Docker Desktop issues on macOS

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   Docker Desktop Troubleshooter                       ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker Desktop is not running"
    echo "   Please start Docker Desktop and try again"
    exit 1
fi

echo "✓ Docker Desktop is running"
echo ""

# Check proxy configuration
echo "Checking proxy configuration..."
HTTP_PROXY=$(docker info | grep "HTTP Proxy" | cut -d: -f2- | xargs)
HTTPS_PROXY=$(docker info | grep "HTTPS Proxy" | cut -d: -f2- | xargs)

if [ -n "$HTTP_PROXY" ] && [ "$HTTP_PROXY" != "<nil>" ]; then
    echo "⚠️  HTTP Proxy detected: $HTTP_PROXY"
    echo ""
    echo "This proxy may be causing connection issues."
    echo ""
    echo "To fix:"
    echo "1. Open Docker Desktop"
    echo "2. Click Settings (gear icon)"
    echo "3. Go to Resources → Proxies"
    echo "4. Select 'Disable HTTP proxy'"
    echo "5. Click 'Apply & Restart'"
    echo ""
    read -p "Have you disabled the proxy? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please disable the proxy and run this script again."
        exit 1
    fi
else
    echo "✓ No proxy configured"
fi
echo ""

# Test Docker Hub connectivity
echo "Testing Docker Hub connectivity..."
if docker pull hello-world:latest > /dev/null 2>&1; then
    echo "✓ Can pull images from Docker Hub"
    docker rmi hello-world:latest > /dev/null 2>&1
else
    echo "❌ Cannot pull images from Docker Hub"
    echo ""
    echo "Possible issues:"
    echo "1. Network/firewall blocking Docker"
    echo "2. Proxy configuration incorrect"
    echo "3. VPN interfering with Docker"
    echo ""
    echo "Try:"
    echo "- Disable VPN temporarily"
    echo "- Check firewall settings"
    echo "- Restart Docker Desktop"
    exit 1
fi
echo ""

# Check Docker Desktop resources
echo "Checking Docker Desktop resources..."
MEMORY_LIMIT=$(docker info 2>/dev/null | grep "Total Memory" | awk '{print $3$4}')
CPUS=$(docker info 2>/dev/null | grep "CPUs" | awk '{print $2}')

echo "  CPUs allocated: $CPUS"
echo "  Memory allocated: $MEMORY_LIMIT"
echo ""

if [ ! -z "$CPUS" ] && [ "$CPUS" -lt 2 ]; then
    echo "⚠️  Only $CPUS CPU allocated"
    echo "   Recommend: Allocate 4 CPUs for better performance"
    echo "   Settings → Resources → CPUs → Set to 4"
    echo ""
fi

# Clean up old images/containers
echo "Cleaning up Docker..."
docker system prune -f > /dev/null 2>&1
echo "✓ Cleaned up unused Docker resources"
echo ""

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   Docker Desktop is ready!                            ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "You can now run:"
echo "  docker-compose build"
echo "  docker-compose up -d"
echo ""
