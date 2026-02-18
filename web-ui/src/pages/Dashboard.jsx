import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { configAPI, streamsAPI, sessionsAPI } from '../services/api';
import { Radio, Activity, Server, AlertCircle, TrendingUp, Cpu, HardDrive, Thermometer, Network } from 'lucide-react';
import axios from 'axios';

export default function Dashboard() {
  const { t } = useTranslation();
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [streams, setStreams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [healthRes, statsRes, streamsRes, sessionsRes, systemHealthRes] = await Promise.all([
        configAPI.health(),
        configAPI.stats(),
        streamsAPI.getAll({ is_active: true }),
        sessionsAPI.getAll(),
        axios.get('/api/system/health', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error('Failed to fetch system health:', err);
          return { data: { data: null } };
        })
      ]);

      setHealth(healthRes.data.data);
      setStats(statsRes.data.data);
      setStreams(streamsRes.data.data);
      setSessions(sessionsRes.data.data);
      setSystemHealth(systemHealthRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('dashboard.loading')}</div>
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
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      {/* Status Alert */}
      {health?.status !== 'healthy' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">{t('dashboard.systemWarning')}</p>
            <p className="text-sm text-yellow-700 mt-1">
              {health?.srs?.status !== 'healthy' && 'SRS streaming server is not responding. '}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title={t('dashboard.activeStreams')}
          value={sessions?.length || 0}
          icon={Radio}
          color="bg-primary-600"
          link="/streams"
        />
        <StatCard
          title={t('dashboard.totalStreams')}
          value={streams?.length || 0}
          icon={TrendingUp}
          color="bg-green-600"
          link="/streams"
        />
        <StatCard
          title={t('dashboard.activeSessions')}
          value={stats?.database?.activeSessions || 0}
          icon={Activity}
          color="bg-blue-600"
          link="/sessions"
        />
        <StatCard
          title={t('dashboard.systemStatus')}
          value={health?.status === 'healthy' ? t('dashboard.healthy') : t('dashboard.warning')}
          icon={Server}
          color={health?.status === 'healthy' ? 'bg-green-600' : 'bg-yellow-600'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Streams */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.activeStreams')}</h2>
            <Link to="/streams" className="text-sm text-primary-600 hover:text-primary-700">
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('dashboard.noActiveStreams')}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.systemHealth')}</h2>

          <div className="space-y-4">
            {/* Database */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{t('dashboard.database')}</p>
                <p className="text-xs text-gray-500">{t('dashboard.sqlite')}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {t('dashboard.healthy')}
              </span>
            </div>

            {/* SRS Server */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{t('dashboard.srsServer')}</p>
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
                {health?.srs?.status === 'healthy' ? t('dashboard.healthy') : t('dashboard.unhealthy')}
              </span>
            </div>

            {/* API Server */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{t('dashboard.apiServer')}</p>
                <p className="text-xs text-gray-500">{t('dashboard.nodejs')}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {t('dashboard.healthy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Host System Monitoring */}
      {systemHealth && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Host System Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU Usage */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Cpu className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">CPU</h3>
                </div>
                <span className="text-2xl font-bold text-gray-900">{systemHealth.cpu.usage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    systemHealth.cpu.usage > 80 ? 'bg-red-600' :
                    systemHealth.cpu.usage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${systemHealth.cpu.usage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{systemHealth.cpu.cores} cores @ {systemHealth.cpu.speed} MHz</p>
            </div>

            {/* Memory Usage */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Server className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Memory</h3>
                </div>
                <span className="text-2xl font-bold text-gray-900">{systemHealth.memory.usage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    systemHealth.memory.usage > 80 ? 'bg-red-600' :
                    systemHealth.memory.usage > 60 ? 'bg-yellow-600' : 'bg-purple-600'
                  }`}
                  style={{ width: `${systemHealth.memory.usage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{systemHealth.memory.usedGB} GB / {systemHealth.memory.totalGB} GB</p>
            </div>

            {/* Disk Usage */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <HardDrive className="w-5 h-5 text-orange-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Disk</h3>
                </div>
                <span className="text-2xl font-bold text-gray-900">{systemHealth.disk.usage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    systemHealth.disk.usage > 80 ? 'bg-red-600' :
                    systemHealth.disk.usage > 60 ? 'bg-yellow-600' : 'bg-orange-600'
                  }`}
                  style={{ width: `${systemHealth.disk.usage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{systemHealth.disk.used} / {systemHealth.disk.total}</p>
            </div>

            {/* Temperature */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Thermometer className="w-5 h-5 text-red-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Temperature</h3>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {systemHealth.temperature.celsius !== 'N/A' ? `${systemHealth.temperature.celsius}°C` : 'N/A'}
                </span>
              </div>
              {systemHealth.temperature.celsius !== 'N/A' && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      parseFloat(systemHealth.temperature.celsius) > 70 ? 'bg-red-600' :
                      parseFloat(systemHealth.temperature.celsius) > 60 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(100, (parseFloat(systemHealth.temperature.celsius) / 80) * 100)}%` }}
                  ></div>
                </div>
              )}
              <p className="text-xs text-gray-500">
                {systemHealth.temperature.fahrenheit !== 'N/A' ? `${systemHealth.temperature.fahrenheit}°F` : 'Not available'}
              </p>
            </div>
          </div>

          {/* System Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Uptime */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">System Uptime</h3>
              <p className="text-2xl font-bold text-blue-600">{systemHealth.uptime.formatted}</p>
              <p className="text-xs text-gray-500 mt-1">
                {systemHealth.uptime.days} days, {systemHealth.uptime.hours} hours
              </p>
            </div>

            {/* Load Average */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">Load Average</h3>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-600">1 min</p>
                  <p className="font-bold text-gray-900">{systemHealth.load['1min']}</p>
                </div>
                <div>
                  <p className="text-gray-600">5 min</p>
                  <p className="font-bold text-gray-900">{systemHealth.load['5min']}</p>
                </div>
                <div>
                  <p className="text-gray-600">15 min</p>
                  <p className="font-bold text-gray-900">{systemHealth.load['15min']}</p>
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="card">
              <div className="flex items-center mb-2">
                <Network className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Network</h3>
              </div>
              {systemHealth.network.length > 0 ? (
                <div className="space-y-1">
                  {systemHealth.network.slice(0, 2).map((iface, idx) => (
                    <div key={idx} className="text-xs">
                      <p className="font-medium text-gray-700">{iface.interface}: {iface.address}</p>
                      <p className="text-gray-500">
                        ↓ {iface.rxGB} GB / ↑ {iface.txGB} GB
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No network data available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
