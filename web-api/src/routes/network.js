const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const axios = require('axios');
const PublicIpHistory = require('../models/PublicIpHistory');
const publicIpMonitor = require('../services/publicIpMonitor');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { logActivity } = require('../middleware/auditLog');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  getNetworkInterfaces,
  getBestIPAddress,
  getServerIP,
  getClientIPFromRequest
} = require('../utils/networkDetection');

/**
 * GET /api/network/detect-public-ip
 * Detect public IP address from external service with retry logic
 */
router.get('/detect-public-ip', async (req, res) => {
  try {
    // Try multiple services for reliability
    const services = [
      { url: 'https://api.ipify.org?format=json', name: 'ipify' },
      { url: 'https://api.my-ip.io/ip.json', name: 'my-ip.io' },
      { url: 'https://ifconfig.me/ip', name: 'ifconfig.me' }
    ];

    const errors = [];
    const maxRetries = 2;

    for (const service of services) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await axios.get(service.url, { timeout: 8000 });
          let publicIP;

          if (typeof response.data === 'string') {
            publicIP = response.data.trim();
          } else if (response.data.ip) {
            publicIP = response.data.ip;
          }

          if (publicIP && /^\d+\.\d+\.\d+\.\d+$/.test(publicIP)) {
            return res.json({
              success: true,
              data: { publicIP, source: service.name }
            });
          }
        } catch (err) {
          const errorMsg = `${service.name} (attempt ${attempt}/${maxRetries}): ${err.code || err.message}`;
          errors.push(errorMsg);
          console.log(`Failed to fetch from ${errorMsg}`);

          // Wait before retry
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }

    res.status(503).json({
      success: false,
      error: 'Unable to detect public IP. Please check your internet connection or try again later.',
      details: errors,
      suggestion: 'Ensure the server has internet access and external services are reachable.'
    });
  } catch (error) {
    console.error('Unexpected error detecting public IP:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while detecting public IP',
      details: error.message
    });
  }
});

/**
 * GET /api/network/interfaces
 * Get all available network interfaces
 */
router.get('/interfaces', (req, res) => {
  try {
    const interfaces = getNetworkInterfaces();
    const bestIP = getBestIPAddress();
    const clientIP = getClientIPFromRequest(req);

    // Determine source from the first interface (they're all from the same source)
    const source = interfaces.length > 0 ? interfaces[0].source : 'unknown';

    res.json({
      success: true,
      data: {
        interfaces,
        recommended: bestIP,
        clientIP, // Suggested IP based on where the request came from (user's browser IP)
        hostIP: bestIP, // Use the best detected IP from host network interfaces
        source // 'host' if using actual host IPs, 'container' if using Docker container IPs
      }
    });
  } catch (error) {
    console.error('Error getting network interfaces:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get network interfaces'
    });
  }
});

/**
 * GET /api/network/server-ip
 * Get the current server IP (configured or auto-detected)
 * This is a PUBLIC endpoint - no auth required
 */
router.get('/server-ip', (req, res) => {
  try {
    const serverIP = getServerIP(db);

    res.json({
      success: true,
      data: {
        ip: serverIP
      }
    });
  } catch (error) {
    console.error('Error getting server IP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get server IP'
    });
  }
});

/**
 * GET /api/network/qr-ip
 * Get the IP to use for QR codes (LAN or Public based on settings)
 * This is a PUBLIC endpoint - no auth required
 */
router.get('/qr-ip', (req, res) => {
  try {
    // Get QR mode setting
    const qrModeRow = db.prepare('SELECT value FROM config WHERE key = ?').get('server_qr_mode');
    const qrMode = qrModeRow ? qrModeRow.value : 'lan';

    let ip;

    if (qrMode === 'public') {
      // Priority: hostname > public IP > LAN IP
      const hostnameRow = db.prepare('SELECT value FROM config WHERE key = ?').get('server_hostname');
      const hostname = hostnameRow ? hostnameRow.value : null;

      if (hostname) {
        ip = hostname;
      } else {
        const publicIpRow = db.prepare('SELECT value FROM config WHERE key = ?').get('server_public_ip');
        ip = publicIpRow ? publicIpRow.value : null;
      }

      // Fallback to LAN IP if no public IP/hostname set
      if (!ip) {
        ip = getServerIP(db);
      }
    } else {
      // Use LAN IP
      ip = getServerIP(db);
    }

    res.json({
      success: true,
      data: {
        ip,
        mode: qrMode
      }
    });
  } catch (error) {
    console.error('Error getting QR IP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR IP'
    });
  }
});

/**
 * GET /api/network/config
 * Get network configuration settings
 */
router.get('/config', (req, res) => {
  try {
    const rows = db.prepare("SELECT key, value FROM config WHERE key LIKE 'server_%'").all();

    const config = {};
    rows.forEach(row => {
      config[row.key] = row.value;
    });

    // Set defaults if not present
    if (!config.server_ip_mode) {
      config.server_ip_mode = 'auto';
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching network config:', error);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
});

/**
 * PUT /api/network/config
 * Update network configuration
 */
router.put('/config', (req, res) => {
  const {
    server_ip_mode,
    server_ip_address,
    server_public_ip,
    server_hostname,
    server_qr_mode
  } = req.body;

  // Validate mode
  if (server_ip_mode && !['auto', 'manual'].includes(server_ip_mode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid server_ip_mode. Must be "auto" or "manual"'
    });
  }

  // If manual mode, require IP address
  if (server_ip_mode === 'manual' && !server_ip_address) {
    return res.status(400).json({
      success: false,
      error: 'server_ip_address required for manual mode'
    });
  }

  // Validate IP address format if manual
  if (server_ip_mode === 'manual') {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(server_ip_address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IP address format'
      });
    }
  }

  // Validate QR mode
  if (server_qr_mode && !['lan', 'public'].includes(server_qr_mode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid server_qr_mode. Must be "lan" or "public"'
    });
  }

  try {
    const updateStmt = db.prepare(
      `INSERT OR REPLACE INTO config (key, value, description)
       VALUES (?, ?, ?)`
    );

    // Update mode
    if (server_ip_mode) {
      updateStmt.run(
        'server_ip_mode',
        server_ip_mode,
        'Server IP detection mode: auto or manual'
      );
    }

    // Update LAN address if manual mode
    if (server_ip_mode === 'manual' && server_ip_address) {
      updateStmt.run(
        'server_ip_address',
        server_ip_address,
        'Manually configured server LAN IP address'
      );
    }

    // Update public IP (optional)
    if (server_public_ip !== undefined) {
      updateStmt.run(
        'server_public_ip',
        server_public_ip,
        'Public IP address for remote access'
      );
    }

    // Update hostname (optional)
    if (server_hostname !== undefined) {
      updateStmt.run(
        'server_hostname',
        server_hostname,
        'Domain name or hostname for public access'
      );
    }

    // Update QR mode
    if (server_qr_mode) {
      updateStmt.run(
        'server_qr_mode',
        server_qr_mode,
        'QR code IP mode: lan or public'
      );
    }

    res.json({
      success: true,
      message: 'Network configuration updated'
    });
  } catch (error) {
    console.error('Error updating network config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

/**
 * GET /api/network/public-ip-history
 * Get public IP change history
 */
router.get('/public-ip-history', authenticate, asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const history = PublicIpHistory.getLatest(limit);

  res.json({
    success: true,
    data: history
  });
}));

/**
 * POST /api/network/public-ip-apply
 * Apply a detected IP change
 */
router.post('/public-ip-apply', authenticate, requireAdmin, logActivity('public_ip_apply', 'config'), asyncHandler(async (req, res) => {
  const { history_id, ip_address } = req.body;

  if (!history_id && !ip_address) {
    return res.status(400).json({
      success: false,
      error: 'Either history_id or ip_address is required'
    });
  }

  let ipToApply = ip_address;

  if (history_id) {
    const history = PublicIpHistory.getLatest(100);
    const record = history.find(h => h.id === history_id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'History record not found'
      });
    }

    ipToApply = record.new_ip;

    // Mark as applied
    PublicIpHistory.markApplied(history_id, false);
  }

  // Update server_public_ip config
  const updateStmt = db.prepare(`
    INSERT OR REPLACE INTO config (key, value, description)
    VALUES (?, ?, ?)
  `);

  updateStmt.run('server_public_ip', ipToApply, 'Public IP address for remote access');

  res.json({
    success: true,
    message: 'Public IP updated successfully',
    data: {
      public_ip: ipToApply
    }
  });
}));

/**
 * GET /api/network/monitor-status
 * Get IP monitor status
 */
router.get('/monitor-status', authenticate, asyncHandler(async (req, res) => {
  const status = publicIpMonitor.getStatus();
  const config = db.prepare('SELECT value FROM config WHERE key = ?').get('public_ip_monitor_enabled');
  const intervalConfig = db.prepare('SELECT value FROM config WHERE key = ?').get('public_ip_monitor_interval');

  res.json({
    success: true,
    data: {
      ...status,
      enabled: config && config.value === 'true',
      interval_seconds: intervalConfig ? parseInt(intervalConfig.value) : 300
    }
  });
}));

/**
 * PUT /api/network/monitor-config
 * Update IP monitor configuration
 */
router.put('/monitor-config', authenticate, requireAdmin, logActivity('ip_monitor_config', 'config'), asyncHandler(async (req, res) => {
  const { enabled, interval_seconds } = req.body;

  const updateStmt = db.prepare(`
    INSERT OR REPLACE INTO config (key, value, description)
    VALUES (?, ?, ?)
  `);

  if (enabled !== undefined) {
    updateStmt.run('public_ip_monitor_enabled', enabled ? 'true' : 'false', 'Enable automatic public IP monitoring');
  }

  if (interval_seconds !== undefined) {
    if (interval_seconds < 60 || interval_seconds > 86400) {
      return res.status(400).json({
        success: false,
        error: 'Interval must be between 60 and 86400 seconds'
      });
    }
    updateStmt.run('public_ip_monitor_interval', interval_seconds.toString(), 'Public IP check interval in seconds');
  }

  // Restart monitor with new config
  publicIpMonitor.restart();

  res.json({
    success: true,
    message: 'IP monitor configuration updated'
  });
}));

/**
 * POST /api/network/monitor-check
 * Trigger manual IP check
 */
router.post('/monitor-check', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  try {
    const result = await publicIpMonitor.manualCheck();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

module.exports = router;
