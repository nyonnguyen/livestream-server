const { db } = require('../config/database');

class StreamHistory {
  /**
   * Record a stream change
   */
  static recordChange(streamId, action, changedBy, changes = null, snapshot = null, ipAddress = null) {
    const stmt = db.prepare(`
      INSERT INTO stream_history (stream_id, action, changed_by, changes, snapshot, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const changesJson = changes ? JSON.stringify(changes) : null;
    const snapshotJson = snapshot ? JSON.stringify(snapshot) : null;

    const result = stmt.run(streamId, action, changedBy, changesJson, snapshotJson, ipAddress);
    return result.lastInsertRowid;
  }

  /**
   * Get history for a specific stream
   */
  static getStreamHistory(streamId, limit = 50) {
    const stmt = db.prepare(`
      SELECT sh.*, u.username as changed_by_username
      FROM stream_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.stream_id = ?
      ORDER BY sh.created_at DESC
      LIMIT ?
    `);

    return stmt.all(streamId, limit);
  }

  /**
   * Get all history with filters
   */
  static getAllHistory(filters = {}, limit = 100) {
    let query = `
      SELECT sh.*, u.username as changed_by_username, s.name as stream_name
      FROM stream_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      LEFT JOIN streams s ON sh.stream_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.streamId) {
      query += ` AND sh.stream_id = ?`;
      params.push(filters.streamId);
    }

    if (filters.action) {
      query += ` AND sh.action = ?`;
      params.push(filters.action);
    }

    if (filters.changedBy) {
      query += ` AND sh.changed_by = ?`;
      params.push(filters.changedBy);
    }

    if (filters.startDate) {
      query += ` AND sh.created_at >= ?`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND sh.created_at <= ?`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY sh.created_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get recent changes
   */
  static getRecent(limit = 20) {
    const stmt = db.prepare(`
      SELECT sh.*, u.username as changed_by_username, s.name as stream_name
      FROM stream_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      LEFT JOIN streams s ON sh.stream_id = s.id
      ORDER BY sh.created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * Get statistics
   */
  static getStats(days = 7) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_changes,
        COUNT(DISTINCT stream_id) as affected_streams,
        COUNT(DISTINCT changed_by) as unique_users
      FROM stream_history
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `);

    return stmt.get(days);
  }

  /**
   * Get changes by action type
   */
  static getByActionType(days = 7) {
    const stmt = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM stream_history
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY action
      ORDER BY count DESC
    `);

    return stmt.all(days);
  }

  /**
   * Clean up old history
   */
  static cleanup(retentionDays = 90) {
    const stmt = db.prepare(`
      DELETE FROM stream_history
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(retentionDays);
    return result.changes;
  }
}

module.exports = StreamHistory;
