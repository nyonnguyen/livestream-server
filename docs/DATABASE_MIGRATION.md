# Database Migration and Recovery Guide

## Overview

The livestream server uses SQLite as its database. During updates, schema changes may occur that require database migrations. This guide explains how to handle database migrations and recover from corruption.

## Automatic Migration System

The application has built-in migrations that run on startup:

1. **Config Migration** - Adds missing configuration keys
2. **Schema Migration** - Adds new columns and tables
3. **Role Migration** - Creates default roles and assigns them

However, if the database is corrupted or locked during migration, the app will fail to start.

## Update Process with Database Safety

When you update the application (via web UI or manually), the system now:

1. ✅ Pulls latest code from GitHub
2. ✅ **NEW:** Runs database health check and migration
3. ✅ Creates automatic backup before changes
4. ✅ Validates database integrity
5. ✅ Rebuilds containers with new code

## Preventing Database Corruption

### The Problem
Database corruption can occur when:
- Container stopped forcefully during write operation
- System crash or power loss
- Disk full
- Code expects new schema but database has old schema
- Multiple processes accessing the database

### The Solution
The update script now includes `db-migrate.sh` which:
- Checks database integrity before container restart
- Creates automatic backups
- Attempts recovery if corruption detected
- Validates all required tables and columns exist

## Manual Database Operations

### 1. Check Database Health

```bash
# Run the migration script manually
./scripts/db-migrate.sh ./data/livestream.db
```

This will:
- Check integrity
- Create backup
- Report missing tables/columns
- Compact database

### 2. Recover Corrupted Database

If database is corrupted:

```bash
# The migration script will automatically attempt recovery
# But if you need to do it manually:

# Backup corrupted DB
cp data/livestream.db data/livestream.db.corrupt.backup

# Attempt recovery
sqlite3 data/livestream.db ".recover" | sqlite3 data/livestream.db.recovered

# If successful, replace
mv data/livestream.db.recovered data/livestream.db

# Restart containers
docker compose restart
```

### 3. Start Fresh (LOSES ALL DATA)

If recovery fails and you want to start fresh:

```bash
# Stop containers
docker compose down

# Backup old database (just in case)
cp data/livestream.db data/livestream.db.old.backup

# Remove corrupted database
rm data/livestream.db

# Restart - new database will be created
docker compose up -d

# Check logs
docker logs -f livestream-api
```

You'll need to:
- Login with default credentials (admin / from .env)
- Recreate streams
- Reconfigure settings

### 4. Restore from Backup

Backups are automatically created in `data/backups/`:

```bash
# List available backups
ls -lh data/backups/

# Restore from specific backup
docker compose down
cp data/backups/livestream.db.backup.YYYYMMDD_HHMMSS data/livestream.db
docker compose up -d
```

## Schema Version Tracking

The database tracks its schema version in the `config` table:

```bash
# Check current schema version
sqlite3 data/livestream.db "SELECT value FROM config WHERE key='app_version';"
```

## Common Migration Scenarios

### Scenario 1: Update from v2.8.0 to v2.9.1

Changes in v2.9.1:
- No schema changes
- Only code fixes

Migration: **None required** ✅

### Scenario 2: Update from v1.x to v2.x

Changes in v2.0:
- Added `role_id`, `deleted_at`, `deleted_by` to `users` table
- Added `deleted_at`, `deleted_by`, `deletion_reason` to `streams` table
- Added new tables: `roles`, `user_roles`, `user_sessions`, `stream_history`, `activity_log`, `public_ip_history`

Migration: **Automatic** ✅
- `migrateToV2()` function handles this
- Runs on first startup after update

### Scenario 3: Corrupted Database During Update

If update fails with `SQLITE_CORRUPT`:

1. **Check logs:**
   ```bash
   docker logs livestream-api
   ```

2. **Run migration script:**
   ```bash
   ./scripts/db-migrate.sh ./data/livestream.db
   ```

3. **If recovery succeeds:**
   ```bash
   docker compose restart
   ```

4. **If recovery fails:**
   - Restore from backup
   - Or start fresh (loses data)

## Best Practices

1. **Before Manual Updates:**
   ```bash
   # Always backup before pulling changes
   cp data/livestream.db data/livestream.db.backup
   git pull origin main
   ./scripts/db-migrate.sh ./data/livestream.db
   docker compose build
   docker compose up -d
   ```

2. **Regular Backups:**
   ```bash
   # Create cron job for daily backups
   0 2 * * * cp /opt/livestream-server/data/livestream.db /opt/livestream-server/data/backups/livestream.db.daily.$(date +\%Y\%m\%d)
   ```

3. **Monitor Logs:**
   ```bash
   # Watch for migration messages
   docker logs -f livestream-api | grep -i "migrat\|error\|corrupt"
   ```

## Troubleshooting

### Error: "database disk image is malformed"

**Cause:** Database corruption

**Solution:**
```bash
./scripts/db-migrate.sh ./data/livestream.db
# Or restore from backup
```

### Error: "no such column: users.role_id"

**Cause:** Database not migrated to v2.0

**Solution:**
```bash
# Stop containers
docker compose down

# Check which columns exist
sqlite3 data/livestream.db "PRAGMA table_info(users);"

# Restart - migration will run
docker compose up -d
```

### Error: "unable to open database file"

**Cause:** Permission issues or disk full

**Solution:**
```bash
# Check permissions
ls -lh data/livestream.db

# Fix permissions
chmod 644 data/livestream.db
chown 1000:1000 data/livestream.db

# Check disk space
df -h
```

## Emergency Recovery Checklist

When database issues occur:

- [ ] Check container logs: `docker logs livestream-api`
- [ ] Run health check: `./scripts/db-migrate.sh`
- [ ] Check backups: `ls data/backups/`
- [ ] Try recovery: Script will attempt automatically
- [ ] Restore from backup if recovery fails
- [ ] Start fresh as last resort
- [ ] Document what went wrong
- [ ] Update backup procedures if needed

## Support

If you encounter database issues not covered here:

1. Collect diagnostic info:
   ```bash
   docker logs livestream-api > logs.txt
   sqlite3 data/livestream.db "PRAGMA integrity_check;" > integrity.txt
   ls -lh data/ > files.txt
   ```

2. Create GitHub issue with:
   - Error message
   - Version (from VERSION file)
   - Diagnostic files
   - Steps to reproduce
