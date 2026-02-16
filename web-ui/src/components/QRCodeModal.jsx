import { useState, useEffect } from 'react';
import { X, Smartphone, Download, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeModal({ stream, onClose }) {
  const [serverIp, setServerIp] = useState(window.location.hostname);
  const [qrMode, setQrMode] = useState('lan');

  useEffect(() => {
    fetchQRIP();
  }, []);

  const fetchQRIP = async () => {
    try {
      // Use QR IP endpoint which respects the QR mode setting
      const response = await fetch('/api/network/qr-ip');
      const data = await response.json();
      if (data.success && data.data.ip) {
        setServerIp(data.data.ip);
        setQrMode(data.data.mode);
      } else {
        // Fallback to hostname if no IP found
        setServerIp(window.location.hostname);
      }
    } catch (error) {
      console.error('Error fetching QR IP:', error);
      // Fallback to hostname
      setServerIp(window.location.hostname);
    }
  };

  if (!stream) return null;

  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;

  // Mobile-friendly web URL that auto-copies RTMP to clipboard
  const mobileUrl = `${protocol}//${serverIp}${port}/mobile/${stream.stream_key}`;

  // Direct RTMP URL for manual entry
  const rtmpUrl = `rtmp://${serverIp}:1935/live/${stream.stream_key}`;
  const playbackUrl = `http://${serverIp}:8080/live/${stream.stream_key}.flv`;

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

  const copyToClipboard = async (text, label) => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        alert(`${label} copied to clipboard!`);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
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
      console.error('Failed to copy:', err);
      alert('Failed to copy. Please copy manually.');
    }
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
                Scan with phone camera to auto-copy RTMP URL
              </p>
              <div className="flex justify-center">
                {qrMode === 'public' ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                    🌐 Public IP Mode
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    🏠 LAN IP Mode
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleDownloadQR}
              className="btn-secondary flex items-center text-sm"
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
              {/* Stream URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    RTMP URL
                  </label>
                  <button
                    onClick={() => copyToClipboard(rtmpUrl, 'RTMP URL')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono break-all">
                  {rtmpUrl}
                </div>
              </div>

              {/* Playback URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Playback URL
                  </label>
                  <button
                    onClick={() => copyToClipboard(playbackUrl, 'Playback URL')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono break-all">
                  {playbackUrl}
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
                  <p><strong>Server:</strong> rtmp://{serverIp}:1935/live</p>
                  <p><strong>Stream Key:</strong> {stream.stream_key}</p>
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
