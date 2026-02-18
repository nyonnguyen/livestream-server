const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { logActivity } = require('../middleware/auditLog');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/setup/status
 * Check setup wizard completion status (public)
 */
router.get('/status', asyncHandler(async (req, res) => {
  const config = db.prepare('SELECT value FROM config WHERE key = ?').get('setup_wizard_completed');
  const isCompleted = config && config.value === 'true';

  res.json({
    success: true,
    data: {
      completed: isCompleted
    }
  });
}));

/**
 * POST /api/setup/complete
 * Mark setup wizard as completed
 */
router.post('/complete', authenticate, logActivity('setup_complete', 'config'), asyncHandler(async (req, res) => {
  const stmt = db.prepare(`
    UPDATE config
    SET value = 'true'
    WHERE key = 'setup_wizard_completed'
  `);

  stmt.run();

  res.json({
    success: true,
    message: 'Setup wizard marked as completed'
  });
}));

/**
 * POST /api/setup/reset
 * Reset setup wizard status (admin only)
 */
router.post('/reset', authenticate, requireAdmin, logActivity('setup_reset', 'config'), asyncHandler(async (req, res) => {
  const stmt = db.prepare(`
    UPDATE config
    SET value = 'false'
    WHERE key = 'setup_wizard_completed'
  `);

  stmt.run();

  res.json({
    success: true,
    message: 'Setup wizard reset successfully'
  });
}));

/**
 * GET /api/setup/config
 * Get setup-related configuration
 */
router.get('/config', authenticate, asyncHandler(async (req, res) => {
  const configs = db.prepare(`
    SELECT key, value, description
    FROM config
    WHERE key IN (
      'setup_wizard_completed',
      'public_ip_monitor_enabled',
      'public_ip_monitor_interval',
      'stream_retention_days',
      'session_max_per_user',
      'audit_retention_days'
    )
  `).all();

  const configMap = {};
  configs.forEach(config => {
    configMap[config.key] = {
      value: config.value,
      description: config.description
    };
  });

  res.json({
    success: true,
    data: configMap
  });
}));

module.exports = router;
