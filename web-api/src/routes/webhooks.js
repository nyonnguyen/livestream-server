const express = require('express');
const router = express.Router();
const Stream = require('../models/Stream');
const Session = require('../models/Session');
const { db } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/hooks/on_publish
 * SRS webhook when client starts publishing
 */
router.post('/on_publish', asyncHandler(async (req, res) => {
  const {
    action,
    client_id,
    ip,
    vhost,
    app,
    stream,
    param
  } = req.body;

  console.log('SRS on_publish webhook:', {
    action,
    client_id,
    stream,
    ip
  });

  // Extract stream key from stream name
  const streamKey = stream;

  // Validate stream key
  const validation = Stream.validateStreamKey(streamKey);

  if (!validation.valid) {
    console.log(`Stream key validation failed: ${validation.reason}`);
    return res.status(403).json({
      code: 1,
      error: validation.reason
    });
  }

  // Check max concurrent streams
  const configStmt = db.prepare('SELECT value FROM config WHERE key = ?');
  const maxStreamsConfig = configStmt.get('max_concurrent_streams');
  const maxStreams = maxStreamsConfig ? parseInt(maxStreamsConfig.value) : 3;

  const activeSessionCount = Session.getActiveCount();

  if (activeSessionCount >= maxStreams) {
    console.log(`Max concurrent streams (${maxStreams}) reached`);
    return res.status(403).json({
      code: 1,
      error: `Maximum concurrent streams (${maxStreams}) reached`
    });
  }

  // Create session
  try {
    Session.create({
      stream_id: validation.stream.id,
      client_id,
      ip_address: ip,
      protocol: 'rtmp'
    });

    console.log(`Session created for stream: ${streamKey}`);
  } catch (error) {
    console.error('Error creating session:', error.message);
  }

  // Allow publishing
  res.json({
    code: 0
  });
}));

/**
 * POST /api/hooks/on_unpublish
 * SRS webhook when client stops publishing
 */
router.post('/on_unpublish', asyncHandler(async (req, res) => {
  const {
    action,
    client_id,
    ip,
    vhost,
    app,
    stream
  } = req.body;

  console.log('SRS on_unpublish webhook:', {
    action,
    client_id,
    stream,
    ip
  });

  // End session
  try {
    Session.endByClientId(client_id);
    console.log(`Session ended for client: ${client_id}`);
  } catch (error) {
    console.error('Error ending session:', error.message);
  }

  res.json({
    code: 0
  });
}));

/**
 * POST /api/hooks/on_play
 * SRS webhook when client starts playing
 */
router.post('/on_play', asyncHandler(async (req, res) => {
  const {
    action,
    client_id,
    ip,
    vhost,
    app,
    stream
  } = req.body;

  console.log('SRS on_play webhook:', {
    action,
    client_id,
    stream,
    ip
  });

  // For now, allow all playback
  // You can add authentication here if needed

  res.json({
    code: 0
  });
}));

/**
 * POST /api/hooks/on_stop
 * SRS webhook when client stops playing
 */
router.post('/on_stop', asyncHandler(async (req, res) => {
  const {
    action,
    client_id,
    ip,
    vhost,
    app,
    stream
  } = req.body;

  console.log('SRS on_stop webhook:', {
    action,
    client_id,
    stream,
    ip
  });

  // Log the event
  // No action needed for playback stop

  res.json({
    code: 0
  });
}));

module.exports = router;
