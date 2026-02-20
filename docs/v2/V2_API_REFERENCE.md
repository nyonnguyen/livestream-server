# Livestream Server v2.0.0 - API Reference

## Base URL
```
http://localhost:3000/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### POST /api/auth/login
Login and create a session.

**Request:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@localhost",
      "must_change_password": false,
      "role": {
        "id": 1,
        "name": "admin",
        "display_name": "Administrator"
      },
      "permissions": ["all"]
    }
  }
}
```

### POST /api/auth/logout
Logout and revoke current session.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
Get current user information.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@localhost",
    "is_active": true,
    "must_change_password": false,
    "created_at": "2026-02-18T00:00:00.000Z",
    "role": {
      "id": 1,
      "name": "admin",
      "display_name": "Administrator"
    },
    "permissions": ["all"]
  }
}
```

### PUT /api/auth/change-password
Change current user's password.

**Authentication:** Required

**Request:**
```json
{
  "oldPassword": "currentPassword",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 👤 User Management Endpoints (Admin Only)

### GET /api/users
List all users.

**Authentication:** Required (Admin)

**Query Parameters:**
- `include_deleted` (boolean) - Include deleted users

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@localhost",
      "is_active": true,
      "role_id": 1,
      "role_name": "admin",
      "role_display_name": "Administrator",
      "deleted_at": null,
      "created_at": "2026-02-18T00:00:00.000Z",
      "updated_at": "2026-02-18T00:00:00.000Z"
    }
  ]
}
```

### GET /api/users/:id
Get user by ID.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@localhost",
    "is_active": true,
    "role_id": 1,
    "role_name": "admin",
    "role_display_name": "Administrator",
    "role_permissions": "[\"all\"]",
    "recent_activity": [
      {
        "id": 1,
        "action": "user_login",
        "resource_type": "auth",
        "created_at": "2026-02-18T00:00:00.000Z"
      }
    ]
  }
}
```

### POST /api/users
Create a new user.

**Authentication:** Required (Admin)

**Request:**
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "newuser@example.com",
  "role_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "newuser",
    "email": "newuser@example.com",
    "is_active": true,
    "role_id": 2,
    "role_name": "editor",
    "role_display_name": "Editor"
  }
}
```

### PUT /api/users/:id
Update a user.

**Authentication:** Required (Admin)

**Request:**
```json
{
  "email": "updated@example.com",
  "is_active": true,
  "password": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "newuser",
    "email": "updated@example.com",
    "is_active": true
  }
}
```

### DELETE /api/users/:id
Soft delete a user.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### POST /api/users/:id/restore
Restore a deleted user.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "newuser",
    "deleted_at": null
  }
}
```

### PUT /api/users/:id/role
Change user's role.

**Authentication:** Required (Admin)

**Request:**
```json
{
  "role_id": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "newuser",
    "role_id": 3,
    "role_name": "viewer",
    "role_display_name": "Viewer"
  }
}
```

---

## 🔒 Session Management Endpoints

### GET /api/sessions/user-sessions
Get current user's login sessions.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "device_info": "Mozilla/5.0...",
      "ip_address": "192.168.1.100",
      "last_activity": "2026-02-18T00:00:00.000Z",
      "created_at": "2026-02-18T00:00:00.000Z",
      "expires_at": "2026-02-19T00:00:00.000Z",
      "is_current": true
    }
  ]
}
```

### DELETE /api/sessions/user-sessions/:id
Revoke a specific session.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

### DELETE /api/sessions/user-sessions
Revoke all other sessions (except current).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "All other sessions revoked successfully"
}
```

---

## 📊 Audit Log Endpoints (Admin Only)

### GET /api/audit
Get activity logs with filters.

**Authentication:** Required (Admin)

**Query Parameters:**
- `user_id` (integer) - Filter by user
- `action` (string) - Filter by action type
- `resource_type` (string) - Filter by resource type
- `resource_id` (integer) - Filter by resource ID
- `ip_address` (string) - Filter by IP
- `start_date` (ISO date) - Filter by start date
- `end_date` (ISO date) - Filter by end date
- `search` (string) - Search in action and details
- `limit` (integer) - Max results (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "username": "admin",
      "action": "user_login",
      "resource_type": "auth",
      "resource_id": null,
      "details": "{\"method\":\"POST\"}",
      "ip_address": "192.168.1.100",
      "created_at": "2026-02-18T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /api/audit/recent
Get recent activity logs.

**Authentication:** Required (Admin)

**Query Parameters:**
- `limit` (integer) - Max results (default: 20)

### GET /api/audit/users/:id
Get activity logs for a specific user.

**Authentication:** Required (Admin)

**Query Parameters:**
- `limit` (integer) - Max results (default: 50)

### GET /api/audit/stats
Get activity statistics.

**Authentication:** Required (Admin)

**Query Parameters:**
- `days` (integer) - Number of days (default: 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_activities": 150,
      "unique_users": 5,
      "resource_types": 8
    },
    "by_action": [
      {
        "action": "user_login",
        "count": 50
      },
      {
        "action": "stream_update",
        "count": 30
      }
    ],
    "most_active_users": [
      {
        "username": "admin",
        "activity_count": 75
      }
    ]
  }
}
```

### GET /api/audit/search
Search activity logs.

**Authentication:** Required (Admin)

**Query Parameters:**
- `q` (string) - Search term (required)
- `limit` (integer) - Max results (default: 50)

### POST /api/audit/cleanup
Clean up old audit logs.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 100 old audit log entries",
  "deleted_count": 100
}
```

---

## 📺 Stream Endpoints

### DELETE /api/streams/:id
Soft delete a stream.

**Authentication:** Required (Permission: streams:delete)

**Request:**
```json
{
  "reason": "No longer needed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stream deleted successfully"
}
```

### GET /api/streams/deleted/list
Get deleted streams.

**Authentication:** Required (Permission: streams:read)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Drone Stream 1",
      "stream_key": "drone_abc123",
      "deleted_at": "2026-02-18T00:00:00.000Z",
      "deleted_by": 1,
      "deleted_by_username": "admin",
      "deletion_reason": "No longer needed"
    }
  ]
}
```

### POST /api/streams/:id/restore
Restore a deleted stream.

**Authentication:** Required (Permission: streams:write)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Drone Stream 1",
    "deleted_at": null
  },
  "message": "Stream restored successfully"
}
```

### GET /api/streams/:id/history
Get stream change history.

**Authentication:** Required (Permission: streams:read)

**Query Parameters:**
- `limit` (integer) - Max results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "stream_id": 1,
      "action": "delete",
      "changed_by": 1,
      "changed_by_username": "admin",
      "changes": "{\"reason\":\"No longer needed\"}",
      "snapshot": "{\"name\":\"Drone Stream 1\"}",
      "ip_address": "192.168.1.100",
      "created_at": "2026-02-18T00:00:00.000Z"
    }
  ]
}
```

### DELETE /api/streams/:id/permanent
Permanently delete a stream.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "message": "Stream permanently deleted"
}
```

---

## 🌐 Network Endpoints

### GET /api/network/public-ip-history
Get public IP change history.

**Authentication:** Required

**Query Parameters:**
- `limit` (integer) - Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "old_ip": "203.0.113.1",
      "new_ip": "203.0.113.2",
      "detection_method": "auto",
      "auto_applied": false,
      "applied_at": null,
      "detected_at": "2026-02-18T00:00:00.000Z"
    }
  ]
}
```

### POST /api/network/public-ip-apply
Apply a detected IP change.

**Authentication:** Required (Admin)

**Request:**
```json
{
  "history_id": 1
}
```

OR

```json
{
  "ip_address": "203.0.113.2"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Public IP updated successfully",
  "data": {
    "public_ip": "203.0.113.2"
  }
}
```

### GET /api/network/monitor-status
Get IP monitor status.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "running": true,
    "currentIp": "203.0.113.2",
    "lastCheckTime": "2026-02-18T00:00:00.000Z",
    "enabled": true,
    "interval_seconds": 300
  }
}
```

### PUT /api/network/monitor-config
Update IP monitor configuration.

**Authentication:** Required (Admin)

**Request:**
```json
{
  "enabled": true,
  "interval_seconds": 600
}
```

**Response:**
```json
{
  "success": true,
  "message": "IP monitor configuration updated"
}
```

### POST /api/network/monitor-check
Trigger manual IP check.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "changed": true,
    "oldIp": "203.0.113.1",
    "newIp": "203.0.113.2",
    "historyId": 1
  }
}
```

---

## ⚙️ Setup Wizard Endpoints

### GET /api/setup/status
Check setup wizard completion status.

**Authentication:** None (Public)

**Response:**
```json
{
  "success": true,
  "data": {
    "completed": false
  }
}
```

### POST /api/setup/complete
Mark setup wizard as completed.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Setup wizard marked as completed"
}
```

### POST /api/setup/reset
Reset setup wizard status.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "message": "Setup wizard reset successfully"
}
```

### GET /api/setup/config
Get setup-related configuration.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "setup_wizard_completed": {
      "value": "false",
      "description": "Setup wizard completion status"
    },
    "public_ip_monitor_enabled": {
      "value": "false",
      "description": "Enable automatic public IP monitoring"
    }
  }
}
```

---

## 🏥 Health Check

### GET /api/health
Check API health.

**Authentication:** None (Public)

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-18T00:00:00.000Z"
}
```

---

## 🔑 Permissions Reference

### Permission Types

**Admin Role:**
- `all` - Full access to everything

**Editor Role:**
- `streams:read` - Read streams
- `streams:write` - Create/update streams
- `streams:delete` - Delete streams
- `sessions:read` - Read streaming sessions

**Viewer Role:**
- `streams:read` - Read streams
- `sessions:read` - Read streaming sessions

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "username",
      "message": "Username is required"
    }
  ]
}
```

---

## 🚦 HTTP Status Codes

- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

## 🔧 Rate Limiting

Login endpoint is rate limited:
- **Window:** 15 minutes
- **Max Requests:** 5
- **Applies to:** `/api/auth/login`

---

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. Pagination is not yet implemented (use limit parameter)
3. All IDs are integers
4. Boolean values in database are 0 or 1
5. Soft deleted items have `deleted_at` timestamp
6. All authenticated endpoints require valid JWT token
7. Session tokens are hashed with SHA256 in database

---

**Version:** 2.0.0
**Last Updated:** February 2026
