const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/system/update
 * Trigger system update (git pull + docker compose)
 * Requires authentication
 */
router.post('/update', authenticate, asyncHandler(async (req, res) => {
  const updateLogPath = '/tmp/livestream-update.log';
  const updateScriptPath = path.join(__dirname, '../../../scripts/update.sh');

  // Check if update script exists
  if (!fs.existsSync(updateScriptPath)) {
    return res.status(500).json({
      success: false,
      error: 'Update script not found'
    });
  }

  // Clear previous log
  if (fs.existsSync(updateLogPath)) {
    fs.unlinkSync(updateLogPath);
  }

  // Run update script in background
  const command = `bash ${updateScriptPath} > ${updateLogPath} 2>&1 &`;
  execSync(command);

  res.json({
    success: true,
    message: 'Update started in background',
    logPath: updateLogPath
  });
}));

/**
 * GET /api/system/update/status
 * Check update status by reading the log file
 */
router.get('/update/status', authenticate, asyncHandler(async (req, res) => {
  const updateLogPath = '/tmp/livestream-update.log';

  if (!fs.existsSync(updateLogPath)) {
    return res.json({
      success: true,
      data: {
        status: 'idle',
        log: ''
      }
    });
  }

  const log = fs.readFileSync(updateLogPath, 'utf8');

  // Check if update is complete
  const isComplete = log.includes('[UPDATE COMPLETE]') || log.includes('[UPDATE FAILED]');
  const isFailed = log.includes('[UPDATE FAILED]');

  res.json({
    success: true,
    data: {
      status: isComplete ? (isFailed ? 'failed' : 'complete') : 'running',
      log
    }
  });
}));

module.exports = router;
