import { useState, useEffect } from 'react';
import { Mail, Heart, Code, Github, RefreshCw, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { systemAPI } from '../services/api';

export default function About() {
  const { t } = useTranslation();
  const [versionInfo, setVersionInfo] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateLog, setUpdateLog] = useState('');
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showFullLog, setShowFullLog] = useState(false);

  useEffect(() => {
    fetchVersion();
  }, []);

  // Auto-scroll log to bottom when it updates
  useEffect(() => {
    if (showFullLog && updateLog) {
      const logElement = document.getElementById('update-log');
      if (logElement) {
        setTimeout(() => {
          logElement.scrollTop = logElement.scrollHeight;
        }, 100);
      }
    }
  }, [updateLog, showFullLog]);

  const fetchVersion = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/version');
      setVersionInfo(response.data.data);
    } catch (err) {
      console.error('Failed to fetch version:', err);
      setError('Unable to fetch version information');
    } finally {
      setLoading(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      setError(null);
      const response = await axios.get('/api/version/check');
      setUpdateInfo(response.data.data);
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setError('Unable to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = async () => {
    setShowUpdateConfirm(false);
    setUpdating(true);
    setUpdateStatus('Starting update...');
    setUpdateLog('');
    setError(null);
    setShowFullLog(true);

    try {
      // Start the update
      const response = await systemAPI.update();

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to start update');
      }

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await systemAPI.updateStatus();
          const { status, log } = statusResponse.data.data;

          // Update the full log
          setUpdateLog(log);

          if (status === 'complete') {
            clearInterval(pollInterval);
            setUpdating(false);

            // Check if update actually failed (error in log)
            if (log.includes('ERROR:') || log.includes('[UPDATE FAILED]')) {
              setError('Update failed. Check the logs below for details.');
              setUpdateStatus('Update failed');
            } else {
              setUpdateStatus('Update completed successfully! Refreshing page...');
              // Refresh version info after update (wait 5 seconds for containers to stabilize)
              setTimeout(() => {
                window.location.reload();
              }, 5000);
            }
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            setUpdating(false);
            // Show actual log output so user can see what went wrong
            const logLines = log.split('\n').filter(line => line.trim());
            const errorDetails = logLines.slice(-5).join('\n');
            setError(`Update failed. Check the full logs below for details.\n\nLast 5 lines:\n${errorDetails}`);
            setUpdateStatus('Update failed');
          } else {
            // Extract last non-empty line from log as status
            const lines = log.split('\n').filter(line => line.trim() && !line.includes('[UPDATE'));
            const lastLine = lines[lines.length - 1] || 'Updating...';
            setUpdateStatus(lastLine);
          }
        } catch (err) {
          console.error('Failed to check update status:', err);
        }
      }, 2000); // Poll every 2 seconds

      // Stop polling after 10 minutes (timeout) - increased for rebuild time
      setTimeout(() => {
        clearInterval(pollInterval);
        if (updating) {
          setUpdating(false);
          setError('Update timeout. The update may still be running in the background.');
          setUpdateStatus('Update timeout');
        }
      }, 10 * 60 * 1000);

    } catch (err) {
      console.error('Failed to start update:', err);
      setUpdating(false);
      setError(err.response?.data?.error || 'Failed to start update');
      setUpdateStatus(null);
    }
  };

  const version = versionInfo?.version || "Loading...";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center gap-4 mb-4">
          <img src="/icon.svg" alt={t('about.title')} className="w-20 h-20" />
          <div>
            <h1 className="text-3xl font-bold">{t('about.title')}</h1>
            <p className="text-indigo-100 text-lg">{t('about.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 w-fit">
          <span className="text-sm font-medium">{t('about.version')}</span>
          <span className="text-xl font-bold">{version}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Author Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-600" />
            {t('about.author')}
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-600 text-sm">{t('about.createdBy')}</p>
              <p className="text-lg font-semibold text-gray-900">{t('about.authorName')}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-indigo-600" />
              <a
                href="mailto:nyonnguyen@gmail.com"
                className="hover:text-indigo-600 transition-colors"
              >
                nyonnguyen@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            {t('about.project')}
          </h2>
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium flex items-center gap-2">
                <Heart className="w-4 h-4 fill-green-600 text-green-600" />
                {t('about.nonProfit')}
              </p>
              <p className="text-green-700 text-sm mt-1">
                {t('about.nonProfitDesc')}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">{t('about.license')}</p>
              <p className="text-gray-900 font-medium">{t('about.mitLicense')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">{t('about.aboutProject')}</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-3">
            {t('about.description')}
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">{t('about.keyFeatures')}</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>{t('about.lowLatency')}</strong> {t('about.lowLatencyDesc')}
            </li>
            <li>
              <strong>{t('about.multipleProtocols')}</strong> {t('about.multipleProtocolsDesc')}
            </li>
            <li>
              <strong>{t('about.resourceEfficient')}</strong> {t('about.resourceEfficientDesc')}
            </li>
            <li>
              <strong>{t('about.webManagement')}</strong> {t('about.webManagementDesc')}
            </li>
            <li>
              <strong>{t('about.dualNetwork')}</strong> {t('about.dualNetworkDesc')}
            </li>
            <li>
              <strong>{t('about.sessionMonitoring')}</strong> {t('about.sessionMonitoringDesc')}
            </li>
            <li>
              <strong>{t('about.dockerDeployment')}</strong> {t('about.dockerDeploymentDesc')}
            </li>
          </ul>

          <h3 className="text-lg font-semibold mt-4 mb-2">{t('about.techStack')}</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>{t('about.srs')}</strong> {t('about.srsDesc')}</li>
            <li><strong>{t('about.nodejs')}</strong> {t('about.nodejsDesc')}</li>
            <li><strong>{t('about.react')}</strong> {t('about.reactDesc')}</li>
            <li><strong>{t('about.sqlite')}</strong> {t('about.sqliteDesc')}</li>
            <li><strong>{t('about.docker')}</strong> {t('about.dockerDesc')}</li>
          </ul>
        </div>
      </div>

      {/* Version Info */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">{t('about.versionInfo')}</h2>

        {/* Current Version */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 font-medium mb-2">
            {loading ? (
              'Loading version...'
            ) : (
              t('about.currentVersion', { version })
            )}
          </p>
          {versionInfo?.releaseDate && (
            <p className="text-blue-700 text-sm">
              Released: {new Date(versionInfo.releaseDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Check for Updates */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={checkForUpdates}
              disabled={checking || loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking for updates...' : 'Check for Updates'}
            </button>

            {/* View Update Button - shown when update is available */}
            {updateInfo && updateInfo.hasUpdate && (
              <>
                <a
                  href={updateInfo.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                  title="View update on GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Update
                </a>

                {/* Update Now Button */}
                <button
                  onClick={() => setShowUpdateConfirm(true)}
                  disabled={updating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Update now via web interface"
                >
                  <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
                  {updating ? 'Updating...' : 'Update Now'}
                </button>
              </>
            )}
          </div>

          {/* Update Status */}
          {updateStatus && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <RefreshCw className={`w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 ${updating ? 'animate-spin' : ''}`} />
              <div className="flex-1">
                <p className="text-blue-900 font-medium text-sm">
                  {updating ? 'Updating' : 'Update Complete'}
                </p>
                <p className="text-blue-800 text-sm">{updateStatus}</p>
              </div>
              {!updating && (
                <button
                  onClick={() => setShowFullLog(!showFullLog)}
                  className="text-xs text-blue-700 hover:text-blue-900 font-medium"
                >
                  {showFullLog ? 'Hide Logs' : 'Show Logs'}
                </button>
              )}
            </div>
          )}

          {/* Full Update Log */}
          {showFullLog && updateLog && (
            <div className="mt-3 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
                <span className="text-gray-400 font-semibold">Update Log</span>
                <button
                  onClick={() => {
                    const logElement = document.getElementById('update-log');
                    if (logElement) {
                      logElement.scrollTop = logElement.scrollHeight;
                    }
                  }}
                  className="text-gray-400 hover:text-gray-200 text-xs"
                >
                  Scroll to Bottom
                </button>
              </div>
              <div
                id="update-log"
                className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words"
                style={{ scrollBehavior: 'smooth' }}
              >
                {updateLog.split('\n').map((line, index) => {
                  const isError = line.includes('ERROR:') || line.includes('FAILED');
                  const isWarning = line.includes('WARNING:');
                  const isSuccess = line.includes('✓') || line.includes('successfully');
                  const isComplete = line.includes('[UPDATE COMPLETE]');

                  return (
                    <div
                      key={index}
                      className={`py-0.5 ${
                        isError ? 'text-red-400 font-semibold' :
                        isWarning ? 'text-yellow-400' :
                        isSuccess ? 'text-green-400' :
                        isComplete ? 'text-green-400 font-semibold' :
                        'text-gray-300'
                      }`}
                    >
                      {line || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-900 font-medium text-sm">Error</p>
                <pre className="text-red-800 text-sm whitespace-pre-wrap font-sans">{error}</pre>
              </div>
            </div>
          )}

          {/* Update Available */}
          {updateInfo && updateInfo.hasUpdate && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-900 font-medium">Update Available!</p>
                  <p className="text-green-800 text-sm">
                    Version {updateInfo.latest} is now available (current: {updateInfo.current})
                  </p>
                </div>
              </div>

              {updateInfo.releaseNotes && (
                <div className="mt-3 bg-white rounded p-3 border border-green-200">
                  <p className="text-gray-900 font-medium text-sm mb-2">What's New:</p>
                  <div className="text-gray-700 text-sm prose prose-sm max-w-none">
                    {updateInfo.releaseNotes.split('\n').map((line, i) => (
                      <p key={i} className="mb-1">{line}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-2">
                {updateInfo.releaseUrl && (
                  <a
                    href={updateInfo.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Release on GitHub
                  </a>
                )}
                <div className="bg-gray-900 text-gray-100 rounded p-3 text-sm font-mono">
                  <p className="text-gray-400 mb-1"># To update, SSH into your Pi and run:</p>
                  <p>cd /opt/livestream-server</p>
                  <p>git pull origin main</p>
                  <p>docker compose pull</p>
                  <p>docker compose up -d</p>
                </div>
              </div>
            </div>
          )}

          {/* No Update Available */}
          {updateInfo && !updateInfo.hasUpdate && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-600" />
              <p className="text-gray-900 text-sm">
                You're running the latest version ({updateInfo.current})
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Platform Support & Requirements */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">Platform Support & Hardware Requirements</h2>
        <div className="prose max-w-none text-gray-700">
          <p className="mb-4">
            This livestream server is designed to run on any Linux-based system with Docker support,
            not limited to Raspberry Pi. It supports a wide range of platforms including:
          </p>

          <h3 className="text-lg font-semibold mb-2">Supported Platforms</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
            <li><strong>Linux Servers:</strong> Ubuntu, Debian, CentOS, Fedora, etc.</li>
            <li><strong>Single Board Computers:</strong> Raspberry Pi 4/5, Orange Pi, Rock Pi, etc.</li>
            <li><strong>Cloud VPS:</strong> AWS, DigitalOcean, Linode, Vultr, etc.</li>
            <li><strong>Home Servers:</strong> NAS systems with Docker support</li>
            <li><strong>Desktop/Laptop:</strong> Any Linux distribution with Docker</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2">Minimum Hardware Requirements</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-blue-900 mb-2">For 1-2 Concurrent Streams:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• CPU: 2 cores @ 1.5 GHz+</li>
                  <li>• RAM: 2 GB minimum</li>
                  <li>• Storage: 10 GB available</li>
                  <li>• Network: 10 Mbps upload</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-green-900 mb-2">For 3-5 Concurrent Streams:</p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• CPU: 4 cores @ 2.0 GHz+</li>
                  <li>• RAM: 4 GB minimum</li>
                  <li>• Storage: 20 GB available</li>
                  <li>• Network: 25 Mbps upload</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-purple-900 mb-2">For 6-10 Concurrent Streams:</p>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• CPU: 6-8 cores @ 2.5 GHz+</li>
                  <li>• RAM: 8 GB minimum</li>
                  <li>• Storage: 50 GB available</li>
                  <li>• Network: 50 Mbps upload</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-orange-900 mb-2">For 10+ Concurrent Streams:</p>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• CPU: 8+ cores @ 3.0 GHz+</li>
                  <li>• RAM: 16 GB minimum</li>
                  <li>• Storage: 100 GB available</li>
                  <li>• Network: 100 Mbps+ upload</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 italic">
            <strong>Note:</strong> These are general recommendations. Actual requirements may vary based on
            stream quality, bitrate, protocol, and concurrent viewer count. The system automatically
            calculates optimal stream limits based on detected hardware specifications.
          </p>
        </div>
      </div>

      {/* Donate Section */}
      <div className="card mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          Support This Project
        </h2>
        <div className="space-y-3 text-gray-700">
          <p>
            If you find this project helpful, consider supporting the development through a donation.
            Your support helps maintain and improve the server for the Vietnamese livestream community.
          </p>
          <div className="bg-white border border-yellow-300 rounded-lg p-4">
            <p className="font-semibold text-gray-900 mb-2">Bank Transfer (Vietnam):</p>
            <div className="space-y-1 text-sm">
              <p><strong>Bank:</strong> [Your Bank Name]</p>
              <p><strong>Account Number:</strong> [Your Account Number]</p>
              <p><strong>Account Name:</strong> [Your Account Name]</p>
              <p className="text-gray-600 italic mt-2">
                Please include "Livestream Server Support" in the transfer note.
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 italic">
            Thank you for your support! Every contribution helps keep this project alive and improving.
          </p>
        </div>
      </div>

      {/* Contact & Support */}
      <div className="card mt-6 bg-gradient-to-r from-gray-50 to-gray-100">
        <h2 className="text-xl font-bold mb-4">{t('about.supportContributions')}</h2>
        <div className="space-y-3 text-gray-700">
          <p>
            {t('about.contactDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:nyonnguyen@gmail.com"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {t('about.emailSupport')}
            </a>
            <a
              href="https://github.com/nyonnguyen/livestream-server"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Github className="w-4 h-4" />
              GitHub Repository
            </a>
          </div>
          <p className="text-sm text-gray-600 italic mt-3">
            {t('about.tagline')}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-8 pb-8">
        <p>{t('about.footer')}</p>
        <p className="mt-1">Made with ❤️ for the VN Livestream Community</p>
      </div>

      {/* Update Confirmation Modal */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Update</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to update from <strong>{updateInfo?.current}</strong> to <strong>{updateInfo?.latest}</strong>?
            </p>
            <p className="text-sm text-gray-600 mb-6">
              The server will automatically pull the latest code, rebuild containers, and restart services. This may take 2-3 minutes.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpdateConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
