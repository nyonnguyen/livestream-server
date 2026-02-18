const express = require('express');
const router = express.Router();
const Stream = require('../models/Stream');
const Session = require('../models/Session');
const StreamHistory = require('../models/StreamHistory');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/rbac');
const { logActivity } = require('../middleware/auditLog');
const { validateCreateStream, validateUpdateStream, validateId } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/streams
 * Get all streams
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { is_active, protocol } = req.query;

  const filters = {};
  if (is_active !== undefined) {
    filters.is_active = is_active === 'true' ? 1 : 0;
  }
  if (protocol) {
    filters.protocol = protocol;
  }

  const streams = Stream.findAll(filters);

  res.json({
    success: true,
    data: streams
  });
}));

/**
 * GET /api/streams/:id
 * Get stream by ID
 */
router.get('/:id', authenticate, validateId, asyncHandler(async (req, res) => {
  const stream = Stream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      error: 'Stream not found'
    });
  }

  // Get active sessions for this stream
  const sessions = Session.findByStreamId(stream.id);

  res.json({
    success: true,
    data: {
      ...stream,
      active_sessions: sessions
    }
  });
}));

/**
 * POST /api/streams
 * Create new stream
 */
router.post('/', authenticate, validateCreateStream, asyncHandler(async (req, res) => {
  const { name, stream_key, description, protocol, max_bitrate } = req.body;

  // Check if name already exists
  const existingStream = Stream.findAll({ name });
  if (existingStream.length > 0 && existingStream[0].name === name) {
    return res.status(400).json({
      success: false,
      error: 'Stream with this name already exists'
    });
  }

  // Check if custom stream_key already exists
  if (stream_key) {
    const existingKey = Stream.findByStreamKey(stream_key);
    if (existingKey) {
      return res.status(400).json({
        success: false,
        error: 'Stream key already exists'
      });
    }
  }

  const streamId = Stream.create({
    name,
    stream_key,
    description,
    protocol,
    max_bitrate
  });

  const stream = Stream.findById(streamId);

  res.status(201).json({
    success: true,
    data: stream,
    message: 'Stream created successfully'
  });
}));

/**
 * PUT /api/streams/:id
 * Update stream
 */
router.put('/:id', authenticate, validateUpdateStream, asyncHandler(async (req, res) => {
  const stream = Stream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      error: 'Stream not found'
    });
  }

  const { name, stream_key, description, protocol, is_active, max_bitrate } = req.body;

  // Check if stream_key is being changed and if it already exists
  if (stream_key && stream_key !== stream.stream_key) {
    const existingKey = Stream.findByStreamKey(stream_key);
    if (existingKey) {
      return res.status(400).json({
        success: false,
        error: 'Stream key already exists'
      });
    }
  }

  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (stream_key !== undefined) updateData.stream_key = stream_key;
  if (description !== undefined) updateData.description = description;
  if (protocol !== undefined) updateData.protocol = protocol;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (max_bitrate !== undefined) updateData.max_bitrate = max_bitrate;

  console.log('[Update Stream] Stream ID:', req.params.id);
  console.log('[Update Stream] Request body:', req.body);
  console.log('[Update Stream] Update data:', updateData);

  Stream.update(req.params.id, updateData);

  const updatedStream = Stream.findById(req.params.id);

  res.json({
    success: true,
    data: updatedStream,
    message: 'Stream updated successfully'
  });
}));

/**
 * DELETE /api/streams/:id
 * Soft delete stream
 */
router.delete('/:id', authenticate, requirePermission('streams:delete'), validateId, logActivity('stream_delete', 'stream'), asyncHandler(async (req, res) => {
  const stream = Stream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      error: 'Stream not found'
    });
  }

  if (stream.deleted_at) {
    return res.status(400).json({
      success: false,
      error: 'Stream is already deleted'
    });
  }

  const { reason } = req.body;

  // End all active sessions for this stream
  Session.endByStreamId(req.params.id);

  // Soft delete stream
  Stream.softDelete(req.params.id, req.user.id, reason || 'User deleted');

  res.json({
    success: true,
    message: 'Stream deleted successfully'
  });
}));

/**
 * POST /api/streams/:id/regenerate-key
 * Regenerate stream key
 */
router.post('/:id/regenerate-key', authenticate, validateId, asyncHandler(async (req, res) => {
  const stream = Stream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      error: 'Stream not found'
    });
  }

  const newStreamKey = Stream.regenerateStreamKey(req.params.id);

  res.json({
    success: true,
    data: {
      stream_key: newStreamKey
    },
    message: 'Stream key regenerated successfully'
  });
}));

/**
 * POST /api/streams/:id/toggle
 * Toggle stream active status
 */
router.post('/:id/toggle', authenticate, validateId, asyncHandler(async (req, res) => {
  const stream = Stream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      error: 'Stream not found'
    });
  }

  Stream.toggleActive(req.params.id);

  // If disabling, end all active sessions
  if (stream.is_active) {
    Session.endByStreamId(req.params.id);
  }

  const updatedStream = Stream.findById(req.params.id);

  res.json({
    success: true,
    data: updatedStream,
    message: `Stream ${updatedStream.is_active ? 'enabled' : 'disabled'} successfully`
  });
}));

/**
 * GET /api/streams/deleted/list
 * Get deleted streams
 */
router.get('/deleted/list', authenticate, requirePermission('streams:read'), asyncHandler(async (req, res) => {
  const deletedStreams = Stream.findDeleted();

  res.json({
    success: true,
    data: deletedStreams
  });
}));

/**
 * POST /api/streams/:id/restore
 * Restore soft deleted stream
 */
router.post('/:id/restore', authenticate, requirePermission('streams:write'), validateId, logActivity('stream_restore', 'stream'), asyncHandler(async (req, res) => {
  try {
    Stream.restore(req.params.id);

    const restoredStream = Stream.findById(req.params.id);

    res.json({
      success: true,
      data: restoredStream,
      message: 'Stream restored successfully'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * GET /api/streams/:id/history
 * Get stream change history
 */
router.get('/:id/history', authenticate, requirePermission('streams:read'), validateId, asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const history = StreamHistory.getStreamHistory(req.params.id, limit);

  res.json({
    success: true,
    data: history
  });
}));

/**
 * DELETE /api/streams/:id/permanent
 * Permanently delete stream (admin only)
 */
router.delete('/:id/permanent', authenticate, requireAdmin, validateId, logActivity('stream_permanent_delete', 'stream'), asyncHandler(async (req, res) => {
  const stream = Stream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      error: 'Stream not found'
    });
  }

  // Permanently delete
  Stream.permanentDelete(req.params.id);

  res.json({
    success: true,
    message: 'Stream permanently deleted'
  });
}));

module.exports = router;
