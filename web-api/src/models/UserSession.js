const { db } = require('../config/database');
const crypto = require('crypto');

class UserSession {
  /**
   * Create a new user session
   */
  static createSession(userId, token, deviceInfo, ipAddress, expiresAt) {
    // Hash the token before storing (SHA256)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const stmt = db.prepare(`
      INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(userId, tokenHash, deviceInfo || null, ipAddress || null, expiresAt);
    return result.lastInsertRowid;
  }

  /**
   * Find session by token hash
   */
  static findByTokenHash(tokenHash) {
    const stmt = db.prepare(`
      SELECT * FROM user_sessions
      WHERE token_hash = ? AND revoked_at IS NULL
    `);
    return stmt.get(tokenHash);
  }

  /**
   * Find session by token (hashes it first)
   */
  static findByToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return this.findByTokenHash(tokenHash);
  }

  /**
   * Find all sessions for a user
   */
  static findByUserId(userId, activeOnly = true) {
    let query = `
      SELECT * FROM user_sessions
      WHERE user_id = ?
    `;

    if (activeOnly) {
      query += ` AND revoked_at IS NULL AND expires_at > datetime('now')`;
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = db.prepare(query);
    return stmt.all(userId);
  }

  /**
   * Update last activity timestamp
   */
  static updateActivity(tokenHash) {
    const stmt = db.prepare(`
      UPDATE user_sessions
      SET last_activity = CURRENT_TIMESTAMP
      WHERE token_hash = ? AND revoked_at IS NULL
    `);

    return stmt.run(tokenHash);
  }

  /**
   * Revoke a specific session
   */
  static revokeSession(tokenHash) {
    const stmt = db.prepare(`
      UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = ?
    `);

    return stmt.run(tokenHash);
  }

  /**
   * Revoke a session by ID
   */
  static revokeSessionById(sessionId, userId) {
    const stmt = db.prepare(`
      UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    return stmt.run(sessionId, userId);
  }

  /**
   * Revoke all user sessions except the current one
   */
  static revokeAllUserSessions(userId, exceptTokenHash = null) {
    let query = `
      UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked_at IS NULL
    `;

    const params = [userId];

    if (exceptTokenHash) {
      query += ` AND token_hash != ?`;
      params.push(exceptTokenHash);
    }

    const stmt = db.prepare(query);
    return stmt.run(...params);
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpired() {
    const stmt = db.prepare(`
      DELETE FROM user_sessions
      WHERE expires_at < datetime('now')
    `);

    const result = stmt.run();
    return result.changes;
  }

  /**
   * Check if user has reached max concurrent sessions
   */
  static hasReachedMaxSessions(userId, maxSessions = 5) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM user_sessions
      WHERE user_id = ? AND revoked_at IS NULL AND expires_at > datetime('now')
    `);

    const result = stmt.get(userId);
    return result.count >= maxSessions;
  }

  /**
   * Revoke oldest session for user (to make room for new one)
   */
  static revokeOldestSession(userId) {
    const stmt = db.prepare(`
      UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM user_sessions
        WHERE user_id = ? AND revoked_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1
      )
    `);

    return stmt.run(userId);
  }

  /**
   * Get session statistics
   */
  static getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM user_sessions');
    const activeStmt = db.prepare(`
      SELECT COUNT(*) as count FROM user_sessions
      WHERE revoked_at IS NULL AND expires_at > datetime('now')
    `);

    return {
      total: totalStmt.get().count,
      active: activeStmt.get().count
    };
  }
}

module.exports = UserSession;
