const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
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

module.exports = router;
