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
   * Find all streams (excluding deleted by default)
   */
  static findAll(filters = {}) {
    let query = 'SELECT * FROM streams WHERE deleted_at IS NULL';
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
   * Find all streams including deleted
   */
  static findAllIncludingDeleted(filters = {}) {
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
   * Find deleted streams
   */
  static findDeleted() {
    const stmt = db.prepare(`
      SELECT s.*, u.username as deleted_by_username
      FROM streams s
      LEFT JOIN users u ON s.deleted_by = u.id
      WHERE s.deleted_at IS NOT NULL
      ORDER BY s.deleted_at DESC
    `);

    return stmt.all();
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
  static create(streamData, createdBy = null) {
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

    const streamId = result.lastInsertRowid;

    // Record history
    const StreamHistory = require('./StreamHistory');
    const newStream = this.findById(streamId);
    StreamHistory.recordChange(streamId, 'create', createdBy, null, newStream, null);

    return streamId;
  }

  /**
   * Update stream
   */
  static update(id, streamData, updatedBy = null) {
    // Get stream snapshot before update
    const oldStream = this.findById(id);

    const { name, stream_key, description, protocol, is_active, max_bitrate } = streamData;

    let query = 'UPDATE streams SET ';
    const updates = [];
    const params = [];
    const changes = {};

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
      changes.name = { old: oldStream.name, new: name };
    }
    if (stream_key !== undefined) {
      updates.push('stream_key = ?');
      params.push(stream_key);
      changes.stream_key = { old: oldStream.stream_key, new: stream_key };
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
      changes.description = { old: oldStream.description, new: description };
    }
    if (protocol !== undefined) {
      updates.push('protocol = ?');
      params.push(protocol);
      changes.protocol = { old: oldStream.protocol, new: protocol };
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
      changes.is_active = { old: oldStream.is_active, new: is_active };
    }
    if (max_bitrate !== undefined) {
      updates.push('max_bitrate = ?');
      params.push(max_bitrate);
      changes.max_bitrate = { old: oldStream.max_bitrate, new: max_bitrate };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    const stmt = db.prepare(query);
    const result = stmt.run(...params);

    // Record history
    const StreamHistory = require('./StreamHistory');
    const updatedStream = this.findById(id);
    StreamHistory.recordChange(id, 'update', updatedBy, changes, updatedStream, null);

    return result;
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

    if (stream.deleted_at) {
      return { valid: false, reason: 'Stream has been deleted' };
    }

    return { valid: true, stream };
  }

  /**
   * Soft delete stream
   */
  static softDelete(id, deletedBy, reason = null) {
    // Get stream snapshot before deletion
    const stream = this.findById(id);

    if (!stream) {
      throw new Error('Stream not found');
    }

    // Record history
    const StreamHistory = require('./StreamHistory');
    StreamHistory.recordChange(id, 'delete', deletedBy, {
      reason: reason
    }, stream, null);

    // Soft delete
    const stmt = db.prepare(`
      UPDATE streams
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, deletion_reason = ?, is_active = 0
      WHERE id = ?
    `);

    return stmt.run(deletedBy, reason, id);
  }

  /**
   * Restore soft deleted stream
   */
  static restore(id) {
    // Check if stream exists and is deleted
    const stream = this.findById(id);

    if (!stream) {
      throw new Error('Stream not found');
    }

    if (!stream.deleted_at) {
      throw new Error('Stream is not deleted');
    }

    // Record history
    const StreamHistory = require('./StreamHistory');
    StreamHistory.recordChange(id, 'restore', null, null, stream, null);

    // Restore
    const stmt = db.prepare(`
      UPDATE streams
      SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL, is_active = 1
      WHERE id = ?
    `);

    return stmt.run(id);
  }

  /**
   * Permanently delete stream (admin only)
   */
  static permanentDelete(id) {
    const stmt = db.prepare('DELETE FROM streams WHERE id = ?');
    return stmt.run(id);
  }
}

module.exports = Stream;
