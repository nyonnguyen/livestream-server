const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Find user by username
   */
  static findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  /**
   * Find user by ID
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Create new user
   */
  static create(userData) {
    const { username, password, email } = userData;
    const passwordHash = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, email, must_change_password)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(username, passwordHash, email || null, 1);
    return result.lastInsertRowid;
  }

  /**
   * Update user password
   */
  static updatePassword(userId, newPassword) {
    const passwordHash = bcrypt.hashSync(newPassword, 10);

    const stmt = db.prepare(`
      UPDATE users
      SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(passwordHash, userId);
  }

  /**
   * Verify user password
   */
  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  /**
   * Get all users (excluding deleted by default)
   */
  static findAll(includeDeleted = false) {
    let query = `
      SELECT u.id, u.username, u.email, u.is_active, u.role_id, u.deleted_at,
             u.created_at, u.updated_at,
             r.name as role_name, r.display_name as role_display_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
    `;

    if (!includeDeleted) {
      query += ' WHERE u.deleted_at IS NULL';
    }

    query += ' ORDER BY u.created_at DESC';

    const stmt = db.prepare(query);
    return stmt.all();
  }

  /**
   * Update user
   */
  static update(userId, userData) {
    const { email, is_active } = userData;

    const stmt = db.prepare(`
      UPDATE users
      SET email = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(email, is_active, userId);
  }

  /**
   * Delete user
   */
  static delete(userId) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(userId);
  }

  /**
   * Clear must_change_password flag
   */
  static clearMustChangePassword(userId) {
    const stmt = db.prepare(`
      UPDATE users
      SET must_change_password = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(userId);
  }

  /**
   * Soft delete user
   */
  static softDelete(userId, deletedBy, reason = null) {
    const stmt = db.prepare(`
      UPDATE users
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, is_active = 0
      WHERE id = ?
    `);

    return stmt.run(deletedBy, userId);
  }

  /**
   * Restore soft deleted user
   */
  static restore(userId) {
    const stmt = db.prepare(`
      UPDATE users
      SET deleted_at = NULL, deleted_by = NULL, is_active = 1
      WHERE id = ?
    `);

    return stmt.run(userId);
  }

  /**
   * Get deleted users
   */
  static findDeleted() {
    const stmt = db.prepare(`
      SELECT u.id, u.username, u.email, u.deleted_at, u.deleted_by,
             del.username as deleted_by_username,
             r.name as role_name, r.display_name as role_display_name
      FROM users u
      LEFT JOIN users del ON u.deleted_by = del.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.deleted_at IS NOT NULL
      ORDER BY u.deleted_at DESC
    `);

    return stmt.all();
  }

  /**
   * Assign role to user
   */
  static assignRole(userId, roleId) {
    const stmt = db.prepare(`
      UPDATE users
      SET role_id = ?
      WHERE id = ?
    `);

    return stmt.run(roleId, userId);
  }

  /**
   * Get user with role details
   */
  static findByIdWithRole(userId) {
    const stmt = db.prepare(`
      SELECT u.*, r.name as role_name, r.display_name as role_display_name,
             r.permissions as role_permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `);

    return stmt.get(userId);
  }

  /**
   * Check if user has permission
   */
  static hasPermission(userId, permission) {
    const Role = require('./Role');
    return Role.hasPermission(userId, permission);
  }

  /**
   * Get role
   */
  static getRole(userId) {
    const Role = require('./Role');
    return Role.getUserRole(userId);
  }
}

module.exports = User;
