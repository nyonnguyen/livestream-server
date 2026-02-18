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

        {/* Simplified centered layout */}
        <div className="flex flex-col items-center text-center">
          {/* Stream Name */}
          <h3 className="text-2xl font-bold text-gray-900 mb-4">{stream.name}</h3>

          {/* QR Code */}
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-4">
            <QRCodeSVG
              id="qr-code-svg"
              value={mobileUrl}
              size={240}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Mode indicator */}
          <div className="mb-4">
            {selectedMode === 'public' ? (
              <span className="px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                🌐 Using: {activeIp}
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                🏠 Using: {activeIp}
              </span>
            )}
          </div>

          {/* Simple instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mb-4">
            <p className="font-semibold text-blue-900 mb-2">📱 How to use:</p>
            <ol className="text-sm text-blue-800 text-left space-y-1">
              <li>1. Scan QR code with phone camera</li>
              <li>2. Tap the notification</li>
              <li>3. URL auto-copies to clipboard</li>
              <li>4. Paste in streaming app (Larix, prism, etc.)</li>
            </ol>
          </div>

          {/* Primary URL with large copy button */}
          <div className="w-full max-w-2xl mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {streamProtocol === 'srt' ? 'SRT Publish URL:' : 'RTMP URL:'}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-gray-100 rounded-lg border border-gray-300">
                <p className="text-base font-mono break-all text-gray-900">
                  {streamProtocol === 'srt' ? srtPublishUrl : rtmpUrl}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(
                  streamProtocol === 'srt' ? srtPublishUrl : rtmpUrl,
                  streamProtocol === 'srt' ? 'SRT URL' : 'RTMP URL'
                )}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 whitespace-nowrap"
              >
                <Copy className="w-5 h-5" />
                Copy
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownloadQR}
              className="btn-secondary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </button>

            {/* Show more details toggle */}
            <details className="inline-block">
              <summary className="btn-secondary cursor-pointer">
                More Info
              </summary>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-left max-w-2xl">
                <div className="space-y-3">
                  {/* All URLs */}
                  {(streamProtocol === 'rtmp' || streamProtocol === 'both') && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700">RTMP URL:</p>
                      <p className="text-xs font-mono text-gray-600 break-all">{rtmpUrl}</p>
                    </div>
                  )}
                  {(streamProtocol === 'srt' || streamProtocol === 'both') && (
                    <>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">SRT Publish:</p>
                        <p className="text-xs font-mono text-gray-600 break-all">{srtPublishUrl}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">SRT Playback:</p>
                        <p className="text-xs font-mono text-gray-600 break-all">{srtPlayUrl}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-700">HTTP-FLV Playback:</p>
                    <p className="text-xs font-mono text-gray-600 break-all">{playbackUrl}</p>
                  </div>

                  {/* Manual Setup */}
                  <div className="pt-3 border-t border-gray-300">
                    <p className="text-xs font-semibold text-gray-700 mb-2">⚙️ Manual Setup:</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      {(streamProtocol === 'rtmp' || streamProtocol === 'both') && (
                        <>
                          <p><strong>Server:</strong> rtmp://{activeIp}:1935/live</p>
                          <p><strong>Key:</strong> {stream.stream_key}</p>
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
                </div>
              </div>
            </details>
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
