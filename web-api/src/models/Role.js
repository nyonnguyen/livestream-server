const { db } = require('../config/database');

class Role {
  /**
   * Find role by ID
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM roles WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Find role by name
   */
  static findByName(name) {
    const stmt = db.prepare('SELECT * FROM roles WHERE name = ?');
    return stmt.get(name);
  }

  /**
   * Get all roles
   */
  static findAll() {
    const stmt = db.prepare('SELECT * FROM roles ORDER BY name');
    return stmt.all();
  }

  /**
   * Get user's role
   */
  static getUserRole(userId) {
    const stmt = db.prepare(`
      SELECT r.* FROM roles r
      INNER JOIN users u ON u.role_id = r.id
      WHERE u.id = ?
    `);
    return stmt.get(userId);
  }

  /**
   * Check if user has a specific permission
   */
  static hasPermission(userId, permission) {
    const role = this.getUserRole(userId);

    if (!role) {
      return false;
    }

    try {
      const permissions = JSON.parse(role.permissions);

      // Admin has all permissions
      if (permissions.includes('all')) {
        return true;
      }

      // Check for specific permission
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error parsing permissions:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  static getUserPermissions(userId) {
    const role = this.getUserRole(userId);

    if (!role) {
      return [];
    }

    try {
      return JSON.parse(role.permissions);
    } catch (error) {
      console.error('Error parsing permissions:', error);
      return [];
    }
  }

  /**
   * Assign role to user
   */
  static assignRoleToUser(userId, roleId, grantedBy = null) {
    // Update user's role_id
    const updateUserStmt = db.prepare(`
      UPDATE users SET role_id = ? WHERE id = ?
    `);
    updateUserStmt.run(roleId, userId);

    // Record in user_roles for audit trail
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO user_roles (user_id, role_id, granted_by, granted_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);

    return insertStmt.run(userId, roleId, grantedBy);
  }

  /**
   * Get role assignment history for a user
   */
  static getUserRoleHistory(userId) {
    const stmt = db.prepare(`
      SELECT ur.*, r.name, r.display_name,
             u.username as granted_by_username
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      LEFT JOIN users u ON ur.granted_by = u.id
      WHERE ur.user_id = ?
      ORDER BY ur.granted_at DESC
    `);

    return stmt.all(userId);
  }

  /**
   * Create a new role
   */
  static create(name, displayName, permissions) {
    const stmt = db.prepare(`
      INSERT INTO roles (name, display_name, permissions)
      VALUES (?, ?, ?)
    `);

    const permissionsJson = JSON.stringify(permissions);
    const result = stmt.run(name, displayName, permissionsJson);
    return result.lastInsertRowid;
  }

  /**
   * Update role
   */
  static update(id, displayName, permissions) {
    const stmt = db.prepare(`
      UPDATE roles
      SET display_name = ?, permissions = ?
      WHERE id = ?
    `);

    const permissionsJson = JSON.stringify(permissions);
    return stmt.run(displayName, permissionsJson, id);
  }

  /**
   * Delete role (only if no users assigned)
   */
  static delete(id) {
    // Check if any users have this role
    const usersWithRole = db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?').get(id);

    if (usersWithRole.count > 0) {
      throw new Error(`Cannot delete role: ${usersWithRole.count} users are assigned to this role`);
    }

    const stmt = db.prepare('DELETE FROM roles WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * Get role statistics
   */
  static getStats() {
    const stmt = db.prepare(`
      SELECT r.name, r.display_name, COUNT(u.id) as user_count
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id AND u.deleted_at IS NULL
      GROUP BY r.id, r.name, r.display_name
      ORDER BY r.name
    `);

    return stmt.all();
  }
}

module.exports = Role;
