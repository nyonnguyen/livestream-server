import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api, { configAPI } from '../services/api';
import { Save, Key, Wifi, Network, Globe, RefreshCw, Wand2, Shield, Clock } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [message, setMessage] = useState(null);
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [networkConfig, setNetworkConfig] = useState({
    server_ip_mode: 'auto',
    server_ip_address: '',
    server_public_ip: '',
    server_hostname: '',
    server_qr_mode: 'lan'
  });
  const [loadingNetwork, setLoadingNetwork] = useState(true);
  const [detectingPublicIP, setDetectingPublicIP] = useState(false);
  const [ipMonitorConfig, setIpMonitorConfig] = useState({
    enabled: false,
    interval_seconds: 300
  });
  const [loadingMonitor, setLoadingMonitor] = useState(true);

  useEffect(() => {
    // Load data sequentially to avoid overwhelming the API
    const loadData = async () => {
      try {
        await fetchConfig();
        await fetchNetworkConfig();
        await fetchNetworkInterfaces();
        await fetchMonitorConfig();
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
        setLoadingNetwork(false);
        setLoadingMonitor(false);
      }
    };
    loadData();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await configAPI.get();
      setConfig(response.data.data);
    } catch (error) {
      console.error('Error fetching config:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load configuration. Please refresh the page.'
      });
    }
  };

  const fetchNetworkInterfaces = async () => {
    try {
      const response = await api.get('/api/network/interfaces');
      const data = response.data.data;
      setNetworkInterfaces(data.interfaces);

      // If client IP is detected and no manual IP set, suggest using it
      if (data.clientIP && !networkConfig.server_ip_address) {
        setNetworkConfig(prev => ({
          ...prev,
          server_ip_address: data.clientIP
        }));
      }
    } catch (error) {
      console.error('Error fetching network interfaces:', error);
    }
  };

  const fetchNetworkConfig = async () => {
    try {
      const response = await api.get('/api/network/config');
      const data = response.data.data;
      setNetworkConfig({
        server_ip_mode: data.server_ip_mode || 'auto',
        server_ip_address: data.server_ip_address || '',
        server_public_ip: data.server_public_ip || '',
        server_hostname: data.server_hostname || '',
        server_qr_mode: data.server_qr_mode || 'lan'
      });
    } catch (error) {
      console.error('Error fetching network config:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load network configuration.'
      });
    }
  };

  const fetchMonitorConfig = async () => {
    try {
      const response = await api.get('/api/network/monitor-status');
      const data = response.data.data;
      setIpMonitorConfig({
        enabled: data.enabled || false,
        interval_seconds: data.interval_seconds || 300
      });
    } catch (error) {
      console.error('Error fetching monitor config:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Save general config
      const updates = {
        max_concurrent_streams: parseInt(config.max_concurrent_streams.value),
        require_authentication: config.require_authentication.value === 'true',
        allow_recording: config.allow_recording.value === 'true',
        default_protocol: config.default_protocol.value,
        session_timeout: parseInt(config.session_timeout.value),
      };

      await configAPI.update(updates);

      // Save network config
      await api.put('/api/network/config', networkConfig);

      // Save IP monitor config
      await api.put('/api/network/monitor-config', ipMonitorConfig);

      setMessage({
        type: 'success',
        text: t('settings.savedSuccess')
      });
      fetchConfig();
      fetchNetworkConfig();
      fetchMonitorConfig();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || t('settings.saveFailed'),
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfigValue = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: value.toString(),
      },
    }));
  };

  const handleDetectPublicIP = async () => {
    setDetectingPublicIP(true);
    try {
      const response = await api.get('/api/network/detect-public-ip');
      if (response.data.success && response.data.data.publicIP) {
        setNetworkConfig({
          ...networkConfig,
          server_public_ip: response.data.data.publicIP
        });
        setMessage({
          type: 'success',
          text: t('settings.publicIpDetected', { ip: response.data.data.publicIP })
        });
      } else {
        setMessage({
          type: 'error',
          text: t('settings.publicIpDetectFailed')
        });
      }
    } catch (error) {
      console.error('Error detecting public IP:', error);
      setMessage({
        type: 'error',
        text: t('settings.publicIpDetectError')
      });
    } finally {
      setDetectingPublicIP(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600">{t('settings.subtitle')}</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup & Maintenance */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Wand2 className="w-5 h-5 mr-2 text-primary-600" />
            Setup & Maintenance
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Run the setup wizard to reconfigure your server or manage active sessions.
              </p>

              <button
                onClick={() => navigate('/setup')}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <Wand2 className="w-5 h-5 mr-2" />
                Run Setup Wizard
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate('/sessions/manage')}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Shield className="w-5 h-5 mr-2" />
                Manage Login Sessions
              </button>
              <p className="text-xs text-gray-500 mt-2">
                View and revoke active login sessions from all devices
              </p>
            </div>
          </div>
        </div>

        {/* Streaming Configuration */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('settings.streamingConfig')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">{t('settings.maxConcurrentStreams')}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.max_concurrent_streams?.value || 3}
                onChange={(e) =>
                  updateConfigValue('max_concurrent_streams', e.target.value)
                }
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>1</span>
                <span className="font-medium">
                  {config.max_concurrent_streams?.value || 3}
                </span>
                <span>10</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {config.max_concurrent_streams?.description}
              </p>
            </div>

            <div>
              <label className="label">{t('settings.defaultProtocol')}</label>
              <select
                className="input"
                value={config.default_protocol?.value || 'rtmp'}
                onChange={(e) => updateConfigValue('default_protocol', e.target.value)}
              >
                <option value="rtmp">RTMP</option>
                <option value="srt">SRT</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {config.default_protocol?.description}
              </p>
            </div>

            <div>
              <label className="label">{t('settings.sessionTimeout')}</label>
              <input
                type="number"
                className="input"
                min="60"
                max="3600"
                value={config.session_timeout?.value || 300}
                onChange={(e) => updateConfigValue('session_timeout', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                {config.session_timeout?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('settings.securitySettings')}
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('settings.requireAuth')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {config.require_authentication?.description}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.require_authentication?.value === 'true'}
                  onChange={(e) =>
                    updateConfigValue('require_authentication', e.target.checked)
                  }
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{t('settings.allowRecording')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {config.allow_recording?.description}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.allow_recording?.value === 'true'}
                  onChange={(e) =>
                    updateConfigValue('allow_recording', e.target.checked)
                  }
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Key className="w-5 h-5 mr-2" />
                {t('settings.changePassword')}
              </button>
            </div>
          </div>
        </div>

        {/* Public IP Monitoring */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary-600" />
            Public IP Monitoring
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Automatically monitor your public IP address and get notified when it changes.
          </p>

          {loadingMonitor ? (
            <div className="text-center text-gray-500 py-4">Loading monitor configuration...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Enable IP Monitoring</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Automatically detect when your public IP address changes and show a notification
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={ipMonitorConfig.enabled}
                    onChange={(e) => setIpMonitorConfig({
                      ...ipMonitorConfig,
                      enabled: e.target.checked
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {ipMonitorConfig.enabled && (
                <div className="pl-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="86400"
                    value={ipMonitorConfig.interval_seconds}
                    onChange={(e) => setIpMonitorConfig({
                      ...ipMonitorConfig,
                      interval_seconds: parseInt(e.target.value)
                    })}
                    className="input w-48"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How often to check for IP changes (300 seconds / 5 minutes recommended)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Network Settings */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Network className="w-5 h-5 mr-2 text-primary-600" />
            {t('settings.networkSettings')}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('settings.qrCodeHelper')}
          </p>

          {loadingNetwork ? (
            <div className="text-center text-gray-500 py-4">{t('settings.loadingInterfaces')}</div>
          ) : (
            <div className="space-y-6">
              {/* IP Detection Mode */}
              <div>
                <label className="label">{t('settings.ipDetection')}</label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="ip_mode"
                      value="auto"
                      checked={networkConfig.server_ip_mode === 'auto'}
                      onChange={(e) => setNetworkConfig({
                        ...networkConfig,
                        server_ip_mode: e.target.value
                      })}
                      className="text-primary-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('settings.autoDetect')}</div>
                      <div className="text-sm text-gray-600">
                        {t('settings.autoDetectDesc')}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="ip_mode"
                      value="manual"
                      checked={networkConfig.server_ip_mode === 'manual'}
                      onChange={(e) => setNetworkConfig({
                        ...networkConfig,
                        server_ip_mode: e.target.value
                      })}
                      className="text-primary-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('settings.manualIp')}</div>
                      <div className="text-sm text-gray-600">
                        {t('settings.manualIpDesc')}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Manual IP Input */}
              {networkConfig.server_ip_mode === 'manual' && (
                <div>
                  <label className="label">{t('settings.lanIp')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('settings.ipPlaceholder')}
                    value={networkConfig.server_ip_address}
                    onChange={(e) => setNetworkConfig({
                      ...networkConfig,
                      server_ip_address: e.target.value
                    })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.lanIpHelper')}
                  </p>
                </div>
              )}

              {/* Public IP */}
              <div>
                <label className="label">{t('settings.publicIp')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder={t('settings.publicIpPlaceholder')}
                    value={networkConfig.server_public_ip}
                    onChange={(e) => setNetworkConfig({
                      ...networkConfig,
                      server_public_ip: e.target.value
                    })}
                  />
                  <button
                    type="button"
                    onClick={handleDetectPublicIP}
                    disabled={detectingPublicIP}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {detectingPublicIP ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t('settings.detecting')}
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        {t('settings.autoDetectButton')}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('settings.publicIpHelper')}
                </p>
              </div>

              {/* Hostname/Domain */}
              <div>
                <label className="label">{t('settings.hostname')}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={t('settings.hostnamePlaceholder')}
                  value={networkConfig.server_hostname}
                  onChange={(e) => setNetworkConfig({
                    ...networkConfig,
                    server_hostname: e.target.value
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('settings.hostnameHelper')}
                </p>
              </div>

              {/* QR Code Mode */}
              <div>
                <label className="label">{t('settings.qrCodeMode')}</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="qr_mode"
                      value="lan"
                      checked={networkConfig.server_qr_mode === 'lan'}
                      onChange={(e) => setNetworkConfig({
                        ...networkConfig,
                        server_qr_mode: e.target.value
                      })}
                      className="text-primary-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('settings.lanMode')}</div>
                      <div className="text-sm text-gray-600">
                        {t('settings.lanModeDesc')}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="qr_mode"
                      value="public"
                      checked={networkConfig.server_qr_mode === 'public'}
                      onChange={(e) => setNetworkConfig({
                        ...networkConfig,
                        server_qr_mode: e.target.value
                      })}
                      className="text-primary-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('settings.publicMode')}</div>
                      <div className="text-sm text-gray-600">
                        {t('settings.publicModeDesc')}
                      </div>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {networkConfig.server_qr_mode === 'public' && networkConfig.server_hostname && (
                    <span className="text-green-600">
                      ✓ QR codes will use: {networkConfig.server_hostname} (hostname)
                    </span>
                  )}
                  {networkConfig.server_qr_mode === 'public' && !networkConfig.server_hostname && networkConfig.server_public_ip && (
                    <span className="text-green-600">
                      ✓ QR codes will use: {networkConfig.server_public_ip} (public IP)
                    </span>
                  )}
                  {networkConfig.server_qr_mode === 'public' && !networkConfig.server_hostname && !networkConfig.server_public_ip && (
                    <span className="text-orange-600">
                      {t('settings.noHostnameWarning')}
                    </span>
                  )}
                  {networkConfig.server_qr_mode === 'lan' && (
                    <span className="text-blue-600">
                      QR codes will use local network IP
                    </span>
                  )}
                </p>
              </div>

              {/* Available Interfaces */}
              <div>
                <label className="label">{t('settings.networkInterfaces')}</label>
                <div className="space-y-2">
                  {networkInterfaces.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
                      {t('settings.noInterfaces')}
                    </div>
                  ) : (
                    networkInterfaces.map((iface, index) => (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg ${
                          iface.type === 'docker'
                            ? 'border-orange-300 bg-orange-50'
                            : iface.priority === 1
                            ? 'border-green-300 bg-green-50'
                            : iface.priority === 2
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                        onClick={() => {
                          if (networkConfig.server_ip_mode === 'manual' && iface.type !== 'docker') {
                            setNetworkConfig({
                              ...networkConfig,
                              server_ip_address: iface.address
                            });
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Wifi className={`w-5 h-5 ${
                              iface.type === 'docker'
                                ? 'text-orange-600'
                                : iface.type === 'ethernet'
                                ? 'text-green-600'
                                : iface.type === 'wifi'
                                ? 'text-blue-600'
                                : 'text-gray-600'
                            }`} />
                            <div>
                              <div className="font-medium text-gray-900">
                                {iface.name}
                                {iface.priority === 1 && iface.type !== 'docker' && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded">
                                    {t('settings.recommended')}
                                  </span>
                                )}
                                {iface.type === 'docker' && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded">
                                    {t('settings.internalOnly')}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="uppercase font-mono">{iface.label || iface.type}</span>
                                {' - '}
                                <span className="font-mono">{iface.address}</span>
                              </div>
                              {iface.type === 'docker' && (
                                <div className="text-xs text-orange-600 mt-1">
                                  {t('settings.dockerWarning')}
                                </div>
                              )}
                            </div>
                          </div>
                          {networkConfig.server_ip_mode === 'manual' && iface.type !== 'docker' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNetworkConfig({
                                  ...networkConfig,
                                  server_ip_address: iface.address
                                });
                              }}
                              className="text-xs px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
                            >
                              {t('settings.useThisIp')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {networkConfig.server_ip_mode === 'auto'
                    ? t('settings.priorityHelper')
                    : t('settings.interfaceHelper')
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? t('settings.saving') : t('settings.saveChanges')}
        </button>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal
          required={false}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
}
