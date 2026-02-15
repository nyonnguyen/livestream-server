import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { configAPI, streamsAPI, sessionsAPI } from '../services/api';
import { Radio, Activity, Server, AlertCircle, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [streams, setStreams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [healthRes, statsRes, streamsRes, sessionsRes] = await Promise.all([
        configAPI.health(),
        configAPI.stats(),
        streamsAPI.getAll({ is_active: true }),
        sessionsAPI.getAll(),
      ]);

      setHealth(healthRes.data.data);
      setStats(statsRes.data.data);
      setStreams(streamsRes.data.data);
      setSessions(sessionsRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, link }) => {
    const content = (
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );

    return link ? <Link to={link}>{content}</Link> : content;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">System overview and statistics</p>
      </div>

      {/* Status Alert */}
      {health?.status !== 'healthy' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">System Warning</p>
            <p className="text-sm text-yellow-700 mt-1">
              {health?.srs?.status !== 'healthy' && 'SRS streaming server is not responding. '}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Active Streams"
          value={sessions?.length || 0}
          icon={Radio}
          color="bg-primary-600"
          link="/streams"
        />
        <StatCard
          title="Total Streams"
          value={streams?.length || 0}
          icon={TrendingUp}
          color="bg-green-600"
          link="/streams"
        />
        <StatCard
          title="Active Sessions"
          value={stats?.database?.activeSessions || 0}
          icon={Activity}
          color="bg-blue-600"
          link="/sessions"
        />
        <StatCard
          title="System Status"
          value={health?.status === 'healthy' ? 'Healthy' : 'Warning'}
          icon={Server}
          color={health?.status === 'healthy' ? 'bg-green-600' : 'bg-yellow-600'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Streams */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Streams</h2>
            <Link to="/streams" className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>

          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active streams</p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {session.stream_name}
                      </p>
                      <p className="text-xs text-gray-500">{session.ip_address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {session.live_data && (
                      <p className="text-sm font-medium text-gray-900">
                        {Math.round(session.live_data.kbps?.recv || 0)} kbps
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>

          <div className="space-y-4">
            {/* Database */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Database</p>
                <p className="text-xs text-gray-500">SQLite</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Healthy
              </span>
            </div>

            {/* SRS Server */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">SRS Server</p>
                <p className="text-xs text-gray-500">
                  {health?.srs?.version?.data?.version || 'Unknown'}
                </p>
              </div>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  health?.srs?.status === 'healthy'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {health?.srs?.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>

            {/* API Server */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">API Server</p>
                <p className="text-xs text-gray-500">Node.js</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Healthy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
