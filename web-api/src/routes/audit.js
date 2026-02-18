const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { validateId } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/audit
 * Get activity logs with filters (admin only)
 */
router.get('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const filters = {
    userId: req.query.user_id ? parseInt(req.query.user_id) : null,
    action: req.query.action,
    resourceType: req.query.resource_type,
    resourceId: req.query.resource_id ? parseInt(req.query.resource_id) : null,
    ipAddress: req.query.ip_address,
    startDate: req.query.start_date,
    endDate: req.query.end_date,
    search: req.query.search
  };

  // Remove null/undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === null || filters[key] === undefined) {
      delete filters[key];
    }
  });

  const limit = req.query.limit ? parseInt(req.query.limit) : 100;
  const logs = ActivityLog.getAll(filters, limit);

  res.json({
    success: true,
    data: logs,
    count: logs.length
  });
}));

/**
 * GET /api/audit/recent
 * Get recent activity logs (admin only)
 */
router.get('/recent', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 20;
  const logs = ActivityLog.getRecent(limit);

  res.json({
    success: true,
    data: logs
  });
}));

/**
 * GET /api/audit/users/:id
 * Get activity logs for a specific user (admin only)
 */
router.get('/users/:id', authenticate, requireAdmin, validateId, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;

  const logs = ActivityLog.getUserActivity(userId, limit);

  res.json({
    success: true,
    data: logs
  });
}));

/**
 * GET /api/audit/stats
 * Get activity statistics (admin only)
 */
router.get('/stats', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days) : 7;

  const stats = ActivityLog.getStats(days);
  const byAction = ActivityLog.getByActionType(days);
  const mostActive = ActivityLog.getMostActiveUsers(10, days);

  res.json({
    success: true,
    data: {
      overall: stats,
      by_action: byAction,
      most_active_users: mostActive
    }
  });
}));

/**
 * GET /api/audit/search
 * Search activity logs (admin only)
 */
router.get('/search', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const searchTerm = req.query.q;

  if (!searchTerm) {
    return res.status(400).json({
      success: false,
      error: 'Search term (q) is required'
    });
  }

  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const logs = ActivityLog.search(searchTerm, limit);

  res.json({
    success: true,
    data: logs,
    count: logs.length
  });
}));

/**
 * POST /api/audit/cleanup
 * Clean up old audit logs (admin only)
 */
router.post('/cleanup', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { db } = require('../config/database');
  const retentionConfig = db.prepare('SELECT value FROM config WHERE key = ?').get('audit_retention_days');
  const retentionDays = retentionConfig ? parseInt(retentionConfig.value) : 90;

  const deletedCount = ActivityLog.cleanup(retentionDays);

  res.json({
    success: true,
    message: `Cleaned up ${deletedCount} old audit log entries`,
    deleted_count: deletedCount
  });
}));

module.exports = router;
