import { useTranslation } from 'react-i18next';

/**
 * Badge component to display user roles with color coding
 * - Admin: red
 * - Editor: blue
 * - Viewer: green
 */
const UserRoleBadge = ({ role }) => {
  const { t } = useTranslation();

  if (!role) return null;

  const getRoleColor = (roleName) => {
    switch (roleName) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'editor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (roleName) => {
    switch (roleName) {
      case 'admin':
        return '👑';
      case 'editor':
        return '✏️';
      case 'viewer':
        return '👁️';
      default:
        return '•';
    }
  };

  const getPermissionsText = (roleName) => {
    switch (roleName) {
      case 'admin':
        return 'Full access to all features';
      case 'editor':
        return 'Can manage streams and view sessions';
      case 'viewer':
        return 'Read-only access';
      default:
        return '';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(role.name)}`}
      title={getPermissionsText(role.name)}
    >
      <span className="mr-1">{getRoleIcon(role.name)}</span>
      {role.display_name || role.name}
    </span>
  );
};

export default UserRoleBadge;
