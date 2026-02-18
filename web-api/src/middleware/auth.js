const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-key-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * Generate JWT token and create session
 */
function generateToken(user, deviceInfo = null, ipAddress = null) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

  // Get max sessions config
  const maxSessionsConfig = db.prepare('SELECT value FROM config WHERE key = ?').get('session_max_per_user');
  const maxSessions = maxSessionsConfig ? parseInt(maxSessionsConfig.value) : 5;

  // Check if user has reached max sessions
  if (UserSession.hasReachedMaxSessions(user.id, maxSessions)) {
    // Revoke oldest session to make room
    UserSession.revokeOldestSession(user.id);
  }

  // Create session record
  try {
    UserSession.createSession(user.id, token, deviceInfo, ipAddress, expiresAt.toISOString());
  } catch (error) {
    console.error('Error creating session:', error.message);
  }

  return token;
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  // Validate session (check if revoked)
  const session = UserSession.findByToken(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Session not found or has been revoked'
    });
  }

  // Check if session is expired
  const now = new Date();
  const expiresAt = new Date(session.expires_at);

  if (now > expiresAt) {
    return res.status(401).json({
      success: false,
      error: 'Session expired'
    });
  }

  // Get user from database
  const user = User.findById(decoded.id);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not found'
    });
  }

  if (!user.is_active) {
    return res.status(403).json({
      success: false,
      error: 'User account is disabled'
    });
  }

  // Check if user is soft deleted
  if (user.deleted_at) {
    return res.status(403).json({
      success: false,
      error: 'User account has been deleted'
    });
  }

  // Update session activity
  try {
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    UserSession.updateActivity(tokenHash);
  } catch (error) {
    console.error('Error updating session activity:', error.message);
  }

  // Attach user to request
  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    must_change_password: user.must_change_password,
    role_id: user.role_id
  };

  // Attach IP address for logging
  req.clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

  next();
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded) {
      const user = User.findById(decoded.id);
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email
        };
      }
    }
  }

  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  optionalAuthenticate
};
