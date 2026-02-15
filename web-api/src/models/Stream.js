const { db } = require('../config/database');
const crypto = require('crypto');

class Stream {
  /**
   * Generate random stream key
   */
  static generateStreamKey(prefix = 'stream') {
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${random}`;
  }

  /**
   * Find stream by ID
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM streams WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Find stream by stream key
   */
  static findByStreamKey(streamKey) {
    const stmt = db.prepare('SELECT * FROM streams WHERE stream_key = ?');
    return stmt.get(streamKey);
  }

  /**
   * Find all streams
   */
  static findAll(filters = {}) {
    let query = 'SELECT * FROM streams WHERE 1=1';
    const params = [];

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    if (filters.protocol) {
      query += ' AND (protocol = ? OR protocol = "both")';
      params.push(filters.protocol);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get active streams count
   */
  static getActiveCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM streams WHERE is_active = 1');
    return stmt.get().count;
  }

  /**
   * Create new stream
   */
  static create(streamData) {
    const { name, stream_key, description, protocol, max_bitrate } = streamData;
    const finalStreamKey = stream_key || this.generateStreamKey(name.toLowerCase().replace(/\s+/g, ''));

    const stmt = db.prepare(`
      INSERT INTO streams (name, stream_key, description, protocol, max_bitrate, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      name,
      finalStreamKey,
      description || null,
      protocol || 'rtmp',
      max_bitrate || 5000
    );

    return result.lastInsertRowid;
  }

  /**
   * Update stream
   */
  static update(id, streamData) {
    const { name, stream_key, description, protocol, is_active, max_bitrate } = streamData;

    let query = 'UPDATE streams SET ';
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (stream_key !== undefined) {
      updates.push('stream_key = ?');
      params.push(stream_key);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (protocol !== undefined) {
      updates.push('protocol = ?');
      params.push(protocol);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }
    if (max_bitrate !== undefined) {
      updates.push('max_bitrate = ?');
      params.push(max_bitrate);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    const stmt = db.prepare(query);
    return stmt.run(...params);
  }

  /**
   * Delete stream
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM streams WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * Regenerate stream key
   */
  static regenerateStreamKey(id) {
    const stream = this.findById(id);
    if (!stream) {
      throw new Error('Stream not found');
    }

    const newStreamKey = this.generateStreamKey(stream.name.toLowerCase().replace(/\s+/g, ''));

    const stmt = db.prepare(`
      UPDATE streams
      SET stream_key = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(newStreamKey, id);
    return newStreamKey;
  }

  /**
   * Toggle stream active status
   */
  static toggleActive(id) {
    const stmt = db.prepare(`
      UPDATE streams
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(id);
  }

  /**
   * Validate stream key
   */
  static validateStreamKey(streamKey) {
    const stream = this.findByStreamKey(streamKey);

    if (!stream) {
      return { valid: false, reason: 'Stream key not found' };
    }

    if (!stream.is_active) {
      return { valid: false, reason: 'Stream is disabled' };
    }

    return { valid: true, stream };
  }
}

module.exports = Stream;
