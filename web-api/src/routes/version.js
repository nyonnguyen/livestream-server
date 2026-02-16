const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// In Docker container, VERSION is mounted at /app/VERSION
// In local development, it's at project root
const VERSION_FILE = process.env.VERSION_FILE || (
  fs.existsSync('/app/VERSION') ? '/app/VERSION' : path.join(__dirname, '../../../VERSION')
);
const GITHUB_REPO = 'nyonnguyen/livestream-server';

/**
 * GET /api/version
 * Get current application version
 * This is a PUBLIC endpoint - no auth required
 */
router.get('/', (req, res) => {
  try {
    const version = fs.readFileSync(VERSION_FILE, 'utf8').trim();

    res.json({
      success: true,
      data: {
        version,
        releaseDate: getVersionReleaseDate()
      }
    });
  } catch (error) {
    console.error('Error reading version file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read version'
    });
  }
});

/**
 * GET /api/version/check
 * Check for available updates from GitHub releases
 * This is a PUBLIC endpoint - no auth required
 */
router.get('/check', async (req, res) => {
  try {
    const currentVersion = fs.readFileSync(VERSION_FILE, 'utf8').trim();

    // Fetch latest release from GitHub
    const response = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        timeout: 5000,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'livestream-server'
        }
      }
    );

    const latestRelease = response.data;
    const latestVersion = latestRelease.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    res.json({
      success: true,
      data: {
        current: currentVersion,
        latest: latestVersion,
        hasUpdate,
        releaseNotes: latestRelease.body || '',
        releaseUrl: latestRelease.html_url,
        publishedAt: latestRelease.published_at,
        downloadUrl: latestRelease.tarball_url
      }
    });
  } catch (error) {
    console.error('Error checking for updates:', error.message);

    // Return current version even if check fails
    const currentVersion = fs.readFileSync(VERSION_FILE, 'utf8').trim();

    res.json({
      success: true,
      data: {
        current: currentVersion,
        latest: currentVersion,
        hasUpdate: false,
        error: 'Unable to check for updates',
        offline: true
      }
    });
  }
});

/**
 * Helper: Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Helper: Get version release date from git
 */
function getVersionReleaseDate() {
  try {
    const { execSync } = require('child_process');
    const date = execSync('git log -1 --format=%ci VERSION', { encoding: 'utf8' }).trim();
    return date || new Date().toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

module.exports = router;
