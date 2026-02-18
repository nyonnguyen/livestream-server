const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireAdmin } = require('../middleware/rbac');
const { logActivity } = require('../middleware/auditLog');
const { validateId } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const includeDeleted = req.query.include_deleted === 'true';
  const users = User.findAll(includeDeleted);

  // Remove password_hash from response
  const sanitizedUsers = users.map(user => {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  res.json({
    success: true,
    data: sanitizedUsers
  });
}));

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
router.get('/:id', authenticate, requireAdmin, validateId, asyncHandler(async (req, res) => {
  const user = User.findByIdWithRole(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Remove password_hash
  const { password_hash, ...userWithoutPassword } = user;

  // Get activity log
  const recentActivity = ActivityLog.getUserActivity(req.params.id, 10);

  res.json({
    success: true,
    data: {
      ...userWithoutPassword,
      recent_activity: recentActivity
    }
  });
}));

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', authenticate, requireAdmin, logActivity('user_create', 'user'), asyncHandler(async (req, res) => {
  const { username, password, email, role_id } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  // Check if username already exists
  const existingUser = User.findByUsername(username);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'Username already exists'
    });
  }

  // Validate role if provided
  if (role_id) {
    const role = Role.findById(role_id);
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role ID'
      });
    }
  }

  // Create user
  const userId = User.create({ username, password, email });

  // Assign role if provided
  if (role_id) {
    Role.assignRoleToUser(userId, role_id, req.user.id);
  }

  const newUser = User.findByIdWithRole(userId);
  const { password_hash, ...userWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    data: userWithoutPassword
  });
}));

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', authenticate, requireAdmin, validateId, logActivity('user_update', 'user'), asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { email, is_active, password } = req.body;

  // Check if user exists
  const user = User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Prevent deactivating yourself
  if (userId === req.user.id && is_active === false) {
    return res.status(400).json({
      success: false,
      error: 'Cannot deactivate your own account'
    });
  }

  // Update basic info
  if (email !== undefined || is_active !== undefined) {
    User.update(userId, { email: email || user.email, is_active: is_active !== undefined ? is_active : user.is_active });
  }

  // Update password if provided
  if (password) {
    User.updatePassword(userId, password);
  }

  const updatedUser = User.findByIdWithRole(userId);
  const { password_hash, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    data: userWithoutPassword
  });
}));

/**
 * DELETE /api/users/:id
 * Soft delete user (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, validateId, logActivity('user_delete', 'user'), asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  // Check if user exists
  const user = User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Prevent deleting yourself
  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete your own account'
    });
  }

  // Prevent deleting the last admin
  const userRole = Role.getUserRole(userId);
  if (userRole && userRole.name === 'admin') {
    const adminRole = Role.findByName('admin');
    const roleStats = Role.getStats();
    const adminCount = roleStats.find(s => s.name === 'admin');

    if (adminCount && adminCount.user_count <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the last admin user'
      });
    }
  }

  // Soft delete
  User.softDelete(userId, req.user.id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

/**
 * POST /api/users/:id/restore
 * Restore soft deleted user (admin only)
 */
router.post('/:id/restore', authenticate, requireAdmin, validateId, logActivity('user_restore', 'user'), asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  // Check if user exists and is deleted
  const users = User.findAll(true);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  if (!user.deleted_at) {
    return res.status(400).json({
      success: false,
      error: 'User is not deleted'
    });
  }

  // Restore user
  User.restore(userId);

  const restoredUser = User.findByIdWithRole(userId);
  const { password_hash, ...userWithoutPassword } = restoredUser;

  res.json({
    success: true,
    data: userWithoutPassword
  });
}));

/**
 * PUT /api/users/:id/role
 * Change user role (admin only)
 */
router.put('/:id/role', authenticate, requireAdmin, validateId, logActivity('user_role_change', 'user'), asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { role_id } = req.body;

  if (!role_id) {
    return res.status(400).json({
      success: false,
      error: 'Role ID is required'
    });
  }

  // Check if user exists
  const user = User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Check if role exists
  const role = Role.findById(role_id);
  if (!role) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role ID'
    });
  }

  // Prevent changing your own role
  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Cannot change your own role'
    });
  }

  // Prevent removing the last admin
  const currentRole = Role.getUserRole(userId);
  if (currentRole && currentRole.name === 'admin' && role.name !== 'admin') {
    const roleStats = Role.getStats();
    const adminCount = roleStats.find(s => s.name === 'admin');

    if (adminCount && adminCount.user_count <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change the role of the last admin user'
      });
    }
  }

  // Assign new role
  Role.assignRoleToUser(userId, role_id, req.user.id);

  const updatedUser = User.findByIdWithRole(userId);
  const { password_hash, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    data: userWithoutPassword
  });
}));

/**
 * GET /api/users/deleted
 * Get deleted users (admin only)
 */
router.get('/deleted', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const deletedUsers = User.findDeleted();

  res.json({
    success: true,
    data: deletedUsers
  });
}));

module.exports = router;
