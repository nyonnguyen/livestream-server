const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const os = require('os');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const execAsync = promisify(exec);

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
    // Try multiple possible shell locations for compatibility with different Linux distributions
    const command = `nsenter --target 1 --mount --uts --ipc --net --pid -- sh -c '
      if [ -x /bin/bash ]; then
        /bin/bash ${hostUpdateScriptPath}
      elif [ -x /usr/bin/bash ]; then
        /usr/bin/bash ${hostUpdateScriptPath}
      elif [ -x /bin/sh ]; then
        /bin/sh ${hostUpdateScriptPath}
      else
        echo "ERROR: No shell found on host system" >&2
        exit 1
      fi
    ' > ${updateLogPath} 2>&1 &`;

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

/**
 * GET /api/system/health
 * Get system health metrics (CPU, RAM, Disk, Temp, Network)
 */
router.get('/health', authenticate, asyncHandler(async (req, res) => {
  const health = await getSystemHealth();
  res.json({
    success: true,
    data: health
  });
}));

/**
 * GET /api/system/stream-limit
 * Calculate recommended max streams based on hardware
 */
router.get('/stream-limit', authenticate, asyncHandler(async (req, res) => {
  const health = await getSystemHealth();

  const cpuCores = health.cpu.cores;
  const ramGB = parseFloat(health.memory.totalGB);

  // Formula: Each stream needs ~0.5 CPU core and ~400MB RAM
  const cpuLimit = Math.floor(cpuCores / 0.5);
  const ramLimit = Math.floor((ramGB * 1024) / 400);
  const recommendedLimit = Math.min(cpuLimit, ramLimit);
  const maxStreams = Math.max(1, Math.min(20, recommendedLimit));

  res.json({
    success: true,
    data: {
      maxStreams,
      cpuLimit,
      ramLimit,
      reasoning: {
        cpuCores,
        ramGB: ramGB.toFixed(2),
        formula: 'Min(CPU cores / 0.5, RAM GB * 1024 / 400)'
      }
    }
  });
}));

// Helper functions
async function getSystemHealth() {
  return {
    cpu: await getCPUInfo(),
    memory: getMemoryInfo(),
    disk: await getDiskInfo(),
    temperature: await getTemperature(),
    network: await getNetworkStats(),
    uptime: getUptimeInfo(),
    load: getLoadAverage()
  };
}

function getCPUInfo() {
  return new Promise((resolve) => {
    try {
      const cpus = os.cpus();
      const startMeasure = cpuAverage();

      setTimeout(() => {
        const endMeasure = cpuAverage();
        const idleDiff = endMeasure.idle - startMeasure.idle;
        const totalDiff = endMeasure.total - startMeasure.total;
        const usage = 100 - ~~(100 * idleDiff / totalDiff);

        resolve({
          model: cpus[0].model,
          cores: cpus.length,
          usage,
          speed: cpus[0].speed
        });
      }, 100);
    } catch (error) {
      resolve({ model: 'Unknown', cores: os.cpus().length, usage: 0, speed: 0 });
    }
  });
}

function cpuAverage() {
  const cpus = os.cpus();
  let idleMs = 0, totalMs = 0;
  cpus.forEach(cpu => {
    for (let type in cpu.times) totalMs += cpu.times[type];
    idleMs += cpu.times.idle;
  });
  return { idle: idleMs / cpus.length, total: totalMs / cpus.length };
}

function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    total, free, used,
    usage: (used / total) * 100,
    totalGB: (total / 1024**3).toFixed(2),
    usedGB: (used / 1024**3).toFixed(2),
    freeGB: (free / 1024**3).toFixed(2)
  };
}

async function getDiskInfo() {
  try {
    const { stdout } = await execAsync('df -h / | tail -1');
    const parts = stdout.trim().split(/\s+/);
    if (parts.length >= 5) {
      return {
        total: parts[1],
        used: parts[2],
        available: parts[3],
        usage: parseInt(parts[4]),
        mountpoint: parts[5] || '/'
      };
    }
  } catch (error) {}
  return { total: 'N/A', used: 'N/A', available: 'N/A', usage: 0, mountpoint: '/' };
}

async function getTemperature() {
  try {
    // Raspberry Pi
    try {
      const temp = await fsp.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8');
      const celsius = parseInt(temp) / 1000;
      return { celsius: celsius.toFixed(1), fahrenheit: (celsius * 9/5 + 32).toFixed(1) };
    } catch (e) {}

    // hwmon
    try {
      const dirs = await fsp.readdir('/sys/class/hwmon');
      for (const dir of dirs) {
        try {
          const temp = await fsp.readFile(`/sys/class/hwmon/${dir}/temp1_input`, 'utf8');
          const celsius = parseInt(temp) / 1000;
          return { celsius: celsius.toFixed(1), fahrenheit: (celsius * 9/5 + 32).toFixed(1) };
        } catch (e) {}
      }
    } catch (e) {}
  } catch (error) {}
  return { celsius: 'N/A', fahrenheit: 'N/A' };
}

async function getNetworkStats() {
  try {
    const interfaces = os.networkInterfaces();
    const stats = [];
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (name === 'lo' || name.startsWith('docker') || name.startsWith('veth')) continue;
      const ipv4 = addrs.find(addr => addr.family === 'IPv4');
      if (ipv4) {
        try {
          const { stdout } = await execAsync(`cat /sys/class/net/${name}/statistics/rx_bytes /sys/class/net/${name}/statistics/tx_bytes 2>/dev/null`);
          const [rxBytes, txBytes] = stdout.trim().split('\n').map(Number);
          stats.push({
            interface: name,
            address: ipv4.address,
            rxBytes: rxBytes || 0,
            txBytes: txBytes || 0,
            rxGB: ((rxBytes || 0) / 1024**3).toFixed(2),
            txGB: ((txBytes || 0) / 1024**3).toFixed(2)
          });
        } catch (e) {
          stats.push({ interface: name, address: ipv4.address, rxBytes: 0, txBytes: 0, rxGB: '0', txGB: '0' });
        }
      }
    }
    return stats;
  } catch (error) {
    return [];
  }
}

function getUptimeInfo() {
  const seconds = os.uptime();
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return { seconds, formatted: `${days}d ${hours}h ${minutes}m`, days, hours, minutes };
}

function getLoadAverage() {
  const loads = os.loadavg();
  return { '1min': loads[0].toFixed(2), '5min': loads[1].toFixed(2), '15min': loads[2].toFixed(2) };
}

module.exports = router;
