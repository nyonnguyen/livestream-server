const https = require('https');
const http = require('http');
const PublicIpHistory = require('../models/PublicIpHistory');
const { db } = require('../config/database');
const EventEmitter = require('events');

class PublicIpMonitor extends EventEmitter {
  constructor() {
    super();
    this.currentIp = null;
    this.intervalId = null;
    this.isRunning = false;
    this.lastCheckTime = null;
  }

  /**
   * Get public IP from external service
   */
  async fetchPublicIp() {
    const services = [
      { url: 'https://api.ipify.org', https: true },
      { url: 'http://checkip.amazonaws.com', https: true },
      { url: 'https://icanhazip.com', https: true }
    ];

    for (const service of services) {
      try {
        const ip = await this._fetch(service.url, service.https);
        return ip.trim();
      } catch (error) {
        console.error(`[PublicIpMonitor] Failed to fetch IP from ${service.url}:`, error.message);
        // Try next service
      }
    }

    throw new Error('Failed to fetch public IP from all services');
  }

  /**
   * Simple HTTP(S) fetch helper
   */
  _fetch(url, useHttps = true) {
    return new Promise((resolve, reject) => {
      const client = useHttps ? https : http;

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      client.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          clearTimeout(timeout);
          resolve(data);
        });
      }).on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Check for IP changes
   */
  async checkIpChange() {
    try {
      this.lastCheckTime = new Date();

      const newIp = await this.fetchPublicIp();

      // First time check
      if (!this.currentIp) {
        this.currentIp = newIp;
        console.log(`[PublicIpMonitor] Initial IP detected: ${newIp}`);
        return { changed: false, ip: newIp };
      }

      // Check if IP changed
      if (newIp !== this.currentIp) {
        const oldIp = this.currentIp;
        this.currentIp = newIp;

        console.log(`[PublicIpMonitor] IP change detected: ${oldIp} → ${newIp}`);

        // Record change in database
        const historyId = PublicIpHistory.recordDetection(oldIp, newIp, 'auto');

        // Emit event for UI notification
        this.emit('ipChanged', {
          id: historyId,
          oldIp,
          newIp,
          detectedAt: new Date()
        });

        return { changed: true, oldIp, newIp, historyId };
      }

      return { changed: false, ip: newIp };
    } catch (error) {
      console.error('[PublicIpMonitor] Error checking IP:', error.message);
      throw error;
    }
  }

  /**
   * Start monitoring
   */
  start() {
    const config = db.prepare('SELECT value FROM config WHERE key = ?').get('public_ip_monitor_enabled');
    const enabled = config && config.value === 'true';

    if (!enabled) {
      console.log('[PublicIpMonitor] Monitoring is disabled in config');
      return;
    }

    if (this.isRunning) {
      console.log('[PublicIpMonitor] Already running');
      return;
    }

    const intervalConfig = db.prepare('SELECT value FROM config WHERE key = ?').get('public_ip_monitor_interval');
    const intervalSeconds = intervalConfig ? parseInt(intervalConfig.value) : 300;
    const intervalMs = intervalSeconds * 1000;

    console.log(`[PublicIpMonitor] Starting monitoring (check every ${intervalSeconds} seconds)`);

    // Initial check
    this.checkIpChange().catch(err => {
      console.error('[PublicIpMonitor] Initial check failed:', err.message);
    });

    // Periodic checks
    this.intervalId = setInterval(() => {
      this.checkIpChange().catch(err => {
        console.error('[PublicIpMonitor] Periodic check failed:', err.message);
      });
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      console.log('[PublicIpMonitor] Not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('[PublicIpMonitor] Stopped monitoring');
  }

  /**
   * Restart monitoring (reload config)
   */
  restart() {
    this.stop();
    this.start();
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      running: this.isRunning,
      currentIp: this.currentIp,
      lastCheckTime: this.lastCheckTime
    };
  }

  /**
   * Manual IP check
   */
  async manualCheck() {
    console.log('[PublicIpMonitor] Manual IP check requested');
    return await this.checkIpChange();
  }
}

// Create singleton instance
const publicIpMonitor = new PublicIpMonitor();

module.exports = publicIpMonitor;
