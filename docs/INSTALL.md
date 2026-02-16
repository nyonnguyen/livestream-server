# One-Command Installation Guide

## Quick Install (Recommended)

Install and start the livestream server with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

**That's it!** The script will:
- ✅ Check system requirements
- ✅ Install Docker and Docker Compose
- ✅ Download and configure the application
- ✅ Start all services
- ✅ Enable auto-start on boot
- ✅ Generate secure credentials

**Installation time:** 5-15 minutes (depending on network speed)

---

## What the Installer Does

### 1. System Check
- Verifies Raspberry Pi hardware
- Checks available memory (minimum 1GB)
- Checks disk space (minimum 2GB)

### 2. Install Dependencies
- Docker (if not installed)
- Docker Compose (if not installed)
- Adds your user to docker group

### 3. Configure Network (if needed)
- Detects IPv6 DNS issues that may prevent Docker from pulling images
- Configures reliable DNS servers (Google DNS)
- Disables IPv6 to prevent timeout issues
- Automatically fixes common connectivity problems

### 4. Setup Application
- Clones repository to `/opt/livestream-server`
- Generates secure JWT secret
- Creates random admin password
- Generates default stream keys
- Configures environment variables

### 5. Start Services
- Pulls pre-built images (if available) OR builds locally
- Starts all Docker containers
- Creates systemd service for auto-start

### 6. Configure Auto-Start
- Creates systemd service: `livestream-server.service`
- Enables service on boot
- Application starts automatically after reboot

---

## Post-Installation

### Access Your Server

After installation completes, you'll see:

```
╔════════════════════════════════════════════════════════════════╗
║                  Installation Successful! 🎉                   ║
╚════════════════════════════════════════════════════════════════╝

📍 Installation Directory: /opt/livestream-server
🌐 Web Interface: http://192.168.1.55
🔑 Admin Username: admin
🔒 Admin Password: Abc123XYZ456

⚠️  IMPORTANT: Save your admin password!
```

**Save the admin password immediately!**

### First Login

1. Open browser and go to: `http://YOUR_PI_IP`
2. Login with username: `admin`
3. Use the password shown during installation
4. **Change your password** in Settings → Security

---

## Managing the Service

### Service Commands

```bash
# Start the server
sudo systemctl start livestream-server

# Stop the server
sudo systemctl stop livestream-server

# Restart the server
sudo systemctl restart livestream-server

# Check status
sudo systemctl status livestream-server

# Disable auto-start on boot
sudo systemctl disable livestream-server

# Enable auto-start on boot
sudo systemctl enable livestream-server
```

### Docker Commands

```bash
# View logs
cd /opt/livestream-server
docker-compose logs -f

# View specific service logs
docker-compose logs -f web-api
docker-compose logs -f srs

# Restart specific service
docker-compose restart web-api

# Stop all services
docker-compose down

# Start all services
docker-compose up -d
```

---

## Installation Locations

| Item | Location |
|------|----------|
| Application | `/opt/livestream-server` |
| Configuration | `/opt/livestream-server/.env` |
| Database | `/opt/livestream-server/data/livestream.db` |
| Systemd Service | `/etc/systemd/system/livestream-server.service` |
| Docker Images | Docker registry |

---

## Updating the Application

### Update to Latest Version

```bash
cd /opt/livestream-server
git pull origin main
docker-compose down
docker-compose pull  # Pull latest images
docker-compose up -d
```

### Or Re-run the Installer

The installer is idempotent - safe to run multiple times:

```bash
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

This will:
- Update the code
- Preserve your `.env` configuration (backs up to `.env.backup.<timestamp>`)
- Restart services with new version

---

## Uninstallation

To cleanly uninstall the livestream server, use the uninstall script:

```bash
# Standard uninstall (removes app, keeps Docker)
cd /opt/livestream-server
./uninstall.sh

# Complete removal (removes app + Docker)
./uninstall.sh --full

# Keep your data (backs up database and config)
./uninstall.sh --keep-data
```

**For detailed uninstallation instructions and scenarios, see:** [UNINSTALL.md](UNINSTALL.md)

The uninstall guide covers:
- Step-by-step cleanup and reinstall procedures
- How to preserve your data during reinstallation
- Restoring from backups
- Troubleshooting uninstallation issues
- Complete system reset options

---

## Troubleshooting Installation

### Docker Registry DNS Timeout (IPv6 Issue)

**Problem:** Error message when pulling Docker images:
```
dial tcp: lookup registry-1.docker.io on [fe80::...]:53: read udp [...]:53: i/o timeout
Error response from daemon: failed to resolve reference...
```

**Cause:** NetworkManager configured with IPv6 link-local DNS server that times out when Docker tries to resolve Docker Hub registry.

**Solution:** The install script (v1.2+) automatically detects and fixes this issue by:
- Configuring the network connection to use Google DNS (8.8.8.8, 8.8.4.4)
- Disabling IPv6 to prevent timeout issues
- Restarting Docker with the new DNS configuration

If you still encounter DNS issues after installation:

```bash
# Check current DNS configuration
cat /etc/resolv.conf

# Get active connection name
nmcli connection show --active

# Configure DNS manually (replace CONNECTION_NAME with your actual connection)
sudo nmcli connection modify "CONNECTION_NAME" ipv4.dns "8.8.8.8 8.8.4.4"
sudo nmcli connection modify "CONNECTION_NAME" ipv4.ignore-auto-dns yes
sudo nmcli connection modify "CONNECTION_NAME" ipv6.method ignore

# Restart connection
sudo nmcli connection down "CONNECTION_NAME"
sudo nmcli connection up "CONNECTION_NAME"

# Restart Docker
sudo systemctl restart docker

# Test Docker DNS
docker pull hello-world
```

**Note:** This issue is common on Raspberry Pi OS with NetworkManager when using WiFi with IPv6 enabled.

### Python Externally Managed Environment Error

**Problem:** Error message: `externally-managed-environment` when running install script on newer Raspberry Pi OS

**Cause:** Newer Raspberry Pi OS (Bookworm+) prevents global Python package installation to avoid system conflicts

**Solution:** The updated install script (v1.1+) fixes this by using Docker Compose v2 instead of installing via pip.

If you're using an old install script:
```bash
# Use the latest install script
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash

# OR manually install Docker Compose plugin
sudo apt-get install docker-compose-plugin
```

**Note:** Docker Compose v2 (`docker compose`) is now included with Docker and doesn't require Python pip.

### Installation Fails with Permission Error

**Problem:** Script fails with "permission denied"

**Solution:**
```bash
# Don't run with sudo, script will request permissions when needed
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

### Docker Group Error

**Problem:** "permission denied while trying to connect to Docker daemon"

**Solution:**
```bash
# Log out and back in, or run:
newgrp docker

# Then restart the installer
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

### Services Won't Start

**Problem:** Services fail to start after installation

**Solution:**
```bash
# Check logs
cd /opt/livestream-server
docker-compose logs

# Check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Restart services
docker-compose up -d
```

### Out of Memory During Build

**Problem:** Build fails on Raspberry Pi 3

**Solution:**
```bash
# The installer tries to pull pre-built images first
# If building locally, ensure you have swap enabled:

# Check swap
free -h

# Add swap if needed (1GB)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Can't Access Web Interface

**Problem:** Cannot open `http://PI_IP` in browser

**Solution:**
```bash
# Check if services are running
docker ps

# Check if port 80 is listening
sudo netstat -tlnp | grep :80

# Check firewall (if enabled)
sudo ufw status
sudo ufw allow 80/tcp

# Test locally
curl http://localhost
```

---

## Advanced Installation Options

### Custom Installation Directory

```bash
# Download script
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh -o install.sh

# Edit INSTALL_DIR variable
nano install.sh
# Change: INSTALL_DIR="/your/custom/path"

# Run modified script
bash install.sh
```

### Install Specific Branch

```bash
GITHUB_BRANCH=development curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

### Skip Auto-Start Configuration

```bash
# Download and edit the script
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh -o install.sh

# Comment out the systemd section
nano install.sh
# Add # before: setup_systemd_service

# Run modified script
bash install.sh
```

---

## System Requirements

### Minimum Requirements
- **Hardware:** Raspberry Pi 3 or newer
- **OS:** Raspberry Pi OS Lite 64-bit (recommended)
- **RAM:** 1GB (512MB free)
- **Storage:** 2GB free space
- **Network:** Ethernet or WiFi connection

### Recommended Configuration
- **Hardware:** Raspberry Pi 4 (2GB+ RAM)
- **OS:** Raspberry Pi OS Lite 64-bit
- **RAM:** 2GB+
- **Storage:** 8GB+ SD card (high endurance)
- **Network:** Ethernet (wired) for stability

---

## Security Notes

### Generated Credentials

The installer generates:
- **JWT Secret:** 64 random hex characters
- **Admin Password:** 12 random characters
- **Stream Keys:** 32 random hex characters each

These are cryptographically secure and unique to your installation.

### Changing Credentials After Install

```bash
# Edit .env file
cd /opt/livestream-server
nano .env

# Change these values:
# - JWT_SECRET
# - DEFAULT_ADMIN_PASSWORD
# - Stream keys

# Restart services
docker-compose restart
```

### Firewall Configuration

If using `ufw` firewall:

```bash
# Allow required ports
sudo ufw allow 80/tcp      # Web UI
sudo ufw allow 1935/tcp    # RTMP
sudo ufw allow 10080/udp   # SRT
sudo ufw allow 8080/tcp    # HTTP-FLV

# Enable firewall
sudo ufw enable
```

---

## Performance Tips

### For Raspberry Pi 3

1. **Use Ethernet:** WiFi adds latency
2. **Overclock (optional):** Add to `/boot/config.txt`
   ```
   over_voltage=2
   arm_freq=1350
   ```
3. **Increase GPU Memory:** Add to `/boot/config.txt`
   ```
   gpu_mem=128
   ```
4. **Use High-Endurance SD Card:** Prevent corruption
5. **Enable Swap:** Helps with memory pressure

### Monitor Performance

```bash
# CPU/Memory usage
docker stats

# System resources
htop

# Service logs
docker-compose logs --tail 100 -f
```

---

## Support

**Documentation:**
- [README.md](../README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Manual deployment
- [UNINSTALL.md](UNINSTALL.md) - Uninstallation guide
- [CI-CD.md](CI-CD.md) - CI/CD pipeline
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues

**Help:**
- In-app help: `http://YOUR_PI_IP/help`
- GitHub Issues: https://github.com/nyonnguyen/livestream-server/issues
- Email: nyonnguyen@gmail.com

---

## What's Next?

After installation:

1. ✅ **Login** to web interface
2. ✅ **Change password** in Settings
3. ✅ **Configure streams** in Streams tab
4. ✅ **Test streaming** with OBS or mobile app
5. ✅ **Set up port forwarding** (if streaming from internet)
6. ✅ **Configure public IP** (optional, in Settings)

**Enjoy your livestream server! 🎥**

---

**Installation Script Version:** 1.2.0
**Last Updated:** February 2026
**Author:** Nyon (nyonnguyen@gmail.com)
