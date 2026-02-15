import { useState } from 'react';
import {
  HelpCircle,
  Video,
  Upload,
  Eye,
  Settings,
  Network,
  ChevronDown,
  ChevronUp,
  Play,
  Copy,
  Key,
} from 'lucide-react';

export default function Help() {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const Section = ({ id, title, icon: Icon, children }) => {
    const isOpen = openSection === id;

    return (
      <div className="card mb-4">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-10 h-10" />
          <h1 className="text-3xl font-bold">Help & User Guide</h1>
        </div>
        <p className="text-indigo-100">
          Learn how to use Nyon Livestream Server for low-latency streaming
        </p>
      </div>

      {/* Quick Start */}
      <div className="card mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <h2 className="text-xl font-bold mb-3 text-green-900">Quick Start</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li className="font-medium">Create a stream in the Streams tab</li>
          <li className="font-medium">Copy the RTMP or SRT URL</li>
          <li className="font-medium">Configure your streaming software (OBS, etc.)</li>
          <li className="font-medium">Start streaming and watch it live in the dashboard</li>
        </ol>
      </div>

      {/* Main Sections */}
      <Section id="streams" title="Managing Streams" icon={Video}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Creating a New Stream</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Navigate to the <strong>Streams</strong> tab</li>
            <li>Click the <strong>"Add Stream"</strong> button</li>
            <li>Fill in the stream details:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li><strong>Stream Name:</strong> A descriptive name (e.g., "Drone Camera 1")</li>
                <li><strong>Stream Key:</strong> Click "Generate" for a secure random key, enter a custom key, or leave blank to auto-generate</li>
                <li><strong>Description:</strong> Optional notes about the stream</li>
                <li><strong>Protocol:</strong> Choose RTMP, SRT, or RTMP + SRT</li>
                <li><strong>Max Bitrate:</strong> Maximum allowed bitrate (recommended: 2500-5000 kbps for 1080p)</li>
              </ul>
            </li>
            <li>Click <strong>"Create"</strong></li>
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Editing Streams</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Click the <strong>pencil icon</strong> on any stream card</li>
            <li>Modify any field including the stream key</li>
            <li>
              <strong>Warning:</strong> Changing the stream key will invalidate existing URLs.
              Active streams will be disconnected.
            </li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Deleting Streams</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Click the <strong>trash icon</strong> on the stream card</li>
            <li>Confirm deletion</li>
            <li>All active sessions will be terminated</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Regenerating Stream Keys</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Click the <strong>key icon</strong> to generate a new random stream key</li>
            <li>Useful if you suspect your stream key has been compromised</li>
            <li>Update your streaming software with the new key</li>
          </ul>
        </div>
      </Section>

      <Section id="publish" title="Publishing Streams" icon={Upload}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Getting Stream URLs</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Expand a stream by clicking on it</li>
            <li>You'll see URLs for both <strong>LAN</strong> and <strong>Public</strong> access</li>
            <li>Click the <Copy className="w-3 h-3 inline" /> copy icon to copy any URL</li>
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Using OBS Studio</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Open OBS Studio</li>
            <li>Go to <strong>Settings → Stream</strong></li>
            <li>Select <strong>"Custom"</strong> as service</li>
            <li>
              <strong>For RTMP:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li><strong>Server:</strong> <code className="bg-gray-100 px-2 py-1 rounded">rtmp://YOUR_IP:1935/live</code></li>
                <li><strong>Stream Key:</strong> Your stream key from the dashboard</li>
              </ul>
            </li>
            <li>
              <strong>For SRT:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li><strong>Server:</strong> <code className="bg-gray-100 px-2 py-1 rounded">srt://YOUR_IP:10080?streamid=YOUR_KEY</code></li>
              </ul>
            </li>
            <li>Click <strong>"Start Streaming"</strong></li>
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Using FFmpeg (Advanced)</h3>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
            <p className="text-sm text-gray-400 mb-2"># RTMP Example</p>
            <code className="text-sm">
              ffmpeg -i input.mp4 -c:v libx264 -preset ultrafast \<br />
              &nbsp;&nbsp;-b:v 3000k -c:a aac -f flv \<br />
              &nbsp;&nbsp;rtmp://YOUR_IP:1935/live/YOUR_KEY
            </code>
            <p className="text-sm text-gray-400 mt-4 mb-2"># SRT Example</p>
            <code className="text-sm">
              ffmpeg -i input.mp4 -c:v libx264 -preset ultrafast \<br />
              &nbsp;&nbsp;-b:v 3000k -c:a aac -f mpegts \<br />
              &nbsp;&nbsp;"srt://YOUR_IP:10080?streamid=YOUR_KEY"
            </code>
          </div>
        </div>

        <div className="border-t pt-4 bg-yellow-50 -mx-4 -mb-4 p-4 rounded-b-lg">
          <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Recommended Encoding Settings
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 text-sm">
            <li><strong>Video Codec:</strong> H.264 (x264)</li>
            <li><strong>Rate Control:</strong> CBR (Constant Bitrate)</li>
            <li><strong>Keyframe Interval:</strong> 2 seconds</li>
            <li><strong>Bitrate:</strong> 2500-5000 kbps for 1080p, 1500-3000 kbps for 720p</li>
            <li><strong>Audio Codec:</strong> AAC, 128-160 kbps, 48kHz</li>
          </ul>
        </div>
      </Section>

      <Section id="watch" title="Watching Streams" icon={Eye}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">In-Dashboard Playback</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>When a stream is live, you'll see a <strong>green "LIVE"</strong> badge</li>
            <li>Click the <Play className="w-3 h-3 inline" /> <strong>"Watch Live"</strong> button</li>
            <li>The stream will expand and auto-scroll to the video player</li>
            <li>Use video controls to play/pause, adjust volume, or fullscreen</li>
            <li>Typical latency: <strong>0.5-1.5 seconds</strong></li>
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Using VLC Media Player</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Open VLC</li>
            <li>Go to <strong>Media → Open Network Stream</strong></li>
            <li>Copy the <strong>HTTP-FLV</strong> playback URL from dashboard</li>
            <li>Paste it: <code className="bg-gray-100 px-2 py-1 rounded">http://YOUR_IP:8080/live/YOUR_KEY.flv</code></li>
            <li>Click <strong>"Play"</strong></li>
            <li>
              <strong>Tip:</strong> In VLC settings, reduce network caching to 50-100ms for lower latency
            </li>
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Using OBS for Restreaming</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Add a new <strong>Media Source</strong></li>
            <li>Enter the HTTP-FLV playback URL</li>
            <li>Check <strong>"Restart playback when source becomes active"</strong></li>
            <li>You can now restream to YouTube, Twitch, etc.</li>
          </ol>
        </div>
      </Section>

      <Section id="sessions" title="Monitoring Sessions" icon={Network}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Active Sessions</h3>
          <p className="text-gray-700 mb-3">
            The <strong>Sessions</strong> tab shows all active streaming connections in real-time.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Stream Name:</strong> Which stream is being published</li>
            <li><strong>Client ID:</strong> Unique identifier for the connection</li>
            <li><strong>IP Address:</strong> Source IP of the publisher</li>
            <li><strong>Protocol:</strong> RTMP or SRT</li>
            <li><strong>Duration:</strong> How long the stream has been active</li>
            <li><strong>Bitrate:</strong> Current streaming bitrate</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Disconnecting Sessions</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Click the <strong>red X icon</strong> next to any session</li>
            <li>The publisher will be disconnected immediately</li>
            <li>Useful for ending unwanted or unauthorized streams</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Dashboard Stats</h3>
          <p className="text-gray-700">
            The main <strong>Dashboard</strong> shows:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mt-2">
            <li>Total active streams</li>
            <li>System CPU usage</li>
            <li>System memory usage</li>
            <li>Server uptime</li>
          </ul>
        </div>
      </Section>

      <Section id="settings" title="Settings & Configuration" icon={Settings}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Changing Password</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Go to <strong>Settings</strong> tab</li>
            <li>Enter your current password</li>
            <li>Enter your new password</li>
            <li>Confirm the new password</li>
            <li>Click <strong>"Update Password"</strong></li>
            <li>You'll be logged out and need to log in with the new password</li>
          </ol>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Network Configuration</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>The server automatically detects your <strong>LAN IP</strong></li>
            <li>Configure <strong>Public IP/Domain</strong> for external access</li>
            <li>All stream URLs will show both LAN and Public variants</li>
            <li>Use LAN URLs for local network, Public URLs for internet access</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Stream Key Security</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 font-medium mb-2">Best Practices:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-4">
              <li>Never share stream keys publicly</li>
              <li>Use auto-generated keys for better security</li>
              <li>Regenerate keys if you suspect they've been compromised</li>
              <li>Disable streams when not in use</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="troubleshooting" title="Troubleshooting" icon={HelpCircle}>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Stream Won't Connect</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Verify the stream URL and key are correct</li>
            <li>Check that the stream is <strong>Active</strong> (not disabled)</li>
            <li>Ensure firewall allows connections on ports 1935 (RTMP) and 10080 (SRT)</li>
            <li>Try using LAN IP instead of Public IP if on same network</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">High Latency / Buffering</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Reduce bitrate in your encoder (OBS, FFmpeg)</li>
            <li>Use wired ethernet instead of WiFi if possible</li>
            <li>Check network bandwidth is sufficient</li>
            <li>SRT typically has lower latency than RTMP</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Video Player Shows Black Screen</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)</li>
            <li>Verify the stream is actually publishing (check Sessions tab)</li>
            <li>Try opening the HTTP-FLV URL directly in VLC to test</li>
            <li>Check browser console for errors (F12 → Console)</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Copy Buttons Not Working</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Modern browsers may restrict clipboard access on HTTP (not HTTPS)</li>
            <li>The app has a fallback method that should work</li>
            <li>If alerts show the URL, you can manually copy it</li>
            <li>Alternatively, manually type/copy the URL from the display</li>
          </ul>
        </div>
      </Section>

      {/* Footer */}
      <div className="card bg-gradient-to-r from-indigo-50 to-purple-50">
        <h2 className="text-xl font-bold mb-3 text-gray-900">Need More Help?</h2>
        <p className="text-gray-700 mb-4">
          If you can't find the answer to your question, feel free to reach out:
        </p>
        <a
          href="mailto:nyonnguyen@gmail.com"
          className="btn-primary inline-flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Contact Support
        </a>
      </div>
    </div>
  );
}
