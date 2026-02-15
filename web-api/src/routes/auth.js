const express = require('express');
const router = express.Router();
const User = require('../models/User');
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

  // Generate token
  const token = generateToken(user);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        must_change_password: user.must_change_password
      }
    }
  });
}));

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
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

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      created_at: user.created_at
    }
  });
}));

module.exports = router;
