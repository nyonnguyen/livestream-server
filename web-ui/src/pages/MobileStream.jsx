import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Check, Smartphone, Video } from 'lucide-react';

export default function MobileStream() {
  const { streamKey } = useParams();
  const [stream, setStream] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverIp, setServerIp] = useState(window.location.hostname);

  // Generate URLs based on stream protocol
  const streamProtocol = stream?.protocol || 'rtmp';
  const rtmpUrl = `rtmp://${serverIp}:1935/live/${streamKey}`;
  const srtPublishUrl = `srt://${serverIp}:1935?streamid=#!::r=${streamKey},m=publish`;
  const srtPlayUrl = `srt://${serverIp}:1935?streamid=#!::r=${streamKey},m=request`;
  const playbackUrl = `http://${serverIp}:8080/live/${streamKey}.flv`;

  // Determine which URL to auto-copy based on protocol
  const primaryUrl = streamProtocol === 'srt' ? srtPublishUrl : rtmpUrl;

  useEffect(() => {
    // Fetch server IP first
    fetchServerIP().then(() => {
      // Auto-copy to clipboard on page load
      copyToClipboard();
    });

    // Fetch stream info (without authentication)
    fetchStreamInfo();
  }, [streamKey]);

  const fetchServerIP = async () => {
    try {
      const response = await fetch('/api/network/server-ip');
      const data = await response.json();
      if (data.success && data.data.ip) {
        setServerIp(data.data.ip);
      } else {
        // Fallback to hostname if no LAN IP found
        setServerIp(window.location.hostname);
      }
    } catch (error) {
      console.error('Error fetching server IP:', error);
      // Fallback to hostname
      setServerIp(window.location.hostname);
    }
  };

  const fetchStreamInfo = async () => {
    try {
      const response = await fetch('/api/streams');
      const data = await response.json();

      if (data.success) {
        const foundStream = data.data.find(s => s.stream_key === streamKey);
        if (foundStream) {
          setStream(foundStream);
        } else {
          setError('Stream not found');
        }
      }
    } catch (err) {
      console.error('Error fetching stream:', err);
      // Don't show error, just use stream key
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (url = primaryUrl) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Smartphone className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Stream Connection
          </h1>
          {stream && (
            <p className="text-gray-600">{stream.name}</p>
          )}
        </div>

        {/* Auto-copy success message */}
        <div className={`mb-6 p-4 rounded-lg border-2 transition-all ${
          copied
            ? 'bg-green-50 border-green-300'
            : 'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-center justify-center mb-2">
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-semibold text-green-800">
                  Copied to Clipboard!
                </span>
              </>
            ) : (
              <span className="font-semibold text-blue-800">
                Ready to Copy
              </span>
            )}
          </div>
          <p className="text-sm text-center text-gray-600">
            {copied
              ? `${streamProtocol === 'srt' ? 'SRT' : 'RTMP'} URL has been copied. Paste it in your streaming app!`
              : `Click the copy button below to get the ${streamProtocol === 'srt' ? 'SRT' : 'RTMP'} URL`
            }
          </p>
        </div>

        {/* RTMP URL - show when protocol is rtmp or both */}
        {(streamProtocol === 'rtmp' || streamProtocol === 'both') && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              RTMP Server URL
            </label>
            <div className="bg-gray-900 rounded-lg p-4 mb-3">
              <code className="text-sm text-green-400 font-mono break-all">
                {rtmpUrl}
              </code>
            </div>
            <button
              onClick={() => copyToClipboard(rtmpUrl)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
            >
              <Copy className="w-5 h-5 mr-2" />
              {copied ? 'Copied!' : 'Copy RTMP URL'}
            </button>
          </div>
        )}

        {/* SRT URLs - show when protocol is srt or both */}
        {(streamProtocol === 'srt' || streamProtocol === 'both') && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                SRT Publish URL
              </label>
              <div className="bg-gray-900 rounded-lg p-4 mb-3">
                <code className="text-sm text-green-400 font-mono break-all">
                  {srtPublishUrl}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(srtPublishUrl)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
              >
                <Copy className="w-5 h-5 mr-2" />
                Copy SRT Publish URL
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                SRT Playback URL
              </label>
              <div className="bg-gray-900 rounded-lg p-4">
                <code className="text-sm text-blue-400 font-mono break-all">
                  {srtPlayUrl}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Video className="w-5 h-5 mr-2 text-blue-600" />
            How to Use:
          </h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Open your streaming app (Larix, OBS, etc.)</li>
            <li>Go to <strong>Settings</strong> → <strong>Add Connection</strong></li>
            <li>Choose <strong>Custom RTMP</strong></li>
            <li><strong>Paste</strong> the URL above</li>
            <li>Start streaming!</li>
          </ol>
        </div>

        {/* Playback URL */}
        <div className="border-t pt-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Watch Stream (Optional)
          </label>
          <div className="bg-gray-50 rounded-lg p-3">
            <code className="text-xs text-gray-700 font-mono break-all">
              {playbackUrl}
            </code>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Use this URL in VLC or web player to watch the stream
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t">
          <p className="text-xs text-gray-500">
            Livestream Server on Raspberry Pi
          </p>
        </div>
      </div>
    </div>
  );
}
