const Role = require('../models/Role');

/**
 * Middleware factory to require a specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const hasPermission = Role.hasPermission(req.user.id, permission);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: permission
      });
    }

    next();
  };
}

/**
 * Middleware factory to require a specific role
 */
function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = Role.getUserRole(req.user.id);

    if (!userRole || userRole.name !== roleName) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required_role: roleName
      });
    }

    next();
  };
}

/**
 * Middleware to check if user is admin
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Middleware to attach user permissions to request
 */
function attachPermissions(req, res, next) {
  if (req.user && req.user.id) {
    const permissions = Role.getUserPermissions(req.user.id);
    const userRole = Role.getUserRole(req.user.id);

    req.user.permissions = permissions;
    req.user.role = userRole;
  }

  next();
}

/**
 * Check if request user has permission (utility function)
 */
function hasPermission(req, permission) {
  if (!req.user) {
    return false;
  }

  return Role.hasPermission(req.user.id, permission);
}

module.exports = {
  requirePermission,
  requireRole,
  requireAdmin,
  attachPermissions,
  hasPermission
};
