import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  GlobeAltIcon,
  VideoCameraIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SetupWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // Network configuration state
  const [networkConfig, setNetworkConfig] = useState({
    public_ip: '',
    local_ip: '',
    enable_ip_monitoring: true,
    monitor_interval: 300
  });

  // Stream configuration state
  const [streamConfig, setStreamConfig] = useState({
    name: 'My First Stream',
    protocol: 'rtmp',
    port: 1935,
    description: 'Default livestream',
    use_public_ip: true
  });

  const steps = [
    {
      id: 1,
      name: 'Welcome',
      icon: SparklesIcon,
      description: 'Get started with Livestream Server'
    },
    {
      id: 2,
      name: 'Network',
      icon: GlobeAltIcon,
      description: 'Configure network settings'
    },
    {
      id: 3,
      name: 'Stream',
      icon: VideoCameraIcon,
      description: 'Create your first stream'
    },
    {
      id: 4,
      name: 'Complete',
      icon: RocketLaunchIcon,
      description: 'You\'re all set!'
    }
  ];

  const handleDetectNetwork = async () => {
    setDetecting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/network/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNetworkConfig(prev => ({
          ...prev,
          public_ip: data.public_ip || '',
          local_ip: data.local_ip || ''
        }));
      } else {
        alert('Failed to auto-detect network configuration. Please enter manually.');
      }
    } catch (error) {
      console.error('Failed to detect network:', error);
      alert('Failed to auto-detect network configuration. Please enter manually.');
    } finally {
      setDetecting(false);
    }
  };

  const handleSaveNetworkConfig = async () => {
    try {
      const token = localStorage.getItem('token');

      // Save network configuration
      await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          public_ip: networkConfig.public_ip,
          local_ip: networkConfig.local_ip
        })
      });

      // Enable IP monitoring if requested
      if (networkConfig.enable_ip_monitoring) {
        await fetch(`${API_URL}/api/network/monitor-config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            enabled: true,
            check_interval: networkConfig.monitor_interval
          })
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to save network config:', error);
      alert('Failed to save network configuration');
      return false;
    }
  };

  const handleCreateStream = async () => {
    try {
      const token = localStorage.getItem('token');
      const streamData = {
        ...streamConfig,
        ip_address: streamConfig.use_public_ip ? networkConfig.public_ip : networkConfig.local_ip
      };

      const response = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(streamData)
      });

      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        alert(`Failed to create stream: ${error.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to create stream:', error);
      alert('Failed to create stream');
      return false;
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/setup/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        alert('Failed to complete setup');
      }
    } catch (error) {
      console.error('Failed to complete setup:', error);
      alert('Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 2) {
      // Save network config before proceeding
      const success = await handleSaveNetworkConfig();
      if (!success) return;
    } else if (currentStep === 3) {
      // Create stream before proceeding
      const success = await handleCreateStream();
      if (!success) return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    if (confirm('Are you sure you want to skip the setup wizard? You can access it later from Settings.')) {
      await handleComplete();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Setup Wizard</h1>
          <p className="mt-2 text-blue-100">
            Let's get your Livestream Server configured in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, idx) => (
                <li key={step.id} className={`relative ${idx !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
                  <div className="flex items-center">
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          currentStep > step.id
                            ? 'bg-green-600'
                            : currentStep === step.id
                            ? 'bg-blue-600 ring-4 ring-blue-200'
                            : 'bg-gray-300'
                        } transition-all duration-300`}
                      >
                        {currentStep > step.id ? (
                          <CheckIcon className="h-6 w-6 text-white" />
                        ) : (
                          <step.icon className="h-5 w-5 text-white" />
                        )}
                      </div>
                      {idx !== steps.length - 1 && (
                        <div
                          className={`absolute top-5 left-10 w-full h-0.5 ${
                            currentStep > step.id ? 'bg-green-600' : 'bg-gray-300'
                          } transition-all duration-300`}
                          style={{ width: 'calc(100% + 2rem)' }}
                        />
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <p
                        className={`text-sm font-medium ${
                          currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {step.name}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Step Content */}
        <div className="px-8 py-8 min-h-[400px]">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center">
              <SparklesIcon className="mx-auto h-20 w-20 text-blue-600 mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Livestream Server!
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                This wizard will help you set up your livestream server in just a few minutes.
                We'll configure your network settings and create your first stream.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
                <div className="p-6 bg-blue-50 rounded-lg">
                  <GlobeAltIcon className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Network Setup</h3>
                  <p className="text-sm text-gray-600">Auto-detect your IP addresses and configure monitoring</p>
                </div>
                <div className="p-6 bg-purple-50 rounded-lg">
                  <VideoCameraIcon className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Create Stream</h3>
                  <p className="text-sm text-gray-600">Set up your first livestream with default settings</p>
                </div>
                <div className="p-6 bg-green-50 rounded-lg">
                  <RocketLaunchIcon className="h-10 w-10 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">You're Ready!</h3>
                  <p className="text-sm text-gray-600">Start streaming immediately after setup</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Network Configuration */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Network Configuration</h2>
              <p className="text-gray-600 mb-6">
                Configure your network settings. We can auto-detect your IP addresses or you can enter them manually.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <button
                  onClick={handleDetectNetwork}
                  disabled={detecting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {detecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Detecting...
                    </>
                  ) : (
                    <>
                      <GlobeAltIcon className="h-4 w-4 mr-2" />
                      Auto-Detect Network
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Public IP Address
                  </label>
                  <input
                    type="text"
                    value={networkConfig.public_ip}
                    onChange={(e) => setNetworkConfig({ ...networkConfig, public_ip: e.target.value })}
                    placeholder="Auto-detect or enter manually"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your public IP address visible to the internet
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local IP Address
                  </label>
                  <input
                    type="text"
                    value={networkConfig.local_ip}
                    onChange={(e) => setNetworkConfig({ ...networkConfig, local_ip: e.target.value })}
                    placeholder="Auto-detect or enter manually"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your local network IP address
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="enable_monitoring"
                        type="checkbox"
                        checked={networkConfig.enable_ip_monitoring}
                        onChange={(e) => setNetworkConfig({ ...networkConfig, enable_ip_monitoring: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="enable_monitoring" className="font-medium text-gray-700">
                        Enable IP Monitoring
                      </label>
                      <p className="text-sm text-gray-500">
                        Automatically detect when your public IP changes and notify you
                      </p>
                    </div>
                  </div>

                  {networkConfig.enable_ip_monitoring && (
                    <div className="mt-4 ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Check Interval (seconds)
                      </label>
                      <input
                        type="number"
                        min="60"
                        max="86400"
                        value={networkConfig.monitor_interval}
                        onChange={(e) => setNetworkConfig({ ...networkConfig, monitor_interval: parseInt(e.target.value) })}
                        className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        How often to check for IP changes (300 seconds recommended)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Stream Setup */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Stream</h2>
              <p className="text-gray-600 mb-6">
                Set up your first livestream. You can always modify these settings or create more streams later.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stream Name *
                  </label>
                  <input
                    type="text"
                    value={streamConfig.name}
                    onChange={(e) => setStreamConfig({ ...streamConfig, name: e.target.value })}
                    placeholder="My First Stream"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protocol
                  </label>
                  <select
                    value={streamConfig.protocol}
                    onChange={(e) => setStreamConfig({ ...streamConfig, protocol: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="rtmp">RTMP</option>
                    <option value="rtsp">RTSP</option>
                    <option value="hls">HLS</option>
                    <option value="webrtc">WebRTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={streamConfig.port}
                    onChange={(e) => setStreamConfig({ ...streamConfig, port: parseInt(e.target.value) })}
                    min="1"
                    max="65535"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={streamConfig.description}
                    onChange={(e) => setStreamConfig({ ...streamConfig, description: e.target.value })}
                    rows={3}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="use_public_ip"
                      type="checkbox"
                      checked={streamConfig.use_public_ip}
                      onChange={(e) => setStreamConfig({ ...streamConfig, use_public_ip: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="use_public_ip" className="font-medium text-gray-700">
                      Use Public IP Address
                    </label>
                    <p className="text-sm text-gray-500">
                      {streamConfig.use_public_ip
                        ? `Stream will use public IP: ${networkConfig.public_ip || 'Not set'}`
                        : `Stream will use local IP: ${networkConfig.local_ip || 'Not set'}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
                  <CheckIcon className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                You're All Set!
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Your Livestream Server is now configured and ready to use.
                You can start streaming right away!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What's Next?</h3>
                <ul className="text-left space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>View your dashboard to see server status and stream statistics</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Manage your streams and create additional ones from the Streams page</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Configure additional settings in the Settings page</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>You can re-run this wizard anytime from Settings</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {currentStep > 1 && currentStep < 4 && (
              <button
                onClick={handlePrevious}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Previous
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            {currentStep < 4 && (
              <button
                onClick={handleSkip}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Skip Setup
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                'Processing...'
              ) : currentStep === 4 ? (
                'Go to Dashboard'
              ) : (
                <>
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
