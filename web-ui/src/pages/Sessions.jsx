import { useState, useEffect } from 'react';
import { sessionsAPI } from '../services/api';
import { Activity, StopCircle, Clock, TrendingUp } from 'lucide-react';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleDisconnect = async (id, streamName) => {
    if (!confirm(`Disconnect stream "${streamName}"?`)) {
      return;
    }

    try {
      await sessionsAPI.disconnect(id);
      fetchSessions();
    } catch (error) {
      alert('Error disconnecting session: ' + error.response?.data?.error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
        <p className="text-gray-600">Monitor live streaming sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Sessions</p>
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
              <p className="text-sm text-gray-600 mb-1">Total Bandwidth</p>
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
              <p className="text-sm text-gray-600 mb-1">Avg. Duration</p>
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

      {/* Sessions Table */}
      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No active sessions</p>
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
                  Duration
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Bitrate
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Resolution
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Actions
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
                          {session.stream_name || 'Unknown Stream'}
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
                    {session.ip_address || 'N/A'}
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
                        <span className="text-gray-400">Connecting...</span>
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
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
