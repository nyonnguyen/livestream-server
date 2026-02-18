const { db } = require('../config/database');

class PublicIpHistory {
  /**
   * Record a public IP detection
   */
  static recordDetection(oldIp, newIp, detectionMethod = 'manual') {
    const stmt = db.prepare(`
      INSERT INTO public_ip_history (old_ip, new_ip, detection_method)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(oldIp, newIp, detectionMethod);
    return result.lastInsertRowid;
  }

  /**
   * Get latest IP detections
   */
  static getLatest(limit = 10) {
    const stmt = db.prepare(`
      SELECT * FROM public_ip_history
      ORDER BY detected_at DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * Get the most recent IP
   */
  static getMostRecent() {
    const stmt = db.prepare(`
      SELECT * FROM public_ip_history
      ORDER BY detected_at DESC
      LIMIT 1
    `);

    return stmt.get();
  }

  /**
   * Mark an IP change as applied
   */
  static markApplied(id, autoApplied = false) {
    const stmt = db.prepare(`
      UPDATE public_ip_history
      SET auto_applied = ?, applied_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(autoApplied ? 1 : 0, id);
  }

  /**
   * Get IP change history with filters
   */
  static getHistory(filters = {}, limit = 50) {
    let query = `
      SELECT * FROM public_ip_history
      WHERE 1=1
    `;

    const params = [];

    if (filters.startDate) {
      query += ` AND detected_at >= ?`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND detected_at <= ?`;
      params.push(filters.endDate);
    }

    if (filters.applied !== undefined) {
      if (filters.applied) {
        query += ` AND applied_at IS NOT NULL`;
      } else {
        query += ` AND applied_at IS NULL`;
      }
    }

    query += ` ORDER BY detected_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get IP change statistics
   */
  static getStats(days = 30) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_changes,
        SUM(CASE WHEN auto_applied = 1 THEN 1 ELSE 0 END) as auto_applied_count,
        SUM(CASE WHEN applied_at IS NOT NULL THEN 1 ELSE 0 END) as applied_count
      FROM public_ip_history
      WHERE detected_at >= datetime('now', '-' || ? || ' days')
    `);

    return stmt.get(days);
  }

  /**
   * Check if IP has changed since last check
   */
  static hasChanged(currentIp) {
    const mostRecent = this.getMostRecent();

    if (!mostRecent) {
      return true; // First check
    }

    return mostRecent.new_ip !== currentIp;
  }

  /**
   * Get pending IP changes (detected but not applied)
   */
  static getPending() {
    const stmt = db.prepare(`
      SELECT * FROM public_ip_history
      WHERE applied_at IS NULL
      ORDER BY detected_at DESC
    `);

    return stmt.all();
  }

  /**
   * Clean up old history
   */
  static cleanup(retentionDays = 90) {
    const stmt = db.prepare(`
      DELETE FROM public_ip_history
      WHERE detected_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(retentionDays);
    return result.changes;
  }
}

module.exports = PublicIpHistory;
