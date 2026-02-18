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
 * Executes on HOST system via nsenter
 */
router.post('/update', authenticate, asyncHandler(async (req, res) => {
  const updateLogPath = '/tmp/livestream-update.log';

  // Update script path on HOST filesystem (not container)
  const hostUpdateScriptPath = '/opt/livestream-server/scripts/update.sh';

  try {
    // Use nsenter to execute update script on HOST system
    // This enters the host's namespaces (PID 1 = host init process)
    const command = `nsenter --target 1 --mount --uts --ipc --net --pid -- /bin/bash ${hostUpdateScriptPath} > ${updateLogPath} 2>&1 &`;

    execSync(command);

    res.json({
      success: true,
      message: 'Update started in background',
      logPath: updateLogPath
    });
  } catch (error) {
    console.error('Failed to start update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start update: ' + error.message
    });
  }
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
