const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const Role = require('../models/Role');
const ActivityLog = require('../models/ActivityLog');
const { generateToken, authenticate } = require('../middleware/auth');
const { validateLogin, validateChangePassword } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Find user
  const user = User.findByUsername(username);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });
  }

  // Check if user is active
  if (!user.is_active) {
    return res.status(403).json({
      success: false,
      error: 'User account is disabled'
    });
  }

  // Verify password
  if (!User.verifyPassword(password, user.password_hash)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });
  }

  // Get device info and IP address
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

  // Generate token with session
  const token = generateToken(user, deviceInfo, ipAddress);

  // Get user role and permissions
  const role = Role.getUserRole(user.id);
  const permissions = role ? JSON.parse(role.permissions) : [];

  // Log successful login
  ActivityLog.log(user.id, 'user_login', 'user', user.id, { username: user.username }, ipAddress);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        must_change_password: user.must_change_password,
        role: role ? { id: role.id, name: role.name, display_name: role.display_name } : null,
        permissions
      }
    }
  });
}));

/**
 * POST /api/auth/logout
 * Logout and revoke session
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const token = req.headers.authorization.substring(7);
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Revoke the session
  UserSession.revokeSession(tokenHash);

  // Log logout
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  ActivityLog.log(req.user.id, 'user_logout', 'user', req.user.id, { username: req.user.username }, ipAddress);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', authenticate, validateChangePassword, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Get user
  const user = User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Verify old password
  if (!User.verifyPassword(oldPassword, user.password_hash)) {
    return res.status(401).json({
      success: false,
      error: 'Old password is incorrect'
    });
  }

  // Update password
  User.updatePassword(req.user.id, newPassword);

  // Log password change
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  ActivityLog.log(req.user.id, 'password_change', 'user', req.user.id, { username: req.user.username }, ipAddress);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Get user role and permissions
  const role = Role.getUserRole(user.id);
  const permissions = role ? JSON.parse(role.permissions) : [];

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      created_at: user.created_at,
      role: role ? { id: role.id, name: role.name, display_name: role.display_name } : null,
      permissions
    }
  });
}));

module.exports = router;
