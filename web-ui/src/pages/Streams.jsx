import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
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
  History as HistoryIcon,
  ChevronsDown,
  ChevronsUp,
  AlertTriangle,
} from 'lucide-react';
import StreamModal from '../components/StreamModal';
import QRCodeModal from '../components/QRCodeModal';
import FlvPlayer from '../components/FlvPlayer';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from 'axios';

export default function Streams() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingStream, setDeletingStream] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [streamLimit, setStreamLimit] = useState(null);

  useEffect(() => {
    fetchStreams();
    fetchServerIP();
    fetchNetworkConfig();
    fetchActiveSessions();
    fetchStreamLimit();

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

  const fetchStreamLimit = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/system/stream-limit', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStreamLimit(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stream limit:', error);
    }
  };

  const isStreamLive = (streamId) => {
    return activeSessions.some(session => session.stream_id === streamId);
  };

  const isDefaultStream = (stream) => {
    // Mark first 3 streams by ID as default streams
    const sortedStreams = [...streams].sort((a, b) => a.id - b.id);
    const defaultIds = sortedStreams.slice(0, 3).map(s => s.id);
    return defaultIds.includes(stream.id);
  };

  const collapseAll = () => {
    setExpandedStreams({});
    setPlayingStreams({});
  };

  const expandAll = () => {
    const allExpanded = {};
    streams.forEach(stream => {
      allExpanded[stream.id] = true;
    });
    setExpandedStreams(allExpanded);
  };

  // Calculate statistics
  const statistics = {
    total: streams.length,
    active: streams.filter(s => s.is_active).length,
    inactive: streams.filter(s => !s.is_active).length,
    live: streams.filter(s => isStreamLive(s.id)).length,
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
    // Check if adding a new stream would exceed the limit
    if (streamLimit && streams.length >= streamLimit.maxStreams) {
      const confirmed = confirm(
        `⚠️ Hardware Limit Warning\n\n` +
        `Your system is configured for a maximum of ${streamLimit.maxStreams} concurrent streams based on hardware capacity.\n\n` +
        `Current streams: ${streams.length}\n` +
        `Recommended max: ${streamLimit.maxStreams}\n\n` +
        `Adding more streams may cause performance issues or instability.\n\n` +
        `Do you want to proceed anyway?`
      );
      if (!confirmed) return;
    } else if (streamLimit && streams.length >= streamLimit.maxStreams * 0.8) {
      // Warning when approaching 80% of limit
      alert(
        `⚠️ Approaching Stream Limit\n\n` +
        `Current streams: ${streams.length}\n` +
        `Recommended max: ${streamLimit.maxStreams}\n\n` +
        `You're approaching your system's capacity. Monitor performance closely.`
      );
    }

    setEditingStream(null);
    setShowModal(true);
  };

  const handleEdit = (stream) => {
    setEditingStream(stream);
    setShowModal(true);
  };

  const handleDelete = async (stream) => {
    // Prevent deletion of default streams
    if (isDefaultStream(stream)) {
      alert(
        `❌ Cannot Delete Default Stream\n\n` +
        `"${stream.name}" is a default stream and cannot be deleted.\n\n` +
        `Default streams can be disabled but not removed from the system.`
      );
      return;
    }

    setDeletingStream(stream);
    setDeletionReason('');
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingStream) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/streams/${deletingStream.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deletion_reason: deletionReason || 'No reason provided'
        })
      });

      if (response.ok) {
        fetchStreams();
        setShowDeleteDialog(false);
        setDeletingStream(null);
        setDeletionReason('');
      } else {
        const error = await response.json();
        alert(t('streams.errorDeleting') + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert(t('streams.errorDeleting') + error.message);
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
        <div className="flex gap-3">
          <Link
            to="/streams/history"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <HistoryIcon className="w-5 h-5 mr-2" />
            View History
          </Link>
          <button onClick={handleCreate} className="btn-primary flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            {t('streams.addStream')}
          </button>
        </div>
      </div>

      {/* Stream Limit Warning */}
      {streamLimit && streams.length >= streamLimit.maxStreams * 0.8 && (
        <div className={`mb-4 p-4 rounded-lg border-2 flex items-start ${
          streams.length >= streamLimit.maxStreams
            ? 'bg-red-50 border-red-300'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <AlertTriangle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
            streams.length >= streamLimit.maxStreams ? 'text-red-600' : 'text-yellow-600'
          }`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${
              streams.length >= streamLimit.maxStreams ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {streams.length >= streamLimit.maxStreams
                ? '⚠️ Stream Limit Reached'
                : '⚠️ Approaching Stream Limit'}
            </p>
            <p className={`text-sm mt-1 ${
              streams.length >= streamLimit.maxStreams ? 'text-red-700' : 'text-yellow-700'
            }`}>
              Current: <strong>{streams.length}</strong> streams |
              Recommended max: <strong>{streamLimit.maxStreams}</strong> streams
              (based on {streamLimit.reasoning.cpuCores} CPU cores, {streamLimit.reasoning.ramGB} GB RAM)
            </p>
            {streams.length >= streamLimit.maxStreams && (
              <p className="text-sm text-red-700 mt-1">
                Adding more streams may cause performance degradation or system instability.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Statistics and Controls */}
      {streams.length > 0 && (
        <div className="card mb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            {/* Statistics */}
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Total Streams</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Active</p>
                <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">{statistics.inactive}</p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Live Now</p>
                <p className="text-2xl font-bold text-red-600">{statistics.live}</p>
              </div>
              {streamLimit && (
                <>
                  <div className="h-12 w-px bg-gray-300" />
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">System Limit</p>
                    <p className="text-2xl font-bold text-purple-600">{streamLimit.maxStreams}</p>
                  </div>
                </>
              )}
            </div>

            {/* Collapse/Expand All Buttons */}
            <div className="flex gap-2">
              <button
                onClick={collapseAll}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Collapse all streams"
              >
                <ChevronsUp className="w-4 h-4 mr-1" />
                Collapse All
              </button>
              <button
                onClick={expandAll}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Expand all streams"
              >
                <ChevronsDown className="w-4 h-4 mr-1" />
                Expand All
              </button>
            </div>
          </div>
        </div>
      )}

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

                    {isDefaultStream(stream) && (
                      <span className="px-2 py-1 text-xs font-bold bg-purple-100 text-purple-800 rounded-full flex items-center">
                        🛡️ DEFAULT
                      </span>
                    )}

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
                      onClick={() => handleDelete(stream)}
                      className={`p-2 rounded-lg ${
                        isDefaultStream(stream)
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title={isDefaultStream(stream) ? 'Cannot delete default stream' : t('streams.delete')}
                      disabled={isDefaultStream(stream)}
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
                          {(stream.protocol === 'rtmp' || stream.protocol === 'both') && (
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
                          )}

                          {/* SRT Protocol */}
                          {(stream.protocol === 'srt' || stream.protocol === 'both') && (
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
                          )}
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
                          {(stream.protocol === 'srt' || stream.protocol === 'both') && (
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
                          )}

                          {/* RTMP Protocol */}
                          {(stream.protocol === 'rtmp' || stream.protocol === 'both') && (
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
                          )}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingStream(null);
          setDeletionReason('');
        }}
        onConfirm={confirmDelete}
        title="Delete Stream"
        confirmText="Delete Stream"
        type="danger"
      >
        {deletingStream && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete the stream <strong>{deletingStream.name}</strong>?
              This stream will be moved to the history and can be restored within 30 days.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deletion Reason (optional)
              </label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                rows={3}
                placeholder="Enter a reason for deleting this stream..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
