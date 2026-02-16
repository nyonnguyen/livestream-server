# Nyon Livestream Server - Deployment Guide

## Overview

This guide covers the complete installation and deployment of Nyon Livestream Server on Raspberry Pi and other Linux systems.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Installation](#pre-installation)
3. [Quick Installation](#quick-installation)
4. [Detailed Installation Steps](#detailed-installation-steps)
5. [Post-Installation Configuration](#post-installation-configuration)
6. [Upgrading](#upgrading)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

---

## System Requirements

### Minimum Requirements

- **Hardware:**
  - Raspberry Pi 3 Model B+ (or equivalent ARM device)
  - 1GB RAM (Raspberry Pi 3 has 1GB)
  - 8GB SD card (16GB+ recommended)
  - Network connection (Ethernet recommended for stability)

- **Software:**
  - Raspberry Pi OS Lite 64-bit (or any Debian-based Linux)
  - Docker Engine 20.10+
  - Docker Compose 2.0+

### Recommended Configuration

- **Hardware:**
  - Raspberry Pi 4/5 (2GB+ RAM for better performance)
  - 32GB+ SD card (Class 10 or better, preferably high-endurance)
  - Wired Ethernet connection
  - Active cooling (fan or heatsink)

- **Software:**
  - Latest Raspberry Pi OS Lite 64-bit
  - Docker Engine 24.0+
  - Docker Compose 2.20+

### Supported Platforms

- ✅ Raspberry Pi 3 Model B/B+ (ARM64)
- ✅ Raspberry Pi 4 (ARM64)
- ✅ Raspberry Pi 5 (ARM64)
- ✅ Ubuntu Server 20.04+ (ARM64/x86_64)
- ✅ Debian 11+ (ARM64/x86_64)
- ⚠️ Raspberry Pi Zero/Zero 2 (limited performance)

---

## Pre-Installation

### Step 1: Install Operating System

#### For Raspberry Pi:

1. **Download Raspberry Pi Imager:**
   - https://www.raspberrypi.com/software/

2. **Flash SD Card:**
   - Choose OS: Raspberry Pi OS Lite (64-bit)
   - Choose Storage: Your SD card
   - Click "Write"

3. **Enable SSH (Optional but recommended):**
   - Before removing SD card, create empty file named `ssh` in boot partition
   - Or use Raspberry Pi Imager's advanced settings

4. **Boot Raspberry Pi:**
   - Insert SD card
   - Connect Ethernet cable
   - Power on

5. **Find IP Address:**
   ```bash
   # From your computer, scan network
   nmap -sn 192.168.1.0/24

   # Or check router's DHCP client list
   ```

6. **Connect via SSH:**
   ```bash
   ssh pi@<raspberry-pi-ip>
   # Default password: raspberry
   ```

### Step 2: Initial System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Set timezone
sudo raspi-config
# Select: 5 Localisation Options → L2 Timezone

# Change default password (important!)
passwd

# Set static IP (optional but recommended)
sudo nano /etc/dhcpcd.conf
# Add at the end:
# interface eth0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=8.8.8.8 8.8.4.4

# Reboot
sudo reboot
```

### Step 3: Install Docker

```bash
# Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (avoid using sudo)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
exit
# SSH back in

# Verify Docker installation
docker --version
# Expected: Docker version 24.0.x or higher

# Test Docker
docker run hello-world
```

### Step 4: Install Docker Compose

Docker Compose v2 is usually included with Docker Engine. Verify:

```bash
docker compose version
# Expected: Docker Compose version v2.20.x or higher
```

If not installed:

```bash
# Install Docker Compose plugin
sudo apt install docker-compose-plugin

# Verify
docker compose version
```

---

## Quick Installation

For experienced users, here's the quick setup:

```bash
# Clone repository
git clone https://github.com/nyonnguyen/livestream-server.git
cd livestream-server

# Create environment file
cp .env.example .env
nano .env  # Edit as needed

# Generate secure JWT secret
openssl rand -base64 32
# Copy output and paste into .env as JWT_SECRET

# Start services
docker compose up -d

# Check status
docker ps

# View logs
docker logs livestream-api
docker logs livestream-srs

# Access web interface
# Open browser: http://<raspberry-pi-ip>
# Login: admin / admin123 (change immediately!)
```

---

## Detailed Installation Steps

### Step 1: Clone Repository

```bash
# Create directory for the project
cd ~
mkdir -p projects
cd projects

# Clone repository
git clone https://github.com/nyonnguyen/livestream-server.git

# Or download ZIP if git not available
wget https://github.com/nyonnguyen/livestream-server/archive/main.zip
unzip main.zip
mv livestream-server-main livestream-server

# Enter directory
cd livestream-server

# List contents
ls -la
```

### Step 2: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Configure the following variables:**

```bash
# Server Configuration
SERVER_IP=192.168.1.100              # Your Raspberry Pi's IP
PUBLIC_IP=                           # Optional: Your public IP or domain

# Security
JWT_SECRET=                          # Generate with: openssl rand -base64 32
DEFAULT_ADMIN_PASSWORD=admin123      # Change this!

# Streaming Configuration
MAX_CONCURRENT_STREAMS=3             # Adjust based on hardware
DEFAULT_STREAM_KEY_1=                # Leave blank for auto-generation
DEFAULT_STREAM_KEY_2=
DEFAULT_STREAM_KEY_3=

# Optional: Public Domain
PUBLIC_DOMAIN=                       # e.g., stream.example.com
```

**Generate JWT Secret:**

```bash
openssl rand -base64 32
```

Copy the output and paste it as `JWT_SECRET` in `.env`

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Create Data Directory

```bash
# Create directory for SQLite database
mkdir -p data

# Set permissions
chmod 755 data
```

### Step 4: Review Docker Compose Configuration

```bash
# View docker-compose.yml
cat docker-compose.yml
```

Key services:
- **srs**: Streaming engine (ports 1935 RTMP, 10080 SRT, 8080 HTTP-FLV)
- **web-api**: Backend API (port 3000)
- **web-ui**: Frontend dashboard (port 80)
- **nginx**: Reverse proxy (port 8888)

### Step 5: Pull Docker Images

```bash
# Pre-pull images to speed up first start
docker compose pull
```

Expected images:
- `ossrs/srs:5` (~100MB)
- `node:18-alpine` (~180MB)
- `nginx:alpine` (~40MB)

### Step 6: Start Services

```bash
# Start all services in detached mode
docker compose up -d

# Expected output:
# Container livestream-srs    Started
# Container livestream-api    Started
# Container livestream-ui     Started
# Container livestream-nginx  Started
```

### Step 7: Verify Containers are Running

```bash
# Check container status
docker ps

# Expected output shows 4 containers:
# livestream-srs    (up)
# livestream-api    (up)
# livestream-ui     (up)
# livestream-nginx  (up)

# Check specific container health
docker inspect --format='{{.State.Health.Status}}' livestream-api
# Expected: healthy (after ~10 seconds)
```

### Step 8: View Logs

```bash
# View all logs
docker compose logs

# View specific service logs
docker logs livestream-api --tail 50 -f

# Stop following logs: Ctrl+C
```

Look for:
```
╔═══════════════════════════════════════════════════════╗
║   Livestream API Server                               ║
║   Running on port 3000                                ║
╚═══════════════════════════════════════════════════════╝
Ready to accept requests!
```

### Step 9: Initialize Database

The database is automatically initialized on first start with:
- Default admin user (username: `admin`, password: from `DEFAULT_ADMIN_PASSWORD`)
- 3 default streams (if `DEFAULT_STREAM_KEY_*` are set)

To reset the database:

```bash
# Stop services
docker compose down

# Remove database
rm data/livestream.db*

# Restart services (will reinitialize)
docker compose up -d
```

### Step 10: Access Web Interface

1. **Open browser**
2. **Navigate to:** `http://<raspberry-pi-ip>`
   - Example: `http://192.168.1.100`
3. **Login:**
   - Username: `admin`
   - Password: `admin123` (or your custom `DEFAULT_ADMIN_PASSWORD`)
4. **Change password immediately** (Settings → Change Password)

---

## Post-Installation Configuration

### Configure Public Access

If accessing from the internet:

1. **Set Public IP/Domain in Settings:**
   - Go to Settings tab
   - Enter your public IP or domain
   - Save

2. **Configure Router Port Forwarding:**
   - Forward port 80 (HTTP) → Raspberry Pi port 80
   - Forward port 1935 (RTMP) → Raspberry Pi port 1935
   - Forward port 10080 (SRT) → Raspberry Pi port 10080
   - Optional: Forward port 8080 (HTTP-FLV) → Raspberry Pi port 8080

3. **Optional: Setup Dynamic DNS:**
   - Use services like No-IP, DuckDNS, Dynu
   - Configure your router to update DNS automatically

### Enable HTTPS (Recommended for Production)

For public access, use HTTPS with Let's Encrypt:

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate (replace with your domain)
sudo certbot certonly --standalone -d stream.example.com

# Certificates will be in: /etc/letsencrypt/live/stream.example.com/

# Update nginx configuration to use certificates
# (Advanced - requires nginx config modification)
```

### Optimize for Your Hardware

#### Raspberry Pi 3:
- Keep `MAX_CONCURRENT_STREAMS=3` or lower
- Use relay-only mode (no transcoding)
- Monitor CPU temperature: `vcgencmd measure_temp`

#### Raspberry Pi 4/5:
- Can handle `MAX_CONCURRENT_STREAMS=5-10`
- Can enable transcoding if needed
- Better for multiple viewers

### Configure Firewall

```bash
# Install UFW if not present
sudo apt install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow RTMP
sudo ufw allow 1935/tcp

# Allow SRT
sudo ufw allow 10080/tcp

# Allow HTTP-FLV (optional)
sudo ufw allow 8080/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Upgrading

### Update to Latest Version

```bash
# Navigate to project directory
cd ~/projects/livestream-server

# Pull latest changes
git pull origin main

# Rebuild images
docker compose build

# Restart services
docker compose down
docker compose up -d

# Verify
docker compose logs
```

### Backup Before Upgrading

```bash
# Backup database
cp data/livestream.db data/livestream.db.backup

# Backup environment
cp .env .env.backup

# Backup configuration
cp srs/srs.conf srs/srs.conf.backup
```

### Rollback if Needed

```bash
# Stop services
docker compose down

# Restore database
cp data/livestream.db.backup data/livestream.db

# Checkout previous version
git checkout <previous-commit-hash>

# Start services
docker compose up -d
```

---

## Troubleshooting

### Containers Won't Start

```bash
# Check Docker service
sudo systemctl status docker

# Check logs
docker compose logs

# Check disk space
df -h

# Check memory
free -h
```

### Cannot Access Web Interface

```bash
# Check if port 80 is accessible
sudo netstat -tulpn | grep :80

# Check web-ui container
docker logs livestream-ui

# Try accessing via IP directly
curl http://localhost

# Check firewall
sudo ufw status
```

### Streams Won't Publish

```bash
# Check SRS is running
docker logs livestream-srs

# Test RTMP port
telnet <raspberry-pi-ip> 1935

# Check stream key is correct
# Check stream is enabled (not disabled)

# View SRS API
curl http://localhost:8080/api/v1/streams/
```

### High CPU Usage

```bash
# Check resource usage
docker stats

# Monitor Pi temperature
watch -n 1 vcgencmd measure_temp

# Reduce concurrent streams
# Edit .env: MAX_CONCURRENT_STREAMS=2
docker compose restart
```

### Database Corruption

```bash
# Stop services
docker compose down

# Check database integrity
sqlite3 data/livestream.db "PRAGMA integrity_check;"

# If corrupted, restore from backup or reinitialize
rm data/livestream.db*
docker compose up -d
```

---

## Advanced Configuration

### Custom SRS Configuration

Edit `srs/srs.conf` for advanced streaming options:

```bash
nano srs/srs.conf

# After editing, restart SRS
docker compose restart srs
```

### Enable Recording (DVR)

Add to `srs/srs.conf`:

```nginx
vhost __defaultVhost__ {
    dvr {
        enabled on;
        dvr_path /recordings;
        dvr_plan session;
    }
}
```

Create recordings directory and restart:

```bash
mkdir -p recordings
docker compose restart srs
```

### Custom Domain with Nginx

Edit `nginx/conf.d/default.conf` to add server_name:

```nginx
server {
    listen 80;
    server_name stream.example.com;
    # ...
}
```

Restart nginx:

```bash
docker compose restart nginx
```

### Auto-Start on Boot

Docker services auto-start by default if configured:

```bash
# Ensure Docker starts on boot
sudo systemctl enable docker

# Containers will auto-start if they were running
```

### Monitoring and Logs

```bash
# View real-time logs
docker compose logs -f

# View specific service
docker logs livestream-api -f

# Save logs to file
docker compose logs > logs.txt

# Rotate logs (prevent disk fill)
docker system prune -f
```

---

## Uninstallation

For automated uninstallation using the uninstall script:

```bash
cd /opt/livestream-server
./uninstall.sh
```

**See [UNINSTALL.md](UNINSTALL.md) for complete uninstallation guide.**

### Manual Uninstallation (Alternative)

If you prefer manual cleanup:

#### Remove Services

```bash
# Stop and remove containers
docker compose down

# Remove images
docker rmi $(docker images -q livestream*)

# Remove volumes (careful - deletes data!)
docker volume prune
```

#### Remove Project

```bash
# Remove project directory
cd ~
rm -rf projects/livestream-server
```

#### Remove Docker (Optional)

```bash
# Remove Docker
sudo apt remove docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Remove Docker data
sudo rm -rf /var/lib/docker
```

---

## Additional Resources

- **Documentation:** See `TECHNICAL_DESIGN.md` for architecture details
- **User Guide:** Access Help page in web interface
- **Support:** Email nyonnguyen@gmail.com
- **SRS Documentation:** https://ossrs.net/lts/en-us/docs/v5/doc/introduction

---

## Quick Reference

### Useful Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart specific service
docker compose restart web-api

# View logs
docker compose logs -f

# Check status
docker ps

# Shell into container
docker exec -it livestream-api sh

# Resource usage
docker stats
```

### Default Ports

- **80**: Web Interface (HTTP)
- **1935**: RTMP Publishing
- **10080**: SRT Publishing
- **8080**: HTTP-FLV Playback
- **8888**: Nginx Proxy
- **3000**: API (internal)

### Default Credentials

- **Username:** admin
- **Password:** admin123 (or `DEFAULT_ADMIN_PASSWORD` from `.env`)

**⚠️ Change immediately after first login!**

---

**Need Help?**

- Read the in-app Help page for usage instructions
- Check logs: `docker compose logs`
- Contact: nyonnguyen@gmail.com

**Enjoy streaming! 🎥**
