const os = require('os');

/**
 * Check if IP is a valid LAN address (not loopback)
 */
function isValidLANAddress(ip) {
  // Split IP into octets
  const octets = ip.split('.').map(Number);

  if (octets.length !== 4 || octets.some(isNaN)) {
    return false;
  }

  // Reject loopback (127.x.x.x)
  if (octets[0] === 127) {
    return false;
  }

  // Accept private LAN addresses:
  // 10.x.x.x
  if (octets[0] === 10) {
    return true;
  }

  // 192.168.x.x
  if (octets[0] === 192 && octets[1] === 168) {
    return true;
  }

  // 172.16.x.x - 172.31.x.x (including Docker networks)
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return true;
  }

  // Reject everything else (public IPs, link-local, etc.)
  return false;
}

/**
 * Categorize interface type for UI display
 */
function categorizeInterface(ip, name) {
  const octets = ip.split('.').map(Number);
  const lowerName = name.toLowerCase();

  // Docker networks
  if (octets[0] === 172 && octets[1] >= 17 && octets[1] <= 31) {
    return { type: 'docker', priority: 4, label: 'Docker Internal' };
  }

  // Ethernet
  if (['eth', 'en0', 'ens', 'enp'].some(pattern => lowerName.includes(pattern))) {
    return { type: 'ethernet', priority: 1, label: 'Ethernet' };
  }

  // WiFi
  if (['wlan', 'en1', 'wlp', 'wifi'].some(pattern => lowerName.includes(pattern))) {
    return { type: 'wifi', priority: 2, label: 'WiFi' };
  }

  // Other
  return { type: 'other', priority: 3, label: 'Other' };
}

/**
 * Get all network interfaces with their IP addresses
 * Shows ALL interfaces including Docker, so user can see everything
 */
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = [];

  Object.keys(interfaces).forEach((name) => {
    const addrs = interfaces[name];

    addrs.forEach((addr) => {
      // Only IPv4, not internal (loopback), and valid LAN address
      if (addr.family === 'IPv4' && !addr.internal && isValidLANAddress(addr.address)) {
        const category = categorizeInterface(addr.address, name);

        results.push({
          name,
          address: addr.address,
          type: category.type,
          priority: category.priority,
          label: category.label,
          netmask: addr.netmask,
          mac: addr.mac
        });
      }
    });
  });

  // Sort by priority (ethernet first, then wifi, then others, then docker last)
  results.sort((a, b) => a.priority - b.priority);

  return results;
}

/**
 * Get the best IP address based on priority
 * Returns the first non-Docker interface, then any available
 * Falls back to null if no valid LAN address found
 */
function getBestIPAddress() {
  const interfaces = getNetworkInterfaces();

  if (interfaces.length === 0) {
    console.warn('No valid LAN IP addresses found. Please configure network settings.');
    return null; // Return null instead of localhost
  }

  // Filter out Docker interfaces for auto-detection
  const nonDockerInterfaces = interfaces.filter(iface => iface.type !== 'docker');

  if (nonDockerInterfaces.length > 0) {
    return nonDockerInterfaces[0].address;
  }

  // If only Docker interfaces exist, return the first one
  return interfaces[0].address;
}

/**
 * Extract client IP from Express request
 * Useful for suggesting the user's IP when running in Docker
 */
function getClientIPFromRequest(req) {
  // Try various headers in order of preference
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    const clientIp = ips[0].trim();
    if (isValidLANAddress(clientIp)) {
      return clientIp;
    }
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && isValidLANAddress(realIp)) {
    return realIp;
  }

  // Get from socket
  const socketIp = req.socket.remoteAddress;
  if (socketIp) {
    // Remove IPv6 prefix if present
    const cleanIp = socketIp.replace(/^::ffff:/, '');
    if (isValidLANAddress(cleanIp)) {
      return cleanIp;
    }
  }

  return null;
}

/**
 * Get IP address by specific interface name
 */
function getIPByInterface(interfaceName) {
  const interfaces = getNetworkInterfaces();
  const found = interfaces.find(iface => iface.name === interfaceName);

  return found ? found.address : null;
}

/**
 * Get the configured server IP from config or auto-detect
 * Works with better-sqlite3 (synchronous)
 */
function getServerIP(db) {
  try {
    const modeRow = db.prepare('SELECT value FROM config WHERE key = ?').get('server_ip_mode');

    if (!modeRow || modeRow.value === 'auto') {
      // Auto-detect mode
      return getBestIPAddress();
    } else {
      // Manual mode - get the specific IP or interface
      const ipRow = db.prepare('SELECT value FROM config WHERE key = ?').get('server_ip_address');
      return ipRow ? ipRow.value : getBestIPAddress();
    }
  } catch (error) {
    console.error('Error getting server IP from config:', error);
    return getBestIPAddress();
  }
}

module.exports = {
  getNetworkInterfaces,
  getBestIPAddress,
  getIPByInterface,
  getServerIP,
  getClientIPFromRequest
};
