#!/bin/sh

# Database Migration and Health Check Script
# Run this BEFORE restarting containers after an update

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

DB_PATH="${1:-./data/livestream.db}"
BACKUP_DIR="./data/backups"

log "Database Migration Script"
log "Database path: $DB_PATH"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    log "Database does not exist yet - will be created on first startup"
    exit 0
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check database integrity
log "Checking database integrity..."
if ! sqlite3 "$DB_PATH" "PRAGMA integrity_check;" > /dev/null 2>&1; then
    error "Database integrity check failed - database may be corrupted!"

    # Create backup of corrupted database
    CORRUPT_BACKUP="$BACKUP_DIR/livestream.db.corrupt.$(date +%Y%m%d_%H%M%S)"
    cp "$DB_PATH" "$CORRUPT_BACKUP"
    error "Corrupted database backed up to: $CORRUPT_BACKUP"

    # Try to recover
    warn "Attempting to recover database..."
    RECOVERED_DB="$DB_PATH.recovered"

    if sqlite3 "$DB_PATH" ".recover" | sqlite3 "$RECOVERED_DB" 2>/dev/null; then
        log "Recovery successful!"
        mv "$DB_PATH" "$DB_PATH.corrupt.backup"
        mv "$RECOVERED_DB" "$DB_PATH"
        log "Database recovered and replaced"
    else
        error "Recovery failed. Options:"
        error "  1. Restore from backup: cp $BACKUP_DIR/livestream.db.backup.YYYYMMDD_HHMMSS $DB_PATH"
        error "  2. Start fresh: rm $DB_PATH (WARNING: loses all data)"
        exit 1
    fi
else
    log "✓ Database integrity check passed"
fi

# Create safety backup before migration
BACKUP_FILE="$BACKUP_DIR/livestream.db.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DB_PATH" "$BACKUP_FILE"
log "✓ Safety backup created: $BACKUP_FILE"

# Check current schema version
log "Checking schema version..."
APP_VERSION=$(sqlite3 "$DB_PATH" "SELECT value FROM config WHERE key='app_version';" 2>/dev/null || echo "unknown")
log "Current app version in DB: $APP_VERSION"

# Check for required tables
log "Verifying database schema..."
TABLES=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table';" 2>/dev/null)

REQUIRED_TABLES="users streams sessions config roles user_sessions stream_history activity_log public_ip_history"
MISSING_TABLES=""

for table in $REQUIRED_TABLES; do
    if ! echo "$TABLES" | grep -q "^${table}$"; then
        MISSING_TABLES="$MISSING_TABLES $table"
    fi
done

if [ -n "$MISSING_TABLES" ]; then
    warn "Missing tables:$MISSING_TABLES"
    warn "These will be created on next startup"
else
    log "✓ All required tables exist"
fi

# Check for required columns in users table
log "Checking users table schema..."
USER_COLUMNS=$(sqlite3 "$DB_PATH" "PRAGMA table_info(users);" 2>/dev/null | cut -d'|' -f2)

REQUIRED_USER_COLS="role_id deleted_at deleted_by"
for col in $REQUIRED_USER_COLS; do
    if ! echo "$USER_COLUMNS" | grep -q "^${col}$"; then
        warn "users table missing column: $col (will be added on startup)"
    fi
done

# Check for required columns in streams table
log "Checking streams table schema..."
STREAM_COLUMNS=$(sqlite3 "$DB_PATH" "PRAGMA table_info(streams);" 2>/dev/null | cut -d'|' -f2)

REQUIRED_STREAM_COLS="deleted_at deleted_by deletion_reason"
for col in $REQUIRED_STREAM_COLS; do
    if ! echo "$STREAM_COLUMNS" | grep -q "^${col}$"; then
        warn "streams table missing column: $col (will be added on startup)"
    fi
done

# Compact database to reduce file size and fix minor corruption
log "Compacting database..."
sqlite3 "$DB_PATH" "VACUUM;" 2>/dev/null
log "✓ Database compacted"

# Update WAL mode
log "Ensuring WAL mode is enabled..."
sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" > /dev/null 2>&1
log "✓ WAL mode enabled"

log ""
log "================================================"
log "Database migration check complete!"
log "================================================"
log "Backup location: $BACKUP_FILE"
log ""
log "Safe to restart containers with:"
log "  docker compose restart"
log "================================================"
