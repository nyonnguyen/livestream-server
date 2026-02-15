import { useState, useEffect } from 'react';
import { configAPI } from '../services/api';
import { Save, Key, Wifi, Network, Globe, RefreshCw } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';
import axios from 'axios';

export default function Settings() {
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

  useEffect(() => {
    fetchConfig();
    fetchNetworkInterfaces();
    fetchNetworkConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await configAPI.get();
      setConfig(response.data.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkInterfaces = async () => {
    try {
      const response = await axios.get('/api/network/interfaces');
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
      const response = await axios.get('/api/network/config');
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
    } finally {
      setLoadingNetwork(false);
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
      await axios.put('/api/network/config', networkConfig);

      setMessage({
        type: 'success',
        text: 'Settings saved successfully! Network IP changes will apply to QR codes immediately when you reopen them.'
      });
      fetchConfig();
      fetchNetworkConfig();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save settings',
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
      const response = await axios.get('/api/network/detect-public-ip');
      if (response.data.success && response.data.data.publicIP) {
        setNetworkConfig({
          ...networkConfig,
          server_public_ip: response.data.data.publicIP
        });
        setMessage({
          type: 'success',
          text: `Public IP detected: ${response.data.data.publicIP}`
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Could not detect public IP. Please enter manually.'
        });
      }
    } catch (error) {
      console.error('Error detecting public IP:', error);
      setMessage({
        type: 'error',
        text: 'Failed to detect public IP. Please check your internet connection.'
      });
    } finally {
      setDetectingPublicIP(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure system settings</p>
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
        {/* Streaming Configuration */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Streaming Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">Max Concurrent Streams</label>
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
              <label className="label">Default Protocol</label>
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
              <label className="label">Session Timeout (seconds)</label>
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
            Security Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Require Authentication
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
                <p className="text-sm font-medium text-gray-900">Allow Recording</p>
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
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Network Settings */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Network className="w-5 h-5 mr-2 text-primary-600" />
            Network Settings
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure the IP address used for QR codes and mobile device connections.
            The system will use LAN addresses only (192.168.x.x, 10.x.x.x) and filter out loopback (127.x.x.x) and Docker internal IPs.
          </p>

          {loadingNetwork ? (
            <div className="text-center text-gray-500 py-4">Loading network interfaces...</div>
          ) : (
            <div className="space-y-6">
              {/* IP Detection Mode */}
              <div>
                <label className="label">IP Address Detection</label>
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
                      <div className="font-medium text-gray-900">Auto-detect (Recommended)</div>
                      <div className="text-sm text-gray-600">
                        Automatically use LAN (Ethernet) first, then WiFi
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
                      <div className="font-medium text-gray-900">Manual IP Address</div>
                      <div className="text-sm text-gray-600">
                        Specify a custom IP address
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Manual IP Input */}
              {networkConfig.server_ip_mode === 'manual' && (
                <div>
                  <label className="label">LAN IP Address</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="192.168.1.100"
                    value={networkConfig.server_ip_address}
                    onChange={(e) => setNetworkConfig({
                      ...networkConfig,
                      server_ip_address: e.target.value
                    })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Local network IP address for devices on the same network
                  </p>
                </div>
              )}

              {/* Public IP */}
              <div>
                <label className="label">Public IP (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="123.45.67.89"
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
                        Detecting...
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        Auto-Detect
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your public IP address for remote/internet access. Click Auto-Detect to find it automatically.
                </p>
              </div>

              {/* Hostname/Domain */}
              <div>
                <label className="label">Hostname / Domain (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="stream.example.com"
                  value={networkConfig.server_hostname}
                  onChange={(e) => setNetworkConfig({
                    ...networkConfig,
                    server_hostname: e.target.value
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your domain name if you have one. This takes priority over public IP when set.
                </p>
              </div>

              {/* QR Code Mode */}
              <div>
                <label className="label">QR Code Address Mode</label>
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
                      <div className="font-medium text-gray-900">LAN IP (Local Network)</div>
                      <div className="text-sm text-gray-600">
                        QR codes use local IP - for devices on same WiFi
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
                      <div className="font-medium text-gray-900">Public IP/Domain (Internet)</div>
                      <div className="text-sm text-gray-600">
                        QR codes use public IP - for remote access via internet
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
                      ⚠️ No hostname or public IP set - will fallback to LAN IP
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
                <label className="label">Available Network Interfaces</label>
                <div className="space-y-2">
                  {networkInterfaces.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
                      No network interfaces detected
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
                                    Recommended
                                  </span>
                                )}
                                {iface.type === 'docker' && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded">
                                    Internal Only
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
                                  ⚠️ Docker container IP - not accessible from other devices
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
                              Use This IP
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {networkConfig.server_ip_mode === 'auto'
                    ? 'The system will use the highest priority interface (Ethernet > WiFi)'
                    : 'Click "Use This IP" to select an interface, or type a custom IP above'
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
          {saving ? 'Saving...' : 'Save Changes'}
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
