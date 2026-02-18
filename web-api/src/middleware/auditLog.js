const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware factory to log activities
 */
function logActivity(action, resourceType) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to log after successful response
    res.json = function(data) {
      // Only log if request was successful
      if (data && data.success !== false && req.user) {
        const resourceId = req.params.id || (data.data && data.data.id) || null;
        const details = {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: sanitizeBody(req.body)
        };

        const ipAddress = req.clientIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        try {
          ActivityLog.log(req.user.id, action, resourceType, resourceId, details, ipAddress);
        } catch (error) {
          console.error('Error logging activity:', error.message);
        }
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Sanitize request body (remove sensitive data)
 */
function sanitizeBody(body) {
  if (!body) return null;

  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Manually log an activity (for use in route handlers)
 */
function log(req, action, resourceType, resourceId = null, details = null) {
  if (!req.user) return;

  const ipAddress = req.clientIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    ActivityLog.log(req.user.id, action, resourceType, resourceId, details, ipAddress);
  } catch (error) {
    console.error('Error logging activity:', error.message);
  }
}

module.exports = {
  logActivity,
  log
};
