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
   * Get all users
   */
  static findAll() {
    const stmt = db.prepare('SELECT id, username, email, is_active, created_at, updated_at FROM users ORDER BY created_at DESC');
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
}

module.exports = User;
