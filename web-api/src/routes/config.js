const express = require('express');
const router = express.Router();
const { db, getDatabaseStats } = require('../config/database');
const SRSApi = require('../services/srsApi');
const { authenticate } = require('../middleware/auth');
const { validateUpdateConfig } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/config
 * Get system configuration
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const stmt = db.prepare('SELECT key, value, description FROM config');
  const configs = stmt.all();

  // Convert to key-value object
  const configObject = {};
  configs.forEach(config => {
    configObject[config.key] = {
      value: config.value,
      description: config.description
    };
  });

  res.json({
    success: true,
    data: configObject
  });
}));

/**
 * PUT /api/config
 * Update system configuration
 */
router.put('/', authenticate, validateUpdateConfig, asyncHandler(async (req, res) => {
  const updates = req.body;

  const updateStmt = db.prepare(`
    UPDATE config
    SET value = ?, updated_at = CURRENT_TIMESTAMP
    WHERE key = ?
  `);

  // Update each config value
  Object.keys(updates).forEach(key => {
    const value = typeof updates[key] === 'boolean'
      ? updates[key].toString()
      : updates[key].toString();

    updateStmt.run(value, key);
  });

  // Get updated config
  const stmt = db.prepare('SELECT key, value, description FROM config');
  const configs = stmt.all();

  const configObject = {};
  configs.forEach(config => {
    configObject[config.key] = {
      value: config.value,
      description: config.description
    };
  });

  res.json({
    success: true,
    data: configObject,
    message: 'Configuration updated successfully'
  });
}));

/**
 * GET /api/config/health
 * System health check
 */
router.get('/health', asyncHandler(async (req, res) => {
  // Database stats
  const dbStats = getDatabaseStats();

  // SRS health check
  const srsHealth = await SRSApi.healthCheck();

  // System info
  const health = {
    status: srsHealth.healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      status: 'healthy',
      stats: dbStats
    },
    srs: {
      status: srsHealth.healthy ? 'healthy' : 'unhealthy',
      version: srsHealth.version || null,
      error: srsHealth.error || null
    }
  };

  res.json({
    success: true,
    data: health
  });
}));

/**
 * GET /api/config/stats
 * System statistics
 */
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  // Database stats
  const dbStats = getDatabaseStats();

  // SRS stats
  const srsStats = await SRSApi.getServerStats();

  res.json({
    success: true,
    data: {
      database: dbStats,
      srs: srsStats
    }
  });
}));

module.exports = router;
