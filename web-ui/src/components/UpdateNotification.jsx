import { useState, useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import axios from 'axios';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates();

    // Check periodically (every 6 hours)
    const interval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      const response = await axios.get('/api/version/check');

      if (response.data.success && response.data.data.hasUpdate) {
        // Check if this version update was already dismissed
        const dismissedVersion = localStorage.getItem('dismissed_update_version');

        if (dismissedVersion !== response.data.data.latest) {
          setUpdateInfo(response.data.data);
          setDismissed(false);
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleDismiss = () => {
    // Remember dismissed version so it doesn't show again until next version
    if (updateInfo) {
      localStorage.setItem('dismissed_update_version', updateInfo.latest);
    }
    setDismissed(true);
  };

  const handleViewRelease = () => {
    if (updateInfo?.releaseUrl) {
      window.open(updateInfo.releaseUrl, '_blank');
    }
  };

  if (!updateInfo || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in-right">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-2xl p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <h3 className="font-semibold text-lg">Update Available</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-3">
          <p className="text-sm text-white/90">
            A new version is available: <span className="font-bold">{updateInfo.latest}</span>
          </p>
          <p className="text-xs text-white/75">
            Current version: {updateInfo.current}
          </p>

          {updateInfo.releaseNotes && (
            <div className="mt-2 p-2 bg-white/10 rounded text-xs text-white/90 max-h-32 overflow-y-auto">
              <p className="font-semibold mb-1">What's New:</p>
              <p className="whitespace-pre-wrap">
                {updateInfo.releaseNotes.split('\n').slice(0, 3).join('\n')}
                {updateInfo.releaseNotes.split('\n').length > 3 && '...'}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleViewRelease}
            className="flex-1 flex items-center justify-center space-x-1 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Release</span>
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg font-medium border border-white/30 hover:bg-white/10 transition-colors text-sm"
          >
            Later
          </button>
        </div>

        <p className="mt-3 text-xs text-white/60 text-center">
          To update: <code className="bg-white/10 px-2 py-0.5 rounded">git pull && docker compose restart</code>
        </p>
      </div>
    </div>
  );
}
