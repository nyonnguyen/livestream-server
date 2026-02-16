import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { streamsAPI, sessionsAPI } from '../services/api';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Power,
  Video,
  QrCode,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';
import StreamModal from '../components/StreamModal';
import QRCodeModal from '../components/QRCodeModal';
import FlvPlayer from '../components/FlvPlayer';

export default function Streams() {
  const { t } = useTranslation();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStream, setEditingStream] = useState(null);
  const [showKeys, setShowKeys] = useState({});
  const [qrCodeStream, setQrCodeStream] = useState(null);
  const [serverIp, setServerIp] = useState(window.location.hostname);
  const [publicIp, setPublicIp] = useState(null);
  const [hostname, setHostname] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [expandedStreams, setExpandedStreams] = useState({});
  const [playingStreams, setPlayingStreams] = useState({});

  useEffect(() => {
    fetchStreams();
    fetchServerIP();
    fetchNetworkConfig();
    fetchActiveSessions();

    // Poll for active sessions every 5 seconds
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchServerIP = async () => {
    try {
      const response = await fetch('/api/network/server-ip');
      const data = await response.json();
      if (data.success && data.data.ip) {
        console.log('[fetchServerIP] Setting serverIp to:', data.data.ip);
        setServerIp(data.data.ip);
      } else {
        console.log('[fetchServerIP] No IP from API, keeping:', serverIp);
      }
    } catch (error) {
      console.error('[fetchServerIP] Error:', error);
      // Fallback to hostname already set
    }
  };

  const fetchNetworkConfig = async () => {
    try {
      const response = await fetch('/api/network/config');
      const data = await response.json();
      if (data.success) {
        setPublicIp(data.data.server_public_ip || null);
        setHostname(data.data.server_hostname || null);
      }
    } catch (error) {
      console.error('Error fetching network config:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await sessionsAPI.getAll();
      setActiveSessions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      setActiveSessions([]);
    }
  };

  const isStreamLive = (streamId) => {
    return activeSessions.some(session => session.stream_id === streamId);
  };

  const fetchStreams = async () => {
    try {
      const response = await streamsAPI.getAll();
      // Ensure streams is always an array
      const streamsData = response.data.data;
      setStreams(Array.isArray(streamsData) ? streamsData : []);
    } catch (error) {
      console.error('Error fetching streams:', error);
      setStreams([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingStream(null);
    setShowModal(true);
  };

  const handleEdit = (stream) => {
    setEditingStream(stream);
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(t('streams.deleteConfirm', { name }))) {
      return;
    }

    try {
      await streamsAPI.delete(id);
      fetchStreams();
    } catch (error) {
      alert(t('streams.errorDeleting') + error.response?.data?.error);
    }
  };

  const handleToggle = async (id) => {
    try {
      await streamsAPI.toggle(id);
      fetchStreams();
    } catch (error) {
      alert(t('streams.errorToggling') + error.response?.data?.error);
    }
  };

  const handleRegenerateKey = async (id, name) => {
    if (!confirm(t('streams.regenerateConfirm', { name }))) {
      return;
    }

    try {
      await streamsAPI.regenerateKey(id);
      fetchStreams();
      alert(t('streams.keyRegeneratedSuccess'));
    } catch (error) {
      alert(t('streams.errorRegeneratingKey') + error.response?.data?.error);
    }
  };

  const copyToClipboard = (text) => {
    console.log('[Copy] Attempting to copy:', text);

    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('[Copy] Success via clipboard API');
          const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
          alert(t('streams.copiedSuccess', { preview }));
        })
        .catch(err => {
          console.error('[Copy] Clipboard API failed:', err);
          // Fallback to textarea method
          copyViaTextarea(text);
        });
    } else {
      console.log('[Copy] Clipboard API not available, using fallback');
      copyViaTextarea(text);
    }
  };

  const copyViaTextarea = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const successful = document.execCommand('copy');
      console.log('[Copy] Fallback method result:', successful);
      if (successful) {
        const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
        alert(t('streams.copiedSuccess', { preview }));
      } else {
        alert(t('streams.copyFailed', { text }));
      }
    } catch (err) {
      console.error('[Copy] Fallback failed:', err);
      alert(t('streams.copyFailed', { text }));
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const toggleShowKey = (id) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpanded = (id) => {
    setExpandedStreams((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePlaying = (id) => {
    const isCurrentlyPlaying = playingStreams[id];

    if (!isCurrentlyPlaying) {
      // Expand the stream if collapsed
      setExpandedStreams((prev) => ({ ...prev, [id]: true }));
      // Enable playing
      setPlayingStreams((prev) => ({ ...prev, [id]: true }));

      // Scroll to the stream after a short delay to let it expand
      setTimeout(() => {
        const streamElement = document.getElementById(`stream-${id}`);
        if (streamElement) {
          streamElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Just toggle off
      setPlayingStreams((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getRtmpUrl = (key, ip) => {
    const url = `rtmp://${ip}:1935/live/${key}`;
    console.log('[getRtmpUrl] Generated:', { key, ip, url });
    return url;
  };

  const getSrtPublishUrl = (key, ip) => {
    // SRT publish URL with explicit publish mode using SRS streamid format
    // Format: #!::h=host,r=resource,m=mode
    const streamid = encodeURIComponent(`#!::r=live/${key},m=publish`);
    const url = `srt://${ip}:10080?streamid=${streamid}`;
    console.log('[getSrtPublishUrl] Generated:', { key, ip, url });
    return url;
  };

  const getSrtPlayUrl = (key, ip) => {
    // SRT playback URL with explicit request mode
    const streamid = encodeURIComponent(`#!::r=live/${key},m=request`);
    const url = `srt://${ip}:10080?streamid=${streamid}`;
    console.log('[getSrtPlayUrl] Generated:', { key, ip, url });
    return url;
  };

  const getPlaybackUrl = (key, ip) => {
    // For playback URLs, use port 8080 for copying (direct SRS access)
    const url = `http://${ip}:8080/live/${key}.flv`;
    console.log('[getPlaybackUrl] Generated:', { key, ip, url });
    return url;
  };

  const getPlaybackUrlForPlayer = (key) => {
    // For web player, use relative URL through nginx proxy (no CORS issues)
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${hostname}${port}/live/${key}.flv`;
  };

  const getPublicAddress = () => {
    return hostname || publicIp;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('streams.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('streams.title')}</h1>
          <p className="text-gray-600">{t('streams.subtitle')}</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          {t('streams.addStream')}
        </button>
      </div>

      {streams.length === 0 ? (
        <div className="card text-center py-12">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{t('streams.noStreams')}</p>
          <button onClick={handleCreate} className="btn-primary">
            {t('streams.addFirstStream')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {streams.map((stream) => {
            const isExpanded = expandedStreams[stream.id];
            const isPlaying = playingStreams[stream.id];
            const isLive = isStreamLive(stream.id);

            return (
              <div key={stream.id} id={`stream-${stream.id}`} className="card">
                {/* Compact Header */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center flex-1 gap-3">
                    <button
                      onClick={() => toggleExpanded(stream.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {stream.name}
                    </h3>

                    {isLive && (
                      <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full animate-pulse flex items-center">
                        <span className="w-2 h-2 bg-red-600 rounded-full mr-1.5"></span>
                        {t('streams.live')}
                      </span>
                    )}

                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        stream.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {stream.is_active ? t('streams.active') : t('streams.disabled')}
                    </span>

                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full uppercase">
                      {stream.protocol === 'both' ? t('streams.rtmpSrt') : stream.protocol}
                    </span>

                    {isLive && !isPlaying && (
                      <button
                        onClick={() => togglePlaying(stream.id)}
                        className="ml-2 px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        {t('streams.watchLive')}
                      </button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setQrCodeStream(stream)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                      title={t('streams.showQr')}
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggle(stream.id)}
                      className={`p-2 rounded-lg ${
                        stream.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={stream.is_active ? t('streams.disable') : t('streams.enable')}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(stream)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title={t('streams.edit')}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRegenerateKey(stream.id, stream.name)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                      title={t('streams.regenerateKey')}
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(stream.id, stream.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title={t('streams.delete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    {stream.description && (
                      <p className="text-sm text-gray-600 mb-4">{stream.description}</p>
                    )}

                    {/* Live Player */}
                    {isPlaying && isLive && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-900">
                            {t('streams.livePreview')}
                          </label>
                          <button
                            onClick={() => togglePlaying(stream.id)}
                            className="text-xs text-gray-600 hover:text-gray-900"
                          >
                            {t('streams.closePlayer')}
                          </button>
                        </div>
                        <div className="bg-black rounded-lg overflow-hidden">
                          <FlvPlayer
                            url={getPlaybackUrlForPlayer(stream.stream_key)}
                            autoPlay={true}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Playing: {getPlaybackUrlForPlayer(stream.stream_key)}
                        </p>
                      </div>
                    )}

                    {/* Stream Key */}
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {t('streams.streamKey')}
                      </label>
                      <div className="flex items-center mt-1">
                        <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono">
                          {showKeys[stream.id]
                            ? stream.stream_key
                            : '••••••••••••••••••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleShowKey(stream.id)}
                          className="ml-2 p-2 text-gray-600 hover:text-gray-900"
                          title={showKeys[stream.id] ? t('streams.hide') : t('streams.show')}
                        >
                          {showKeys[stream.id] ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(stream.stream_key)}
                          className="ml-1 p-2 text-gray-600 hover:text-gray-900"
                          title={t('streams.copy')}
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Two Column Layout for URLs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Publish URLs Column */}
                      <div>
                        <label className="text-sm font-semibold text-gray-900 mb-3 block">
                          {t('streams.publishUrls')}
                        </label>

                        <div className="space-y-4">
                          {/* RTMP Protocol */}
                          <div>
                            <div className="flex items-center mb-2">
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded font-medium mr-2">
                                {t('streams.rtmp')}
                              </span>
                              <span className="text-xs text-gray-500">{t('streams.rtmpNote')}</span>
                            </div>

                            {/* LAN RTMP */}
                            <div className="mb-2">
                              <div className="flex items-center mb-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                  {t('streams.lan')}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                  {getRtmpUrl(stream.stream_key, serverIp)}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(getRtmpUrl(stream.stream_key, serverIp))}
                                  className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                  title={t('streams.copy')}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Public RTMP */}
                            {getPublicAddress() && (
                              <div>
                                <div className="flex items-center mb-1">
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                    {t('streams.public')}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                    {getRtmpUrl(stream.stream_key, getPublicAddress())}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(getRtmpUrl(stream.stream_key, getPublicAddress()))}
                                    className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                    title={t('streams.copy')}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SRT Protocol */}
                          <div>
                            <div className="flex items-center mb-2">
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded font-medium mr-2">
                                {t('streams.srt')}
                              </span>
                              <span className="text-xs text-gray-500">{t('streams.srtNote')}</span>
                            </div>

                            {/* LAN SRT */}
                            <div className="mb-2">
                              <div className="flex items-center mb-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                  {t('streams.lan')}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                  {getSrtPublishUrl(stream.stream_key, serverIp)}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(getSrtPublishUrl(stream.stream_key, serverIp))}
                                  className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                  title={t('streams.copy')}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Public SRT */}
                            {getPublicAddress() && (
                              <div>
                                <div className="flex items-center mb-1">
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                    {t('streams.public')}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                    {getSrtPublishUrl(stream.stream_key, getPublicAddress())}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(getSrtPublishUrl(stream.stream_key, getPublicAddress()))}
                                    className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                    title={t('streams.copy')}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Playback URLs Column */}
                      <div>
                        <label className="text-sm font-semibold text-gray-900 mb-3 block">
                          {t('streams.playbackUrls')}
                        </label>

                        <div className="space-y-4">
                          {/* HTTP-FLV Protocol */}
                          <div>
                            <div className="flex items-center mb-2">
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded font-medium mr-2">
                                {t('streams.httpFlv')}
                              </span>
                              <span className="text-xs text-gray-500">{t('streams.httpFlvNote')}</span>
                            </div>

                            {/* LAN HTTP-FLV */}
                            <div className="mb-2">
                              <div className="flex items-center mb-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                  {t('streams.lan')}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                  {getPlaybackUrl(stream.stream_key, serverIp)}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(getPlaybackUrl(stream.stream_key, serverIp))}
                                  className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                  title={t('streams.copy')}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Public HTTP-FLV */}
                            {getPublicAddress() && (
                              <div>
                                <div className="flex items-center mb-1">
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                    {t('streams.public')}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                    {getPlaybackUrl(stream.stream_key, getPublicAddress())}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(getPlaybackUrl(stream.stream_key, getPublicAddress()))}
                                    className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                    title={t('streams.copy')}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SRT Protocol */}
                          <div>
                            <div className="flex items-center mb-2">
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded font-medium mr-2">
                                {t('streams.srt')}
                              </span>
                              <span className="text-xs text-gray-500">{t('streams.srtPlayNote')}</span>
                            </div>

                            {/* LAN SRT */}
                            <div className="mb-2">
                              <div className="flex items-center mb-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                  {t('streams.lan')}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                  {getSrtPlayUrl(stream.stream_key, serverIp)}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(getSrtPlayUrl(stream.stream_key, serverIp))}
                                  className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                  title={t('streams.copy')}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Public SRT */}
                            {getPublicAddress() && (
                              <div>
                                <div className="flex items-center mb-1">
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                    {t('streams.public')}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                    {getSrtPlayUrl(stream.stream_key, getPublicAddress())}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(getSrtPlayUrl(stream.stream_key, getPublicAddress()))}
                                    className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                    title={t('streams.copy')}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* RTMP Protocol */}
                          <div>
                            <div className="flex items-center mb-2">
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded font-medium mr-2">
                                {t('streams.rtmp')}
                              </span>
                              <span className="text-xs text-gray-500">{t('streams.publicPlayNote')}</span>
                            </div>

                            {/* LAN RTMP */}
                            <div className="mb-2">
                              <div className="flex items-center mb-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                  {t('streams.lan')}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                  {getRtmpUrl(stream.stream_key, serverIp)}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(getRtmpUrl(stream.stream_key, serverIp))}
                                  className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                  title={t('streams.copy')}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Public RTMP */}
                            {getPublicAddress() && (
                              <div>
                                <div className="flex items-center mb-1">
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                    {t('streams.public')}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <code className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                                    {getRtmpUrl(stream.stream_key, getPublicAddress())}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(getRtmpUrl(stream.stream_key, getPublicAddress()))}
                                    className="ml-1 p-1.5 text-gray-600 hover:text-gray-900"
                                    title={t('streams.copy')}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <StreamModal
          stream={editingStream}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchStreams();
          }}
        />
      )}

      {qrCodeStream && (
        <QRCodeModal
          stream={qrCodeStream}
          onClose={() => setQrCodeStream(null)}
        />
      )}
    </div>
  );
}
