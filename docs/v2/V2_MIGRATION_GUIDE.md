# Migration Guide: v1.x to v2.0.0

## Overview

This guide helps you migrate from Livestream Server v1.x to v2.0.0. Version 2.0.0 includes automatic database migration, so the upgrade process is straightforward and safe.

**Migration Type:** Automatic with backward compatibility
**Data Loss Risk:** None - all existing data is preserved
**Estimated Downtime:** < 5 minutes
**Rollback:** Supported (instructions included)

---

## ⚠️ Before You Begin

### Prerequisites

1. **Backup Your Database**
   ```bash
   cp web-api/data/livestream.db web-api/data/livestream.db.backup
   ```

2. **Note Your Current Version**
   ```bash
   curl http://localhost:3000/api/version
   ```

3. **Document Your Configuration**
   - Note custom config values
   - Save environment variables
   - Export streams if needed

4. **Check Node Version**
   - Recommended: Node.js v18 or v20
   - Known issue with Node v23 (better-sqlite3 compatibility)

---

## 🚀 Migration Steps

### Option 1: Automatic Migration (Recommended)

The database will automatically migrate on first startup of v2.0.0.

1. **Stop the Current Server**
   ```bash
   # If running with Docker
   docker-compose down

   # If running directly
   pkill -f "node.*index.js"
   ```

2. **Update Code to v2.0.0**
   ```bash
   git pull origin main
   # OR download v2.0.0 release
   ```

3. **Install Dependencies**
   ```bash
   cd web-api
   npm install
   ```

4. **Start the Server**
   ```bash
   # With Docker
   docker-compose up -d

   # Without Docker
   npm start
   ```

5. **Verify Migration**
   ```bash
   # Check health
   curl http://localhost:3000/api/health

   # Check version
   curl http://localhost:3000/api

   # Check your user still exists
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"your-password"}'
   ```

6. **Check Logs**
   ```bash
   # Look for migration messages
   docker-compose logs web-api | grep -i "migration"
   ```

   Expected output:
   ```
   ✓ Added role_id column to users table
   ✓ Added soft delete columns to users table
   ✓ Added soft delete columns to streams table
   ✓ Created default roles (admin, editor, viewer)
   ✓ Assigned admin role to 1 existing users
   ✓ Migrated 7 missing config entries
   ✓ Database migration to v2.0 completed
   ```

---

## 📊 What Changes Automatically

### Database Changes

1. **New Tables Created:**
   - `user_sessions` - Login session tracking
   - `stream_history` - Stream change audit
   - `roles` - Role definitions
   - `user_roles` - Role assignment history
   - `public_ip_history` - IP change tracking

2. **Existing Tables Modified:**
   - `users` - Added: role_id, deleted_at, deleted_by
   - `streams` - Added: deleted_at, deleted_by, deletion_reason

3. **New Config Entries:**
   - `setup_wizard_completed`
   - `public_ip_monitor_enabled`
   - `public_ip_monitor_interval`
   - `stream_retention_days`
   - `session_max_per_user`
   - `audit_retention_days`
   - `app_version`

4. **Default Roles Created:**
   - Admin (full access)
   - Editor (streams + sessions)
   - Viewer (read-only)

5. **Existing Users:**
   - All existing users assigned "admin" role automatically
   - No password changes required
   - All existing data preserved

---

## 🔄 API Compatibility

### Unchanged Endpoints

All existing v1.x endpoints continue to work:
- ✅ `POST /api/auth/login`
- ✅ `GET /api/streams`
- ✅ `POST /api/streams`
- ✅ `PUT /api/streams/:id`
- ✅ `DELETE /api/streams/:id` (now soft deletes)
- ✅ `GET /api/sessions`
- ✅ `GET /api/config`

### Enhanced Endpoints

Some endpoints now return additional data:

**`POST /api/auth/login`** - Now returns:
```json
{
  "token": "...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": { "name": "admin" },  // NEW
    "permissions": ["all"]          // NEW
  }
}
```

**`GET /api/auth/me`** - Now includes:
```json
{
  "id": 1,
  "username": "admin",
  "role": { ... },      // NEW
  "permissions": []     // NEW
}
```

### New Endpoints

20+ new endpoints added (see API_REFERENCE.md):
- User management (`/api/users`)
- Session management (`/api/sessions/user-sessions`)
- Audit logs (`/api/audit`)
- Stream recovery (`/api/streams/deleted`, `/api/streams/:id/restore`)
- IP monitoring (`/api/network/public-ip-history`)
- Setup wizard (`/api/setup`)

---

## ⚙️ Configuration Changes

### Environment Variables

No changes required. All existing environment variables continue to work.

**Optional New Variables:**
```bash
# Override default values if desired
SESSION_MAX_PER_USER=5           # Max concurrent logins per user
CLEANUP_INTERVAL_HOURS=24        # How often to run cleanup
AUDIT_RETENTION_DAYS=90          # How long to keep audit logs
STREAM_RETENTION_DAYS=30         # How long to keep deleted streams
```

### Docker Compose

No changes required to `docker-compose.yml` for basic migration.

**Optional Enhancements:**
```yaml
services:
  web-api:
    environment:
      - SESSION_MAX_PER_USER=5
      - AUDIT_RETENTION_DAYS=90
```

---

## 🎯 Post-Migration Tasks

### 1. Test Core Functionality

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# List streams
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/streams

# Check sessions
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/sessions/user-sessions
```

### 2. Review User Roles

All existing users are assigned "admin" role. You may want to:

1. Create new users with appropriate roles
2. Change existing user roles if needed

```bash
# List all users
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/users

# Create an editor user
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/users \
  -d '{"username":"editor","password":"pass123","role_id":2}'
```

### 3. Configure IP Monitoring (Optional)

```bash
# Enable IP monitoring
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/network/monitor-config \
  -d '{"enabled":true,"interval_seconds":300}'
```

### 4. Review Deleted Streams

```bash
# Check if any streams were accidentally deleted
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/streams/deleted/list
```

### 5. Enable Cleanup Service

The cleanup service runs automatically every 24 hours. No action required.

Cleanup tasks:
- Expired sessions
- Old audit logs (90-day retention)
- Old stream history
- Old deleted streams (30-day retention)

---

## 🔙 Rollback Procedure

If you need to rollback to v1.x:

1. **Stop v2.0 Server**
   ```bash
   docker-compose down
   # OR pkill -f "node.*index.js"
   ```

2. **Restore Database Backup**
   ```bash
   cd web-api/data
   cp livestream.db livestream-v2.db  # Save v2 database
   cp livestream.db.backup livestream.db
   ```

3. **Checkout v1.x Code**
   ```bash
   git checkout v1.7.6  # Or your previous version
   ```

4. **Restart Server**
   ```bash
   docker-compose up -d
   # OR npm start
   ```

**Note:** Rolling back will lose:
- New users created in v2.0
- Session history
- Audit logs
- Stream change history
- IP change history

**Existing streams, users, and sessions will be restored.**

---

## ❓ Troubleshooting

### Issue: Migration Doesn't Run

**Symptoms:** No migration messages in logs, new endpoints return 404

**Solution:**
```bash
# Force migration by deleting a table (database will recreate)
sqlite3 web-api/data/livestream.db "DROP TABLE IF EXISTS user_sessions;"
# Restart server
```

### Issue: "Cannot find module" Errors

**Solution:**
```bash
cd web-api
rm -rf node_modules package-lock.json
npm install
```

### Issue: better-sqlite3 Compilation Error (Node v23)

**Solution:**
```bash
# Use Node v18 or v20
nvm use 20  # If using nvm
# OR
docker-compose up -d  # Docker uses compatible Node version
```

### Issue: "User not found" After Migration

**Solution:**
```bash
# Check users table
sqlite3 web-api/data/livestream.db "SELECT * FROM users;"

# Verify role assignment
sqlite3 web-api/data/livestream.db "SELECT u.username, r.name FROM users u LEFT JOIN roles r ON u.role_id = r.id;"
```

### Issue: Streams Not Showing Up

**Solution:**
```bash
# Check for soft-deleted streams
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/streams?include_deleted=true
```

### Issue: "Session revoked" Error

**Solution:**
```bash
# Clear expired sessions
sqlite3 web-api/data/livestream.db "DELETE FROM user_sessions WHERE expires_at < datetime('now');"

# Re-login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Note current version
- [ ] Document configuration
- [ ] Check Node version
- [ ] Read migration guide

### During Migration
- [ ] Stop server
- [ ] Update code
- [ ] Install dependencies
- [ ] Start server
- [ ] Check logs for migration messages

### Post-Migration
- [ ] Verify health endpoint
- [ ] Test login
- [ ] Test streams
- [ ] Check user sessions
- [ ] Review user roles
- [ ] Configure IP monitoring (optional)
- [ ] Test new features

### Verification
- [ ] All users can login
- [ ] All streams are visible
- [ ] Sessions work correctly
- [ ] Audit logs are recording
- [ ] No errors in logs
- [ ] Performance is acceptable

---

## 🆘 Support

If you encounter issues:

1. **Check Logs**
   ```bash
   docker-compose logs web-api
   # OR
   tail -f web-api/logs/app.log
   ```

2. **Verify Database**
   ```bash
   sqlite3 web-api/data/livestream.db "PRAGMA integrity_check;"
   sqlite3 web-api/data/livestream.db ".tables"
   ```

3. **Test Individual Components**
   - Health endpoint: `curl http://localhost:3000/api/health`
   - Database connection: Check logs for "Database schema initialized"
   - Migration: Look for "Database migration to v2.0 completed"

4. **Rollback if Needed**
   - Follow rollback procedure above
   - Keep v2 database for analysis

---

## 📚 Additional Resources

- [Implementation Summary](./V2_IMPLEMENTATION_SUMMARY.md)
- [API Reference](./V2_API_REFERENCE.md)
- [GitHub Issues](https://github.com/yourusername/livestream-server/issues)

---

## 🎉 What's Next?

After successful migration:

1. **Explore New Features**
   - Try session management
   - Test stream recovery
   - Review audit logs
   - Enable IP monitoring

2. **Set Up Users**
   - Create additional users
   - Assign appropriate roles
   - Test permission enforcement

3. **Configure Retention**
   - Adjust stream retention
   - Set audit log retention
   - Configure session limits

4. **Monitor Performance**
   - Watch cleanup service
   - Monitor IP detection
   - Review audit logs

---

**Migration Guide Version:** 1.0
**Target Version:** 2.0.0
**Last Updated:** February 2026

**Happy Streaming! 🎥**
