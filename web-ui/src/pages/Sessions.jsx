import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { sessionsAPI } from '../services/api';
import { Activity, StopCircle, Clock, TrendingUp, History as HistoryIcon, Settings } from 'lucide-react';
import axios from 'axios';

export default function Sessions() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'recent'
  const [recentLimit, setRecentLimit] = useState(10); // Default 10 recent sessions

  useEffect(() => {
    fetchSessions();
    fetchRecentSessions();
    const interval = setInterval(() => {
      fetchSessions();
      if (activeTab === 'recent') {
        fetchRecentSessions();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [recentLimit, activeTab]);

  const fetchSessions = async () => {
    try {
      const response = await sessionsAPI.getAll();
      setSessions(response.data.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      // Try to fetch recent/completed sessions
      // This endpoint may need to be implemented in the backend
      const response = await axios.get(`/api/sessions/recent?limit=${recentLimit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setRecentSessions(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      // If endpoint doesn't exist yet, just show empty
      setRecentSessions([]);
    }
  };

  const handleDisconnect = async (id, streamName) => {
    if (!confirm(t('sessions.disconnectConfirm', { streamName }))) {
      return;
    }

    try {
      await sessionsAPI.disconnect(id);
      fetchSessions();
    } catch (error) {
      alert(t('sessions.errorDisconnecting') + error.response?.data?.error);
    }
  };

  const formatDuration = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatBitrate = (kbps) => {
    if (!kbps) return '0 kbps';
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${Math.round(kbps)} kbps`;
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-';
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  const formatCompletedDuration = (durationSeconds) => {
    if (!durationSeconds) return '-';
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = Math.floor(durationSeconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('sessions.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('sessions.title')}</h1>
        <p className="text-gray-600">{t('sessions.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Active Sessions ({sessions.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'recent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-5 h-5" />
                Recent Sessions
              </div>
            </button>
          </nav>
        </div>

        {/* Recent Sessions Limit Selector */}
        {activeTab === 'recent' && (
          <div className="mt-4 flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <select
              value={recentLimit}
              onChange={(e) => setRecentLimit(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 sessions</option>
              <option value={25}>25 sessions</option>
              <option value={50}>50 sessions</option>
              <option value={100}>100 sessions</option>
            </select>
          </div>
        )}
      </div>

      {/* Stats - Only for Active Sessions */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('sessions.activeSessions')}</p>
              <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('sessions.totalBandwidth')}</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatBitrate(
                  sessions.reduce((sum, s) => sum + (s.live_data?.kbps?.recv || 0), 0)
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('sessions.avgDuration')}</p>
              <p className="text-3xl font-bold text-gray-900">
                {sessions.length > 0
                  ? Math.floor(
                      sessions.reduce((sum, s) => {
                        const start = new Date(s.started_at);
                        const now = new Date();
                        return sum + (now - start) / 1000;
                      }, 0) /
                        sessions.length /
                        60
                    ) + 'm'
                  : '0m'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Active Sessions Table */}
      {activeTab === 'active' && (
        sessions.length === 0 ? (
        <div className="card text-center py-12">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{t('sessions.noActiveSessions')}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  {t('sessions.stream')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  {t('sessions.ipAddress')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  {t('sessions.protocol')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  {t('sessions.duration')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  {t('sessions.bitrate')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  {t('sessions.resolution')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  {t('sessions.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {session.stream_name || t('sessions.unknownStream')}
                        </div>
                        {session.live_data?.video?.codec && (
                          <div className="text-xs text-gray-500">
                            {session.live_data.video.codec}
                            {session.live_data.video.profile && ` (${session.live_data.video.profile})`}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {session.ip_address || t('sessions.na')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded uppercase">
                      {session.protocol || 'rtmp'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDuration(session.started_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-gray-900 font-medium">
                      {session.live_data?.kbps?.recv ? formatBitrate(session.live_data.kbps.recv) : (
                        <span className="text-gray-400">{t('sessions.connecting')}</span>
                      )}
                    </div>
                    {session.live_data?.kbps?.send > 0 && (
                      <div className="text-xs text-gray-500">
                        ↓ {formatBitrate(session.live_data.kbps.recv)} / ↑ {formatBitrate(session.live_data.kbps.send)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {session.live_data?.video ? (
                      <div>
                        <div>
                          {session.live_data.video.width}x{session.live_data.video.height}
                        </div>
                        {session.live_data.video.fps && (
                          <div className="text-xs text-gray-500">
                            {session.live_data.video.fps} fps
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDisconnect(session.id, session.stream_name)}
                      className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100"
                    >
                      <StopCircle className="w-4 h-4 mr-1" />
                      {t('sessions.disconnect')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}

      {/* Recent Sessions Table */}
      {activeTab === 'recent' && (
        recentSessions.length === 0 ? (
          <div className="card text-center py-12">
            <HistoryIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent sessions found</p>
            <p className="text-xs text-gray-400 mt-2">Recent sessions will appear here after they end</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Stream
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    IP Address
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Protocol
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Started At
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Ended At
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Duration
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Avg Bitrate
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {session.stream_name || 'Unknown Stream'}
                      </div>
                      {session.protocol && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded uppercase">
                          {session.protocol}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {session.ip_address || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                        {session.ended_at ? 'Completed' : 'Disconnected'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDateTime(session.started_at)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDateTime(session.ended_at)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {formatCompletedDuration(session.duration_seconds)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {session.bytes_received && session.duration_seconds
                        ? formatBitrate((session.bytes_received * 8) / (session.duration_seconds * 1000))
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
