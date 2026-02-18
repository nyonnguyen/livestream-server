const UserSession = require('../models/UserSession');
const ActivityLog = require('../models/ActivityLog');
const StreamHistory = require('../models/StreamHistory');
const PublicIpHistory = require('../models/PublicIpHistory');
const Stream = require('../models/Stream');
const { db } = require('../config/database');

/**
 * Cleanup expired user sessions
 */
function cleanupExpiredSessions() {
  try {
    const deletedCount = UserSession.cleanupExpired();
    if (deletedCount > 0) {
      console.log(`[Cleanup] Removed ${deletedCount} expired user sessions`);
    }
    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error cleaning up expired sessions:', error.message);
    return 0;
  }
}

/**
 * Cleanup old activity logs based on retention policy
 */
function cleanupActivityLogs() {
  try {
    const config = db.prepare('SELECT value FROM config WHERE key = ?').get('audit_retention_days');
    const retentionDays = config ? parseInt(config.value) : 90;

    const deletedCount = ActivityLog.cleanup(retentionDays);
    if (deletedCount > 0) {
      console.log(`[Cleanup] Removed ${deletedCount} old activity log entries (retention: ${retentionDays} days)`);
    }
    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error cleaning up activity logs:', error.message);
    return 0;
  }
}

/**
 * Cleanup old stream history based on retention policy
 */
function cleanupStreamHistory() {
  try {
    const retentionDays = 90;
    const deletedCount = StreamHistory.cleanup(retentionDays);
    if (deletedCount > 0) {
      console.log(`[Cleanup] Removed ${deletedCount} old stream history entries (retention: ${retentionDays} days)`);
    }
    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error cleaning up stream history:', error.message);
    return 0;
  }
}

/**
 * Cleanup old public IP history
 */
function cleanupPublicIpHistory() {
  try {
    const retentionDays = 90;
    const deletedCount = PublicIpHistory.cleanup(retentionDays);
    if (deletedCount > 0) {
      console.log(`[Cleanup] Removed ${deletedCount} old public IP history entries (retention: ${retentionDays} days)`);
    }
    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error cleaning up public IP history:', error.message);
    return 0;
  }
}

/**
 * Permanently delete old soft-deleted streams
 */
function cleanupDeletedStreams() {
  try {
    const config = db.prepare('SELECT value FROM config WHERE key = ?').get('stream_retention_days');
    const retentionDays = config ? parseInt(config.value) : 30;

    // Find streams deleted more than retention period ago
    const stmt = db.prepare(`
      SELECT id, name FROM streams
      WHERE deleted_at IS NOT NULL
        AND deleted_at < datetime('now', '-' || ? || ' days')
    `);

    const oldDeletedStreams = stmt.all(retentionDays);

    let deletedCount = 0;
    oldDeletedStreams.forEach(stream => {
      try {
        Stream.permanentDelete(stream.id);
        deletedCount++;
        console.log(`[Cleanup] Permanently deleted stream: ${stream.name} (id: ${stream.id})`);
      } catch (error) {
        console.error(`[Cleanup] Error permanently deleting stream ${stream.id}:`, error.message);
      }
    });

    if (deletedCount > 0) {
      console.log(`[Cleanup] Permanently deleted ${deletedCount} old streams (retention: ${retentionDays} days)`);
    }

    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error cleaning up deleted streams:', error.message);
    return 0;
  }
}

/**
 * Run all cleanup tasks
 */
function runAllCleanupTasks() {
  console.log('[Cleanup] Starting cleanup tasks...');

  const results = {
    expired_sessions: cleanupExpiredSessions(),
    activity_logs: cleanupActivityLogs(),
    stream_history: cleanupStreamHistory(),
    public_ip_history: cleanupPublicIpHistory(),
    deleted_streams: cleanupDeletedStreams()
  };

  console.log('[Cleanup] Cleanup tasks completed:', results);
  return results;
}

/**
 * Start periodic cleanup (runs every 24 hours)
 */
function startPeriodicCleanup(intervalHours = 24) {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`[Cleanup] Starting periodic cleanup (every ${intervalHours} hours)`);

  // Run immediately on startup
  runAllCleanupTasks();

  // Then run periodically
  setInterval(() => {
    runAllCleanupTasks();
  }, intervalMs);
}

module.exports = {
  cleanupExpiredSessions,
  cleanupActivityLogs,
  cleanupStreamHistory,
  cleanupPublicIpHistory,
  cleanupDeletedStreams,
  runAllCleanupTasks,
  startPeriodicCleanup
};
