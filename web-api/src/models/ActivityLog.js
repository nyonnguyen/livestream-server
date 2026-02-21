const { db } = require('../config/database');

class ActivityLog {
  /**
   * Log an activity
   */
  static log(userId, action, resourceType, resourceId = null, details = null, ipAddress = null) {
    const stmt = db.prepare(`
      INSERT INTO activity_log (user_id, action, resource_type, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const detailsJson = details ? JSON.stringify(details) : null;
    const result = stmt.run(userId, action, resourceType, resourceId, detailsJson, ipAddress);
    return result.lastInsertRowid;
  }

  /**
   * Get all activity logs with filters
   */
  static getAll(filters = {}, limit = 100) {
    let query = `
      SELECT al.*, u.username
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.userId) {
      query += ` AND al.user_id = ?`;
      params.push(filters.userId);
    }

    if (filters.action) {
      query += ` AND al.action = ?`;
      params.push(filters.action);
    }

    if (filters.resourceType) {
      query += ` AND al.resource_type = ?`;
      params.push(filters.resourceType);
    }

    if (filters.resourceId) {
      query += ` AND al.resource_id = ?`;
      params.push(filters.resourceId);
    }

    if (filters.ipAddress) {
      query += ` AND al.ip_address = ?`;
      params.push(filters.ipAddress);
    }

    if (filters.startDate) {
      query += ` AND al.created_at >= ?`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND al.created_at <= ?`;
      params.push(filters.endDate);
    }

    if (filters.search) {
      query += ` AND (al.action LIKE ? OR al.details LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get activity for a specific user
   */
  static getUserActivity(userId, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM activity_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(userId, limit);
  }

  /**
   * Get activity for a specific resource
   */
  static getResourceActivity(resourceType, resourceId, limit = 50) {
    const stmt = db.prepare(`
      SELECT al.*, u.username
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.resource_type = ? AND al.resource_id = ?
      ORDER BY al.created_at DESC
      LIMIT ?
    `);

    return stmt.all(resourceType, resourceId, limit);
  }

  /**
   * Get recent activity
   */
  static getRecent(limit = 20) {
    const stmt = db.prepare(`
      SELECT al.*, u.username
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * Clean up old logs based on retention period
   */
  static cleanup(retentionDays = 90) {
    const stmt = db.prepare(`
      DELETE FROM activity_log
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(retentionDays);
    return result.changes;
  }

  /**
   * Get activity statistics
   */
  static getStats(days = 7) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(DISTINCT resource_type) as resource_types
      FROM activity_log
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `);

    return stmt.get(days);
  }

  /**
   * Get activity by action type
   */
  static getByActionType(days = 7) {
    const stmt = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM activity_log
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY action
      ORDER BY count DESC
    `);

    return stmt.all(days);
  }

  /**
   * Get most active users
   */
  static getMostActiveUsers(limit = 10, days = 7) {
    const stmt = db.prepare(`
      SELECT u.username, COUNT(al.id) as activity_count
      FROM activity_log al
      INNER JOIN users u ON al.user_id = u.id
      WHERE al.created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY al.user_id, u.username
      ORDER BY activity_count DESC
      LIMIT ?
    `);

    return stmt.all(days, limit);
  }

  /**
   * Search logs
   */
  static search(searchTerm, limit = 50) {
    const stmt = db.prepare(`
      SELECT al.*, u.username
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.action LIKE ? OR al.details LIKE ? OR u.username LIKE ?
      ORDER BY al.created_at DESC
      LIMIT ?
    `);

    const term = `%${searchTerm}%`;
    return stmt.all(term, term, term, limit);
  }
}

module.exports = ActivityLog;
