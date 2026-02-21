const os = require('os');
const { execSync } = require('child_process');

/**
 * Get host network interfaces (from the host, not Docker container)
 * Uses nsenter to access host's network namespace
 */
function getHostNetworkInterfaces() {
  try {
    // Use nsenter to enter the host's network namespace
    // /host_proc is mounted from host's /proc
    const command = 'nsenter --net=/host_proc/1/ns/net ip addr show';
    const output = execSync(command, { encoding: 'utf8', timeout: 5000 });

    const interfaces = [];
    const lines = output.split('\n');
    let currentInterface = null;

    for (const line of lines) {
      // Match interface name: "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>"
      const ifaceMatch = line.match(/^\d+:\s+(\S+):/);
      if (ifaceMatch) {
        currentInterface = ifaceMatch[1].replace(/@.*$/, ''); // Remove @if122 suffix
        continue;
      }

      // Match IPv4 address: "inet 192.168.1.100/24"
      const ipMatch = line.match(/^\s+inet\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
      if (ipMatch && currentInterface) {
        const ip = ipMatch[1];
        const cidr = parseInt(ipMatch[2]);

        // Skip loopback
        if (ip.startsWith('127.')) {
          continue;
        }

        // Skip Docker bridge interfaces (docker0, br-, veth)
        if (currentInterface.startsWith('docker') ||
            currentInterface.startsWith('br-') ||
            currentInterface.startsWith('veth')) {
          continue;
        }

        // Calculate netmask from CIDR
        const netmask = cidrToNetmask(cidr);

        interfaces.push({
          name: currentInterface,
          address: ip,
          netmask,
          source: 'host'
        });
      }
    }

    return interfaces;
  } catch (error) {
    console.warn('Could not read host network interfaces via nsenter:', error.message);
    console.warn('Make sure /proc is mounted and NET_ADMIN capability is granted');
    return null;
  }
}

/**
 * Convert CIDR notation to netmask (e.g., 24 -> 255.255.255.0)
 */
function cidrToNetmask(cidr) {
  const mask = [];
  for (let i = 0; i < 4; i++) {
    const n = Math.min(cidr, 8);
    mask.push(256 - Math.pow(2, 8 - n));
    cidr -= n;
  }
  return mask.join('.');
}

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
 * Prioritizes host interfaces over container interfaces
 * Returns { interfaces: [], source: 'host'|'container', error: null|string }
 */
function getNetworkInterfaces() {
  // Try to get host interfaces first
  const hostInterfaces = getHostNetworkInterfaces();

  if (hostInterfaces && hostInterfaces.length > 0) {
    // Format host interfaces to match the expected structure
    const results = hostInterfaces.map(iface => {
      const category = categorizeInterface(iface.address, iface.name);
      return {
        name: iface.name,
        address: iface.address,
        type: category.type,
        priority: category.priority,
        label: category.label,
        netmask: iface.netmask,
        mac: null,  // MAC not available from ip command output
        source: 'host'
      };
    });

    // Sort by priority
    results.sort((a, b) => a.priority - b.priority);
    return results;
  }

  // Fallback to container interfaces if host detection fails
  console.error('WARNING: Using container network interfaces (host detection failed via nsenter)');
  console.error('This may show Docker internal IPs instead of actual host IPs');
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
          mac: addr.mac,
          source: 'container'
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
    // Priority 1: Check if SERVER_IP environment variable is set (from install script)
    if (process.env.SERVER_IP) {
      const envIP = process.env.SERVER_IP.trim();
      // Validate it's a proper IP address
      if (envIP && envIP !== 'localhost' && envIP !== '127.0.0.1' && /^[\d.]+$/.test(envIP)) {
        return envIP;
      }
    }

    // Priority 2: Check database configuration
    const modeRow = db.prepare('SELECT value FROM config WHERE key = ?').get('server_ip_mode');

    if (!modeRow || modeRow.value === 'auto') {
      // Auto-detect mode
      const detected = getBestIPAddress();

      // Filter out Docker IPs (172.17-31.x.x) in auto-detect mode
      if (detected && detected.startsWith('172.')) {
        const octets = detected.split('.');
        if (octets[1] >= 17 && octets[1] <= 31) {
          console.warn(`Auto-detected Docker IP ${detected}. Consider setting SERVER_IP environment variable.`);
          return null; // Return null to force fallback to hostname
        }
      }

      return detected;
    } else {
      // Manual mode - get the specific IP or interface
      const ipRow = db.prepare('SELECT value FROM config WHERE key = ?').get('server_ip_address');
      return ipRow ? ipRow.value : getBestIPAddress();
    }
  } catch (error) {
    console.error('Error getting server IP from config:', error);

    // Fallback to environment variable if database fails
    if (process.env.SERVER_IP) {
      return process.env.SERVER_IP.trim();
    }

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
