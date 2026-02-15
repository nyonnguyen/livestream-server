const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-key-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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

  // Attach user to request
  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    must_change_password: user.must_change_password
  };

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
