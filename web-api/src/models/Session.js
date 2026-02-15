const { db } = require('../config/database');

class Session {
  /**
   * Create new session
   */
  static create(sessionData) {
    const { stream_id, client_id, ip_address, protocol } = sessionData;

    const stmt = db.prepare(`
      INSERT INTO sessions (stream_id, client_id, ip_address, protocol)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(stream_id, client_id, ip_address, protocol || 'rtmp');
    return result.lastInsertRowid;
  }

  /**
   * Find active sessions
   */
  static findActive() {
    const stmt = db.prepare(`
      SELECT
        s.id,
        s.stream_id,
        s.client_id,
        s.ip_address,
        s.protocol,
        s.started_at,
        s.bytes_received,
        st.name as stream_name,
        st.stream_key
      FROM sessions s
      JOIN streams st ON s.stream_id = st.id
      WHERE s.ended_at IS NULL
      ORDER BY s.started_at DESC
    `);

    return stmt.all();
  }

  /**
   * Find session by client ID
   */
  static findByClientId(clientId) {
    const stmt = db.prepare(`
      SELECT * FROM sessions
      WHERE client_id = ? AND ended_at IS NULL
    `);

    return stmt.get(clientId);
  }

  /**
   * Find session by stream ID
   */
  static findByStreamId(streamId) {
    const stmt = db.prepare(`
      SELECT * FROM sessions
      WHERE stream_id = ? AND ended_at IS NULL
      ORDER BY started_at DESC
    `);

    return stmt.all(streamId);
  }

  /**
   * Get active session count
   */
  static getActiveCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE ended_at IS NULL');
    return stmt.get().count;
  }

  /**
   * End session
   */
  static end(sessionId, bytesReceived = 0) {
    const stmt = db.prepare(`
      UPDATE sessions
      SET ended_at = CURRENT_TIMESTAMP, bytes_received = ?
      WHERE id = ? AND ended_at IS NULL
    `);

    return stmt.run(bytesReceived, sessionId);
  }

  /**
   * End session by client ID
   */
  static endByClientId(clientId, bytesReceived = 0) {
    const stmt = db.prepare(`
      UPDATE sessions
      SET ended_at = CURRENT_TIMESTAMP, bytes_received = ?
      WHERE client_id = ? AND ended_at IS NULL
    `);

    return stmt.run(bytesReceived, clientId);
  }

  /**
   * End session by stream ID
   */
  static endByStreamId(streamId) {
    const stmt = db.prepare(`
      UPDATE sessions
      SET ended_at = CURRENT_TIMESTAMP
      WHERE stream_id = ? AND ended_at IS NULL
    `);

    return stmt.run(streamId);
  }

  /**
   * Get session statistics
   */
  static getStatistics(filters = {}) {
    let query = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN ended_at IS NULL THEN 1 END) as active_sessions,
        SUM(bytes_received) as total_bytes_received,
        AVG(CASE
          WHEN ended_at IS NOT NULL
          THEN (julianday(ended_at) - julianday(started_at)) * 86400
        END) as avg_duration_seconds
      FROM sessions
      WHERE 1=1
    `;

    const params = [];

    if (filters.stream_id) {
      query += ' AND stream_id = ?';
      params.push(filters.stream_id);
    }

    if (filters.since) {
      query += ' AND started_at >= ?';
      params.push(filters.since);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params);
  }

  /**
   * Get recent sessions
   */
  static findRecent(limit = 10) {
    const stmt = db.prepare(`
      SELECT
        s.id,
        s.stream_id,
        s.client_id,
        s.ip_address,
        s.protocol,
        s.started_at,
        s.ended_at,
        s.bytes_received,
        st.name as stream_name,
        st.stream_key,
        CASE
          WHEN s.ended_at IS NULL THEN 'active'
          ELSE 'ended'
        END as status,
        CASE
          WHEN s.ended_at IS NULL
          THEN (julianday('now') - julianday(s.started_at)) * 86400
          ELSE (julianday(s.ended_at) - julianday(s.started_at)) * 86400
        END as duration_seconds
      FROM sessions s
      JOIN streams st ON s.stream_id = st.id
      ORDER BY s.started_at DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * Clean old sessions
   */
  static cleanOld(olderThanDays = 30) {
    const stmt = db.prepare(`
      DELETE FROM sessions
      WHERE ended_at IS NOT NULL
      AND ended_at < datetime('now', '-' || ? || ' days')
    `);

    return stmt.run(olderThanDays);
  }
}

module.exports = Session;
