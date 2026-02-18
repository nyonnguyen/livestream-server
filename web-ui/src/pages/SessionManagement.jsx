import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { ComputerDesktopIcon, DevicePhoneMobileIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import ConfirmDialog from '../components/ConfirmDialog';

const SessionManagement = () => {
  const { t } = useTranslation();
  const { activeSessions, refreshSessions, revokeSession, revokeAllOtherSessions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadSessions();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    await refreshSessions();
    setLoading(false);
  };

  const handleRevokeSession = async (session) => {
    setSelectedSession(session);
    setShowRevokeDialog(true);
  };

  const confirmRevokeSession = async () => {
    if (!selectedSession) return;

    setRevoking(selectedSession.id);
    const result = await revokeSession(selectedSession.id);

    if (result.success) {
      // Session revoked successfully
    }

    setRevoking(null);
    setSelectedSession(null);
  };

  const handleRevokeAll = async () => {
    setRevoking('all');
    const result = await revokeAllOtherSessions();

    if (result.success) {
      // Sessions revoked successfully
    }

    setRevoking(null);
    setShowRevokeAllDialog(false);
  };

  const getDeviceIcon = (deviceInfo) => {
    if (!deviceInfo) return <ComputerDesktopIcon className="h-6 w-6" />;

    const lowerDevice = deviceInfo.toLowerCase();
    if (lowerDevice.includes('mobile') || lowerDevice.includes('android') || lowerDevice.includes('iphone')) {
      return <DevicePhoneMobileIcon className="h-6 w-6" />;
    }

    return <ComputerDesktopIcon className="h-6 w-6" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDeviceName = (deviceInfo) => {
    if (!deviceInfo) return 'Unknown Device';

    // Extract browser and OS
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    if (deviceInfo.includes('Chrome')) browser = 'Chrome';
    else if (deviceInfo.includes('Firefox')) browser = 'Firefox';
    else if (deviceInfo.includes('Safari')) browser = 'Safari';
    else if (deviceInfo.includes('Edge')) browser = 'Edge';

    if (deviceInfo.includes('Windows')) os = 'Windows';
    else if (deviceInfo.includes('Mac')) os = 'macOS';
    else if (deviceInfo.includes('Linux')) os = 'Linux';
    else if (deviceInfo.includes('Android')) os = 'Android';
    else if (deviceInfo.includes('iOS') || deviceInfo.includes('iPhone')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('My Login Sessions') || 'My Login Sessions'}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('Manage your active login sessions across different devices') || 'Manage your active login sessions across different devices'}
          </p>
        </div>
        {activeSessions.length > 1 && (
          <button
            onClick={() => setShowRevokeAllDialog(true)}
            disabled={revoking === 'all'}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {revoking === 'all' ? 'Revoking...' : 'Revoke All Other Sessions'}
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {activeSessions.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No active sessions found.
            </li>
          ) : (
            activeSessions.map((session) => (
              <li key={session.id} className={`px-6 py-4 ${session.is_current ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="flex-shrink-0 text-gray-400">
                      {getDeviceIcon(session.device_info)}
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {getDeviceName(session.device_info)}
                        </p>
                        {session.is_current && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <span>{session.ip_address || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <span>Last active: {formatDate(session.last_activity)}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Created: {formatDate(session.created_at)}
                      </p>
                    </div>
                  </div>

                  {!session.is_current && (
                    <button
                      onClick={() => handleRevokeSession(session)}
                      disabled={revoking === session.id}
                      className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {revoking === session.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Sessions</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Sessions are created each time you log in from a device</li>
                <li>You can have up to 5 active sessions at once</li>
                <li>Revoking a session will log out that device immediately</li>
                <li>Sessions expire automatically after 24 hours of inactivity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Revoke single session dialog */}
      <ConfirmDialog
        isOpen={showRevokeDialog}
        onClose={() => {
          setShowRevokeDialog(false);
          setSelectedSession(null);
        }}
        onConfirm={confirmRevokeSession}
        title="Revoke Session"
        message={selectedSession ? `Are you sure you want to revoke the session from ${getDeviceName(selectedSession.device_info)}? This will immediately log out that device.` : ''}
        confirmText="Revoke Session"
        type="warning"
        isProcessing={revoking !== null}
      />

      {/* Revoke all sessions dialog */}
      <ConfirmDialog
        isOpen={showRevokeAllDialog}
        onClose={() => setShowRevokeAllDialog(false)}
        onConfirm={handleRevokeAll}
        title="Revoke All Other Sessions"
        message="Are you sure you want to revoke all other sessions? This will log out all devices except your current one."
        confirmText="Revoke All"
        type="warning"
        isProcessing={revoking === 'all'}
      />
    </div>
  );
};

export default SessionManagement;
