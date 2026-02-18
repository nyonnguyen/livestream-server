const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const UserSession = require('../models/UserSession');
const SRSApi = require('../services/srsApi');
const { authenticate } = require('../middleware/auth');
const { validateId } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/sessions
 * Get all active sessions (shows all SRS streams, even without database records)
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { db } = require('../config/database');

  // Get sessions from database
  const dbSessions = Session.findActive();

  // Get live streams from SRS
  const srsStreams = await SRSApi.getActiveStreamsWithDetails();

  // Create a map of stream_key -> stream info for quick lookup
  const streamsMap = {};
  const streamsQuery = db.prepare('SELECT id, name, stream_key, protocol FROM streams').all();
  streamsQuery.forEach(s => {
    streamsMap[s.stream_key] = s;
  });

  // Build sessions list from SRS streams (primary source of truth)
  const sessions = srsStreams.map(srsStream => {
    // Remove .flv extension if present (SRS sometimes adds it)
    const cleanStreamName = srsStream.name.replace(/\.flv$/, '');

    // Find matching database session
    const dbSession = dbSessions.find(s => s.stream_key === cleanStreamName);

    // Find stream info
    const streamInfo = streamsMap[cleanStreamName];

    if (!streamInfo) {
      // Stream exists in SRS but not in our database - skip it
      return null;
    }

    // Skip if database session has ended (even if SRS still reports it)
    // This handles race condition where webhook has run but SRS hasn't updated yet
    if (!dbSession) {
      // No database session found - skip this stream
      console.log(`Skipping SRS stream ${cleanStreamName} - no active database session`);
      return null;
    }

    return {
      id: dbSession.id,
      stream_id: streamInfo.id,
      stream_name: streamInfo.name,
      stream_key: cleanStreamName,
      protocol: streamInfo.protocol,
      ip_address: dbSession.ip_address || 'N/A',
      client_id: srsStream.id,
      started_at: dbSession.started_at,
      live_data: {
        clients: srsStream.clients,
        kbps: srsStream.kbps,
        video: srsStream.video,
        audio: srsStream.audio,
        send_bytes: srsStream.send_bytes,
        recv_bytes: srsStream.recv_bytes
      }
    };
  }).filter(s => s !== null);

  res.json({
    success: true,
    data: sessions
  });
}));

/**
 * GET /api/sessions/recent
 * Get recent sessions (active and ended)
 */
router.get('/recent', authenticate, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const sessions = Session.findRecent(limit);

  res.json({
    success: true,
    data: sessions
  });
}));

/**
 * GET /api/sessions/stats
 * Get session statistics
 */
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const { stream_id, since } = req.query;

  const filters = {};
  if (stream_id) filters.stream_id = parseInt(stream_id);
  if (since) filters.since = since;

  const stats = Session.getStatistics(filters);

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get('/:id', authenticate, validateId, asyncHandler(async (req, res) => {
  const sessions = Session.findActive();
  const session = sessions.find(s => s.id === parseInt(req.params.id));

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  // Get live data from SRS
  const srsStream = await SRSApi.findStreamByKey(session.stream_key);

  res.json({
    success: true,
    data: {
      ...session,
      live_data: srsStream
    }
  });
}));

/**
 * DELETE /api/sessions/:id
 * Disconnect session
 */
router.delete('/:id', authenticate, validateId, asyncHandler(async (req, res) => {
  const sessions = Session.findActive();
  const session = sessions.find(s => s.id === parseInt(req.params.id));

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found or already ended'
    });
  }

  // Kick client from SRS
  if (session.client_id) {
    try {
      await SRSApi.kickClient(session.client_id);
    } catch (error) {
      console.error('Error kicking client from SRS:', error.message);
    }
  }

  // End session in database
  Session.end(req.params.id);

  res.json({
    success: true,
    message: 'Session disconnected successfully'
  });
}));

/**
 * GET /api/sessions/user-sessions
 * Get current user's login sessions
 */
router.get('/user-sessions', authenticate, asyncHandler(async (req, res) => {
  const sessions = UserSession.findByUserId(req.user.id, true);

  // Get current session token hash
  const token = req.headers.authorization.substring(7);
  const crypto = require('crypto');
  const currentTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Format sessions for response
  const formattedSessions = sessions.map(session => ({
    id: session.id,
    device_info: session.device_info,
    ip_address: session.ip_address,
    last_activity: session.last_activity,
    created_at: session.created_at,
    expires_at: session.expires_at,
    is_current: session.token_hash === currentTokenHash
  }));

  res.json({
    success: true,
    data: formattedSessions
  });
}));

/**
 * DELETE /api/sessions/user-sessions/:id
 * Revoke a specific user session
 */
router.delete('/user-sessions/:id', authenticate, validateId, asyncHandler(async (req, res) => {
  const sessionId = parseInt(req.params.id);

  // Verify session belongs to current user
  const sessions = UserSession.findByUserId(req.user.id);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found or does not belong to you'
    });
  }

  // Revoke the session
  UserSession.revokeSessionById(sessionId, req.user.id);

  res.json({
    success: true,
    message: 'Session revoked successfully'
  });
}));

/**
 * DELETE /api/sessions/user-sessions
 * Revoke all other user sessions (except current)
 */
router.delete('/user-sessions', authenticate, asyncHandler(async (req, res) => {
  const token = req.headers.authorization.substring(7);
  const crypto = require('crypto');
  const currentTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Revoke all sessions except current
  UserSession.revokeAllUserSessions(req.user.id, currentTokenHash);

  res.json({
    success: true,
    message: 'All other sessions revoked successfully'
  });
}));

module.exports = router;
