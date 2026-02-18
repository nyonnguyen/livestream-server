import { useAuth } from '../contexts/AuthContext';

/**
 * Component to conditionally render children based on user permissions
 * Usage: <PermissionGuard permission="streams:write">...</PermissionGuard>
 */
const PermissionGuard = ({ permission, role, fallback = null, children }) => {
  const { hasPermission, hasRole } = useAuth();

  // Check permission if provided
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  // Check role if provided
  if (role && !hasRole(role)) {
    return fallback;
  }

  return children;
};

export default PermissionGuard;
