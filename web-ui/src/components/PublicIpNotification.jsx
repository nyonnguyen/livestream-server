import { useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * PublicIpNotification Component
 *
 * Monitors for public IP address changes and displays toast notifications
 * when changes are detected. Allows users to apply changes or dismiss.
 *
 * Features:
 * - Polls for IP changes every 30 seconds
 * - Shows old → new IP address
 * - Apply button to update all streams
 * - Dismiss button to ignore change
 * - "Don't show again" option (stores in localStorage)
 * - Auto-dismiss after applying or dismissing
 */
const PublicIpNotification = () => {
  const [notification, setNotification] = useState(null);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if user has opted out of notifications
    const optedOut = localStorage.getItem('ip_notification_opted_out');
    if (optedOut === 'true') {
      setDontShowAgain(true);
      return;
    }

    // Initial check
    checkForIpChanges();

    // Poll every 30 seconds
    const interval = setInterval(checkForIpChanges, 30000);

    return () => clearInterval(interval);
  }, [dontShowAgain]);

  const checkForIpChanges = async () => {
    if (dontShowAgain) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return; // User not logged in

      const response = await fetch(`${API_URL}/api/network/public-ip-history?limit=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const history = data.data || [];

        if (history.length > 0) {
          const latestChange = history[0];

          // Check if this is a new unapplied change
          if (!latestChange.applied_at && !latestChange.auto_applied) {
            // Check if we haven't already shown this notification
            const lastShownId = sessionStorage.getItem('last_ip_notification_id');
            if (lastShownId !== String(latestChange.id)) {
              setNotification(latestChange);
              sessionStorage.setItem('last_ip_notification_id', String(latestChange.id));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for IP changes:', error);
    }
  };

  const handleApply = async () => {
    if (!notification) return;

    setApplying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/network/public-ip-apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          history_id: notification.id,
          new_ip: notification.new_ip
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully updated ${data.updated || 0} stream(s) with new IP address.`);
        setNotification(null);
      } else {
        const error = await response.json();
        alert(`Failed to apply IP change: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to apply IP change:', error);
      alert('Failed to apply IP change');
    } finally {
      setApplying(false);
    }
  };

  const handleDismiss = () => {
    setNotification(null);
    setDismissed(true);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem('ip_notification_opted_out', 'true');
    setDontShowAgain(true);
    setNotification(null);
  };

  const handleReEnable = () => {
    localStorage.removeItem('ip_notification_opted_out');
    setDontShowAgain(false);
    setDismissed(false);
    checkForIpChanges();
  };

  return (
    <>
      {/* IP Change Notification Toast */}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          <Transition
            show={notification !== null && !dismissed}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">Public IP Address Changed</p>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>
                        Your public IP address has changed:
                      </p>
                      <div className="mt-2 flex items-center space-x-2 font-mono text-xs bg-gray-50 p-2 rounded">
                        <span className="text-red-600">{notification?.old_ip || 'Unknown'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600">{notification?.new_ip}</span>
                      </div>
                      <p className="mt-2">
                        Would you like to update all streams to use the new IP address?
                      </p>
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <button
                        type="button"
                        onClick={handleApply}
                        disabled={applying}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        {applying ? 'Applying...' : 'Apply Change'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDismiss}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleDontShowAgain}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Don't show IP change notifications again
                      </button>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      type="button"
                      className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={handleDismiss}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      {/* Re-enable notifications (for users who opted out) */}
      {dontShowAgain && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={handleReEnable}
            className="bg-blue-600 text-white px-3 py-2 rounded-md text-xs shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Re-enable IP change notifications"
          >
            Enable IP Notifications
          </button>
        </div>
      )}
    </>
  );
};

export default PublicIpNotification;
