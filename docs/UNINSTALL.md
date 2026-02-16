# Uninstall Guide

This guide explains how to cleanly uninstall the Nyon Livestream Server from your Raspberry Pi.

## Quick Reference

```bash
# Standard uninstall (removes app, keeps Docker)
./uninstall.sh

# Complete removal (removes app + Docker)
./uninstall.sh --full

# Keep your data (backs up database and config)
./uninstall.sh --keep-data
```

## Uninstall Options

### Option 1: Standard Uninstall (Recommended)

Removes the livestream server application but keeps Docker installed for future use.

```bash
./uninstall.sh
```

**What gets removed:**
- Docker containers (livestream-srs, livestream-api, livestream-ui, livestream-nginx)
- Docker volumes (database and configuration)
- Application files in `/opt/livestream-server`
- Systemd service
- Docker images (SRS, nginx, custom images)

**What stays:**
- Docker and Docker Compose
- Your system configuration

**Use this when:** You want to reinstall the server or free up space but keep Docker for other projects.

---

### Option 2: Complete Removal

Removes everything including Docker.

```bash
./uninstall.sh --full
```

**What gets removed:**
- Everything from Option 1
- Docker engine
- Docker Compose
- All Docker data directories

**Use this when:** You want to completely clean your system or reinstall Docker from scratch.

---

### Option 3: Keep Data

Removes the application but backs up your database and configuration files.

```bash
./uninstall.sh --keep-data
```

**What gets removed:**
- Docker containers and application files
- Docker images

**What gets backed up:**
- Database file (`livestream.db`)
- Environment configuration (`.env`)
- Backup location: `~/livestream-backup-YYYYMMDD_HHMMSS/`

**Use this when:** You want to upgrade or reinstall but preserve your users, streams, and settings.

---

## Step-by-Step Cleanup and Reinstall

### Scenario 1: Clean Reinstall (Fresh Start)

If you want to start fresh with default settings:

```bash
# 1. Navigate to installation directory
cd /opt/livestream-server

# 2. Run standard uninstall
./uninstall.sh

# 3. Reinstall
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

**Result:** Fresh installation with default admin credentials (admin/admin123) and default streams.

---

### Scenario 2: Clean Reinstall (Keep Your Data)

If you want to preserve your users, streams, and settings:

```bash
# 1. Navigate to installation directory
cd /opt/livestream-server

# 2. Backup your data
./uninstall.sh --keep-data

# 3. Note the backup location (e.g., ~/livestream-backup-20260216_143022/)

# 4. Reinstall
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash

# 5. Stop the new containers
cd /opt/livestream-server
docker compose down

# 6. Restore your data
BACKUP_DIR=~/livestream-backup-20260216_143022  # Use your actual backup directory
cp -r "$BACKUP_DIR/data" /opt/livestream-server/
cp "$BACKUP_DIR/.env" /opt/livestream-server/

# 7. Restart containers
docker compose up -d

# 8. Verify
docker ps  # Check all containers are running
```

**Result:** Clean installation with your previous users, streams, and configuration.

---

### Scenario 3: Upgrade to Latest Version

If you want to update to the latest version without losing data:

```bash
# 1. Navigate to installation directory
cd /opt/livestream-server

# 2. Stop containers
docker compose down

# 3. Backup data (optional but recommended)
cp -r data ~/livestream-backup-$(date +%Y%m%d)/
cp .env ~/livestream-backup-$(date +%Y%m%d)/

# 4. Pull latest code
git pull origin main

# 5. Pull latest images
docker compose pull

# 6. Restart with new version
docker compose up -d

# 7. Verify
docker ps
docker logs livestream-api  # Check for any errors
```

**Result:** Updated to latest version with all your data intact.

---

### Scenario 4: Complete System Reset

If you want to remove everything including Docker:

```bash
# 1. Navigate to installation directory
cd /opt/livestream-server

# 2. Complete removal
./uninstall.sh --full

# 3. Reinstall (will install Docker automatically)
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

**Result:** Clean system with fresh Docker and livestream server installation.

---

## Restoring from Backup

If you used `--keep-data` option, here's how to restore your data:

### 1. Locate Your Backup

Backups are saved to your home directory:

```bash
ls -lh ~/livestream-backup-*
```

You'll see directories like: `livestream-backup-20260216_143022/`

### 2. Restore Data

```bash
# Set your backup directory
BACKUP_DIR=~/livestream-backup-20260216_143022  # Replace with your actual backup

# Stop containers
cd /opt/livestream-server
docker compose down

# Restore database and configuration
cp -r "$BACKUP_DIR/data" /opt/livestream-server/
cp "$BACKUP_DIR/.env" /opt/livestream-server/

# Restart containers
docker compose up -d
```

### 3. Verify Restoration

```bash
# Check containers are running
docker ps

# Test login with your previous credentials
# Open web interface: http://your-pi-ip/
```

---

## Troubleshooting

### Uninstall Script Fails

**Problem:** Script exits with errors

**Solution:**
```bash
# Run with manual cleanup
cd /opt/livestream-server

# Stop containers manually
docker compose down -v 2>/dev/null || docker-compose down -v 2>/dev/null || true

# Remove service manually
sudo systemctl stop livestream-server 2>/dev/null || true
sudo systemctl disable livestream-server 2>/dev/null || true
sudo rm /etc/systemd/system/livestream-server.service 2>/dev/null || true
sudo systemctl daemon-reload

# Remove files manually
sudo rm -rf /opt/livestream-server
```

### Cannot Remove Docker

**Problem:** `./uninstall.sh --full` fails to remove Docker

**Solution:**
```bash
# Manual Docker removal
sudo systemctl stop docker
sudo apt-get remove -y docker.io docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo apt-get autoremove -y
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
```

### Backup Location Unknown

**Problem:** Can't find backup after using `--keep-data`

**Solution:**
```bash
# Search for backups
find ~ -type d -name "livestream-backup-*"

# List all backups with details
ls -lhd ~/livestream-backup-*
```

### Restored Data But Login Fails

**Problem:** After restore, cannot login with old credentials

**Solution:**
```bash
# Check if .env was properly restored
cat /opt/livestream-server/.env | grep DEFAULT_ADMIN_PASSWORD

# Check database exists
ls -lh /opt/livestream-server/data/livestream.db

# Check API logs
docker logs livestream-api

# If database is corrupted, reset password
cd /opt/livestream-server
docker exec -it livestream-api node scripts/reset-password.js admin newpassword123
```

---

## Getting Help

If you encounter issues during uninstallation:

1. **Check logs:**
   ```bash
   docker logs livestream-api
   docker logs livestream-srs
   ```

2. **Verify system state:**
   ```bash
   docker ps -a  # List all containers
   systemctl status livestream-server  # Check service status
   df -h  # Check disk space
   ```

3. **Report issues:**
   - GitHub: https://github.com/nyonnguyen/livestream-server/issues
   - Include: uninstall command used, error messages, system info

---

## After Uninstallation

### Verify Clean State

```bash
# Check no containers remain
docker ps -a | grep livestream
# Should return nothing

# Check no service remains
systemctl status livestream-server
# Should return "Unit livestream-server.service could not be found"

# Check no files remain
ls -la /opt/livestream-server
# Should return "No such file or directory"
```

### Reinstall

To reinstall after uninstallation:

```bash
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

---

## Uninstall Script Options Reference

```bash
./uninstall.sh [OPTIONS]

Options:
  (no args)        Remove application only (keep Docker installed)
  --full           Remove application AND Docker
  --keep-data      Keep database and configuration files
  --help           Show help message

Examples:
  ./uninstall.sh                    # Standard uninstall
  ./uninstall.sh --full             # Complete removal
  ./uninstall.sh --keep-data        # Preserve your data
```

---

## Safety Features

The uninstall script includes several safety features:

1. **Confirmation Prompt:** Always asks for confirmation before removing anything
2. **Backup on --keep-data:** Automatically backs up data before removal
3. **Error Handling:** Uses `|| true` to continue even if some commands fail
4. **Clear Output:** Color-coded messages show what's being removed
5. **Dry-run Safe:** Can run multiple times without causing issues

---

## Related Documentation

- [Installation Guide](INSTALL.md) - How to install the server
- [Configuration Guide](CONFIGURATION.md) - How to configure settings
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [README](../README.md) - Project overview
