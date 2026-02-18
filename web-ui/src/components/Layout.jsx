import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  Video,
  LayoutDashboard,
  Radio,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  HelpCircle,
  Info,
  Users,
  FileText,
  History,
  Shield
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import LanguageSwitcher from './LanguageSwitcher';
import UpdateNotification from './UpdateNotification';
import PermissionGuard from './PermissionGuard';
import UserRoleBadge from './UserRoleBadge';

export default function Layout({ children }) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { user, logout, hasPermission, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Show password change modal if required
    if (user?.must_change_password) {
      setShowPasswordModal(true);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: t('nav.dashboard') || 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: t('nav.streams') || 'Streams', href: '/streams', icon: Radio },
    { name: 'Stream History', href: '/streams/history', icon: History, permission: 'streams:read' },
    { name: t('nav.sessions') || 'Sessions', href: '/sessions', icon: Activity },
    { name: 'My Sessions', href: '/sessions/manage', icon: Shield },
    { name: 'Users', href: '/users', icon: Users, permission: 'users:read', adminOnly: true },
    { name: 'Audit Log', href: '/audit', icon: FileText, permission: 'audit:read', adminOnly: true },
    { name: t('nav.settings') || 'Settings', href: '/settings', icon: Settings },
    { name: t('nav.help') || 'Help', href: '/help', icon: HelpCircle },
    { name: t('nav.about') || 'About', href: '/about', icon: Info },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <img src="/logo.svg" alt={t('nav.appName')} className="w-8 h-8" />
            <span className="ml-2 text-lg font-semibold text-gray-900">
              {t('nav.appName')}
            </span>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            // Check permissions for restricted items
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
                {item.adminOnly && (
                  <span className="ml-auto text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                {user?.role && <UserRoleBadge role={user.role} />}
              </div>
              <p className="text-xs text-gray-500">{user?.email || t('nav.administrator')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            {t('nav.signOut')}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex-1" />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          required={user?.must_change_password}
          onClose={() => {
            if (!user?.must_change_password) {
              setShowPasswordModal(false);
            }
          }}
        />
      )}

      {/* Update Notification */}
      <UpdateNotification />
    </div>
  );
}
