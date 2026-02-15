const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const axios = require('axios');
const {
  getNetworkInterfaces,
  getBestIPAddress,
  getServerIP,
  getClientIPFromRequest
} = require('../utils/networkDetection');

/**
 * GET /api/network/detect-public-ip
 * Detect public IP address from external service
 */
router.get('/detect-public-ip', async (req, res) => {
  try {
    // Try multiple services for reliability
    const services = [
      'https://api.ipify.org?format=json',
      'https://api.my-ip.io/ip.json',
      'https://ifconfig.me/ip'
    ];

    for (const service of services) {
      try {
        const response = await axios.get(service, { timeout: 5000 });
        let publicIP;

        if (typeof response.data === 'string') {
          publicIP = response.data.trim();
        } else if (response.data.ip) {
          publicIP = response.data.ip;
        }

        if (publicIP) {
          return res.json({
            success: true,
            data: { publicIP }
          });
        }
      } catch (err) {
        console.log(`Failed to fetch from ${service}:`, err.message);
        continue;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to detect public IP from all services'
    });
  } catch (error) {
    console.error('Error detecting public IP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect public IP'
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

    res.json({
      success: true,
      data: {
        interfaces,
        recommended: bestIP,
        clientIP, // Suggested IP based on where the request came from (host's IP)
        hostIP: clientIP // Use client IP as the actual host IP
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

module.exports = router;
