#!/bin/bash

# Reset script for livestream-server
# Resets the application but preserves user accounts, settings, and stream configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Determine installation directory
if [ -d "/opt/livestream-server" ]; then
    INSTALL_DIR="/opt/livestream-server"
elif [ -d "$HOME/livestream-server" ]; then
    INSTALL_DIR="$HOME/livestream-server"
else
    error "Cannot find livestream-server installation directory"
    exit 1
fi

log "Livestream Server Reset Script"
log "Installation directory: $INSTALL_DIR"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    warn "This script may require sudo for some operations"
fi

cd "$INSTALL_DIR" || exit 1

# Check if database exists
DB_PATH="$INSTALL_DIR/data/livestream.db"
if [ ! -f "$DB_PATH" ]; then
    error "Database not found at: $DB_PATH"
    exit 1
fi

echo ""
warn "╔════════════════════════════════════════════════════════╗"
warn "║                    ⚠️  WARNING  ⚠️                      ║"
warn "╚════════════════════════════════════════════════════════╝"
echo ""
warn "This will reset the following data:"
warn "  ❌ Active streaming sessions"
warn "  ❌ Session history"
warn "  ❌ Audit logs"
warn "  ❌ Stream history (deleted streams)"
warn "  ❌ User login sessions"
warn "  ❌ Public IP change history"
echo ""
info "The following will be PRESERVED:"
info "  ✅ User accounts and passwords"
info "  ✅ Stream configurations"
info "  ✅ System settings (config table)"
info "  ✅ Roles and permissions"
echo ""

read -p "Are you sure you want to continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Reset cancelled"
    exit 0
fi

# Create backup
BACKUP_FILE="$INSTALL_DIR/data/livestream.db.backup-$(date +%Y%m%d-%H%M%S)"
log "Creating backup: $BACKUP_FILE"
cp "$DB_PATH" "$BACKUP_FILE"

# Stop containers
log "Stopping containers..."
docker compose down

# Clean session data
log "Cleaning up temporary data..."

# Remove WAL and SHM files
rm -f "$INSTALL_DIR/data/livestream.db-wal"
rm -f "$INSTALL_DIR/data/livestream.db-shm"

# Clean specific tables using SQL
log "Resetting database tables..."
sqlite3 "$DB_PATH" << 'EOF'
-- Delete session-related data
DELETE FROM sessions;
DELETE FROM user_sessions;

-- Delete activity logs
DELETE FROM activity_log;

-- Delete stream history
DELETE FROM stream_history;

-- Delete public IP history
DELETE FROM public_ip_history;

-- Reset any temporary flags
UPDATE config SET value = 'false' WHERE key = 'setup_wizard_completed' AND value = 'pending';

-- Vacuum to reclaim space
VACUUM;

.exit
EOF

if [ $? -eq 0 ]; then
    log "Database tables reset successfully"
else
    error "Failed to reset database tables"
    warn "Restoring from backup..."
    cp "$BACKUP_FILE" "$DB_PATH"
    exit 1
fi

# Start containers
log "Starting containers..."
docker compose up -d

# Wait for services to be ready
log "Waiting for services to start..."
sleep 10

# Check container status
log "Checking container status..."
docker compose ps

echo ""
log "╔════════════════════════════════════════════════════════╗"
log "║              ✅ Reset Completed Successfully           ║"
log "╚════════════════════════════════════════════════════════╝"
echo ""
info "Backup created at: $BACKUP_FILE"
info "You can now login with your existing credentials"
echo ""

exit 0
