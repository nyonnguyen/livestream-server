# Maintenance Scripts

This directory contains scripts for maintaining and managing the livestream server.

## 📜 Available Scripts

### restart.sh - Force Restart Containers

Stops and restarts all Docker containers with current source code.

**Usage:**
```bash
# Quick restart (no rebuild)
./scripts/restart.sh

# Restart with rebuild
./scripts/restart.sh --rebuild

# Full rebuild without cache
./scripts/restart.sh --no-cache

# Show help
./scripts/restart.sh --help
```

**Options:**
- `--rebuild` - Rebuild containers before restarting
- `--no-cache` - Rebuild without using cache (slower but ensures clean build)
- `--help` - Show usage information

**Use Cases:**
- Container is crash-looping
- Need to apply code changes
- Service not responding
- After pulling latest code

---

### reset.sh - Reset Application Data

Resets the application while preserving important data.

**Usage:**
```bash
# Run the reset script
./scripts/reset.sh
```

**What gets DELETED:**
- ❌ Active streaming sessions
- ❌ Session history
- ❌ Audit logs
- ❌ Stream history (deleted streams)
- ❌ User login sessions
- ❌ Public IP change history

**What gets PRESERVED:**
- ✅ User accounts and passwords
- ✅ Stream configurations
- ✅ System settings (config table)
- ✅ Roles and permissions

**Use Cases:**
- Clean up old session data
- Remove audit logs to free space
- Fresh start while keeping configurations
- After testing/development

**Safety:**
- Creates automatic backup before reset
- Requires confirmation before proceeding
- Can be restored from backup if needed

---

### update.sh - Update from GitHub

Updates the application code from GitHub repository.

**Usage:**
```bash
# Trigger update (usually called from web UI)
./scripts/update.sh
```

**What it does:**
1. Fetches latest code from GitHub
2. Switches to main branch if needed
3. Pulls latest changes
4. Shows instructions for manual rebuild

**Note:** This script is typically triggered by the "Update Now" button in the web UI, but can be run manually if needed.

---

## 🔧 Common Scenarios

### Container Crash-Looping
```bash
# Check logs first
docker compose logs web-api --tail=100

# If database is corrupted, reset
./scripts/reset.sh

# Otherwise, try restart with rebuild
./scripts/restart.sh --rebuild
```

### After Git Pull
```bash
# Pull latest code
git pull origin main

# Restart with rebuild
./scripts/restart.sh --rebuild
```

### Clean Up Old Data
```bash
# Reset while keeping important configs
./scripts/reset.sh
```

### Full Clean Rebuild
```bash
# Nuclear option - rebuild everything from scratch
./scripts/restart.sh --no-cache
```

---

## ⚠️ Important Notes

1. **Backups:** The reset script creates automatic backups, but always backup manually for critical data
2. **Downtime:** All scripts will cause brief service interruptions
3. **Database:** SQLite database corruption requires reset.sh to recover
4. **Permissions:** Some operations may require sudo

---

## 🆘 Troubleshooting

**Script won't run:**
```bash
chmod +x scripts/*.sh
```

**Database locked error:**
```bash
docker compose down
rm -f data/livestream.db-wal data/livestream.db-shm
./scripts/restart.sh
```

**Containers won't start:**
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 📚 Additional Resources

- Main documentation: `/README.md`
- Docker Compose config: `/docker-compose.yml`
- Environment variables: `/.env`
