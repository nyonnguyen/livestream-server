import { useState, useEffect } from 'react';
import { X, Smartphone, Download, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeModal({ stream, onClose }) {
  const [lanIp, setLanIp] = useState(window.location.hostname);
  const [publicIp, setPublicIp] = useState(null);
  const [hostname, setHostname] = useState(null);
  const [selectedMode, setSelectedMode] = useState('lan');
  const [defaultMode, setDefaultMode] = useState('lan');

  useEffect(() => {
    fetchNetworkConfig();
  }, []);

  const fetchNetworkConfig = async () => {
    try {
      // Get network configuration
      const configResponse = await fetch('/api/network/config');
      const configData = await configResponse.json();

      if (configData.success) {
        const config = configData.data;

        // Get LAN IP
        const serverIpResponse = await fetch('/api/network/server-ip');
        const serverIpData = await serverIpResponse.json();
        if (serverIpData.success && serverIpData.data.ip) {
          setLanIp(serverIpData.data.ip);
        }

        // Get public IP and hostname from config
        if (config.server_public_ip) {
          setPublicIp(config.server_public_ip);
        }
        if (config.server_hostname) {
          setHostname(config.server_hostname);
        }

        // Set default mode based on QR mode setting
        const mode = config.server_qr_mode || 'lan';
        setDefaultMode(mode);
        setSelectedMode(mode);
      }
    } catch (error) {
      console.error('Error fetching network config:', error);
      setLanIp(window.location.hostname);
    }
  };

  if (!stream) return null;

  // Determine which IP to use based on selected mode
  const getActiveIp = () => {
    if (selectedMode === 'public') {
      // Priority: hostname > public IP > LAN IP (fallback)
      return hostname || publicIp || lanIp;
    }
    return lanIp;
  };

  const activeIp = getActiveIp();
  const hasPublicConfig = !!(hostname || publicIp);

  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;

  // Mobile-friendly web URL that auto-copies URL to clipboard
  const mobileUrl = `${protocol}//${activeIp}${port}/mobile/${stream.stream_key}`;

  // Generate URLs based on stream protocol
  const streamProtocol = stream.protocol || 'rtmp';
  const rtmpUrl = `rtmp://${activeIp}:1935/live/${stream.stream_key}`;
  const srtPublishUrl = `srt://${activeIp}:1935?streamid=#!::r=${stream.stream_key},m=publish`;
  const srtPlayUrl = `srt://${activeIp}:1935?streamid=#!::r=${stream.stream_key},m=request`;
  const playbackUrl = `http://${activeIp}:8080/live/${stream.stream_key}.flv`;

  const copyToClipboard = async (text, label) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        alert(`${label} copied to clipboard!`);
      } else {
        // Fallback to textarea method
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          alert(`${label} copied to clipboard!`);
        } else {
          alert('Failed to copy. Please copy manually.');
        }
      }
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy. Please copy manually.');
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `${stream.name.replace(/\s+/g, '_')}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Smartphone className="w-6 h-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Mobile App QR Code</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="mb-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedMode('lan')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedMode === 'lan'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏠 Local Network
            </button>
            <button
              onClick={() => setSelectedMode('public')}
              disabled={!hasPublicConfig}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedMode === 'public'
                  ? 'bg-white text-green-700 shadow-sm'
                  : hasPublicConfig
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title={!hasPublicConfig ? 'Configure public IP or hostname in Settings first' : ''}
            >
              🌐 Public Access
            </button>
          </div>
          {!hasPublicConfig && (
            <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              ⚠️ Public access not configured. Go to Settings → Network to set your public IP or hostname.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
              <QRCodeSVG
                id="qr-code-svg"
                value={mobileUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-600">
                Scan with phone camera to auto-copy {streamProtocol === 'srt' ? 'SRT' : 'RTMP'} URL
              </p>
              <div className="flex flex-col items-center gap-2">
                <div className="flex justify-center">
                  {selectedMode === 'public' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      🌐 Public IP Mode
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                      🏠 LAN IP Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  Using: {activeIp}
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadQR}
              className="btn-secondary flex items-center text-sm mt-2"
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </button>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {stream.name}
            </h3>

            <div className="space-y-4">
              {/* RTMP URL - show when protocol is rtmp or both */}
              {(streamProtocol === 'rtmp' || streamProtocol === 'both') && (
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    RTMP URL
                  </label>
                  <div className="mt-1 flex gap-2">
                    <div className="flex-1 p-2 bg-gray-50 rounded text-sm font-mono break-all">
                      {rtmpUrl}
                    </div>
                    <button
                      onClick={() => copyToClipboard(rtmpUrl, 'RTMP URL')}
                      className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                      title="Copy RTMP URL"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-xs">Copy</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SRT Publish URL - show when protocol is srt or both */}
              {(streamProtocol === 'srt' || streamProtocol === 'both') && (
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    SRT Publish URL
                  </label>
                  <div className="mt-1 flex gap-2">
                    <div className="flex-1 p-2 bg-gray-50 rounded text-sm font-mono break-all">
                      {srtPublishUrl}
                    </div>
                    <button
                      onClick={() => copyToClipboard(srtPublishUrl, 'SRT Publish URL')}
                      className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                      title="Copy SRT Publish URL"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-xs">Copy</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SRT Playback URL - show when protocol is srt or both */}
              {(streamProtocol === 'srt' || streamProtocol === 'both') && (
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    SRT Playback URL
                  </label>
                  <div className="mt-1 flex gap-2">
                    <div className="flex-1 p-2 bg-gray-50 rounded text-sm font-mono break-all">
                      {srtPlayUrl}
                    </div>
                    <button
                      onClick={() => copyToClipboard(srtPlayUrl, 'SRT Playback URL')}
                      className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                      title="Copy SRT Playback URL"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-xs">Copy</span>
                    </button>
                  </div>
                </div>
              )}

              {/* HTTP-FLV Playback URL - always show */}
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  HTTP-FLV Playback URL
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="flex-1 p-2 bg-gray-50 rounded text-sm font-mono break-all">
                    {playbackUrl}
                  </div>
                  <button
                    onClick={() => copyToClipboard(playbackUrl, 'Playback URL')}
                    className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                    title="Copy Playback URL"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">
                  📱 Two ways to use the QR code:
                </h4>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <p className="font-semibold mb-1">Option 1: Phone Camera (Easiest)</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open phone camera and scan QR code</li>
                      <li>Tap the notification to open the link</li>
                      <li>RTMP URL auto-copies to clipboard</li>
                      <li>Paste in your streaming app</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Option 2: Streaming App Scanner</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open Larix/prism/other streaming app</li>
                      <li>Go to Settings → Scan QR Code</li>
                      <li>Scan the QR code above</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Manual Setup */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                  ⚙️ Manual setup (if QR doesn't work):
                </h4>
                <div className="text-sm text-gray-700 space-y-1">
                  {(streamProtocol === 'rtmp' || streamProtocol === 'both') && (
                    <>
                      <p><strong>RTMP Server:</strong> rtmp://{activeIp}:1935/live</p>
                      <p><strong>Stream Key:</strong> {stream.stream_key}</p>
                    </>
                  )}
                  {(streamProtocol === 'srt' || streamProtocol === 'both') && streamProtocol !== 'rtmp' && (
                    <>
                      <p><strong>SRT URL:</strong> srt://{activeIp}:1935</p>
                      <p><strong>Stream ID:</strong> #!::r={stream.stream_key},m=publish</p>
                    </>
                  )}
                </div>
              </div>

              {/* Supported Apps */}
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">
                  Supported Apps
                </label>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Larix Broadcaster
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    prism live studio
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    CameraFi Live
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Streamlabs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
