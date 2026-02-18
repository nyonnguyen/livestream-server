import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  RotateCw,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StreamHistory = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [deletedStreams, setDeletedStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [expandedStream, setExpandedStream] = useState(null);
  const [streamHistory, setStreamHistory] = useState({});
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);

  useEffect(() => {
    loadDeletedStreams();
  }, []);

  const loadDeletedStreams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/streams/deleted/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDeletedStreams(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load deleted streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStreamHistory = async (streamId) => {
    if (streamHistory[streamId]) {
      return; // Already loaded
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/streams/${streamId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStreamHistory(prev => ({
          ...prev,
          [streamId]: data.data || []
        }));
      }
    } catch (error) {
      console.error('Failed to load stream history:', error);
    }
  };

  const handleRestoreStream = async (stream) => {
    setSelectedStream(stream);
    setShowRestoreDialog(true);
  };

  const confirmRestore = async () => {
    if (!selectedStream) return;

    setRestoring(selectedStream.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/streams/${selectedStream.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert(`Stream "${selectedStream.name}" has been restored successfully.`);
        await loadDeletedStreams();
      } else {
        const error = await response.json();
        alert(`Failed to restore stream: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to restore stream:', error);
      alert('Failed to restore stream');
    } finally {
      setRestoring(null);
      setSelectedStream(null);
      setShowRestoreDialog(false);
    }
  };

  const handlePermanentDelete = async (stream) => {
    if (!hasPermission('streams:delete')) {
      alert('You do not have permission to permanently delete streams.');
      return;
    }

    setSelectedStream(stream);
    setShowDeleteDialog(true);
  };

  const confirmPermanentDelete = async () => {
    if (!selectedStream) return;

    setDeleting(selectedStream.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/streams/${selectedStream.id}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert(`Stream "${selectedStream.name}" has been permanently deleted.`);
        await loadDeletedStreams();
      } else {
        const error = await response.json();
        alert(`Failed to delete stream: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to permanently delete stream:', error);
      alert('Failed to permanently delete stream');
    } finally {
      setDeleting(null);
      setSelectedStream(null);
      setShowDeleteDialog(false);
    }
  };

  const toggleStreamHistory = (streamId) => {
    if (expandedStream === streamId) {
      setExpandedStream(null);
    } else {
      setExpandedStream(streamId);
      loadStreamHistory(streamId);
    }
  };

  const calculateTimeRemaining = (deletedAt) => {
    const deletedDate = new Date(deletedAt);
    const permanentDeleteDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const now = new Date();
    const timeRemaining = permanentDeleteDate - now;

    if (timeRemaining <= 0) {
      return 'Pending deletion';
    }

    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    }
  };

  const getTimeRemainingColor = (deletedAt) => {
    const deletedDate = new Date(deletedAt);
    const permanentDeleteDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = (permanentDeleteDate - now) / (1000 * 60 * 60 * 24);

    if (daysRemaining <= 0) return 'text-red-600 bg-red-50';
    if (daysRemaining <= 7) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action) => {
    if (action === 'deleted') return 'text-red-600';
    if (action === 'created') return 'text-green-600';
    if (action === 'updated') return 'text-blue-600';
    if (action === 'restored') return 'text-purple-600';
    return 'text-gray-600';
  };

  const getActionIcon = (action) => {
    if (action === 'deleted') return '🗑️';
    if (action === 'created') return '➕';
    if (action === 'updated') return '✏️';
    if (action === 'restored') return '♻️';
    return '📝';
  };

  if (!hasPermission('streams:read')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">You do not have permission to view deleted streams.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stream History</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and restore deleted streams. Streams are permanently deleted after 30 days.
        </p>
      </div>

      {/* Deleted Streams List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : deletedStreams.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Trash2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No deleted streams</h3>
            <p className="mt-1 text-sm text-gray-500">All streams are active</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {deletedStreams.map((stream) => (
              <li key={stream.id} className="bg-red-50">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {stream.name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTimeRemainingColor(stream.deleted_at)}`}>
                          <Clock className="h-4 w-4 mr-1" />
                          {calculateTimeRemaining(stream.deleted_at)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="font-medium">Deleted:</span>
                          <span className="ml-1">{formatDate(stream.deleted_at)}</span>
                        </div>
                        {stream.deleted_by_username && (
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <span className="font-medium">Deleted by:</span>
                            <span className="ml-1">{stream.deleted_by_username}</span>
                          </div>
                        )}
                      </div>

                      {stream.deletion_reason && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">Reason: </span>
                          <span className="text-sm text-gray-600">{stream.deletion_reason}</span>
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>Protocol: <span className="font-medium">{stream.protocol}</span></span>
                        <span>•</span>
                        <span>Port: <span className="font-medium">{stream.port}</span></span>
                        {stream.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{stream.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => toggleStreamHistory(stream.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {expandedStream === stream.id ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Hide History
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            View History
                          </>
                        )}
                      </button>

                      {hasPermission('streams:write') && (
                        <button
                          onClick={() => handleRestoreStream(stream)}
                          disabled={restoring === stream.id}
                          className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          <RotateCw className="h-4 w-4 mr-1" />
                          {restoring === stream.id ? 'Restoring...' : 'Restore'}
                        </button>
                      )}

                      {hasPermission('streams:delete') && (
                        <button
                          onClick={() => handlePermanentDelete(stream)}
                          disabled={deleting === stream.id}
                          className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deleting === stream.id ? 'Deleting...' : 'Delete Forever'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stream History Timeline */}
                  {expandedStream === stream.id && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Change History</h4>
                      {streamHistory[stream.id] ? (
                        streamHistory[stream.id].length === 0 ? (
                          <p className="text-sm text-gray-500">No history available</p>
                        ) : (
                          <div className="flow-root">
                            <ul className="-mb-8">
                              {streamHistory[stream.id].map((entry, idx) => (
                                <li key={entry.id}>
                                  <div className="relative pb-8">
                                    {idx !== streamHistory[stream.id].length - 1 && (
                                      <span
                                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <div className="relative flex space-x-3">
                                      <div>
                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                          entry.action === 'deleted' ? 'bg-red-100' :
                                          entry.action === 'created' ? 'bg-green-100' :
                                          entry.action === 'updated' ? 'bg-blue-100' :
                                          'bg-gray-100'
                                        }`}>
                                          <span className="text-lg">{getActionIcon(entry.action)}</span>
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div>
                                          <div className="text-sm">
                                            <span className={`font-medium ${getActionColor(entry.action)}`}>
                                              {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                                            </span>
                                            {entry.username && (
                                              <span className="text-gray-500"> by {entry.username}</span>
                                            )}
                                          </div>
                                          <p className="mt-0.5 text-xs text-gray-500">
                                            {formatDate(entry.created_at)}
                                          </p>
                                        </div>
                                        {entry.changes && (
                                          <div className="mt-2 text-xs text-gray-700 bg-gray-50 p-2 rounded">
                                            <details>
                                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                                View changes
                                              </summary>
                                              <pre className="mt-2 overflow-x-auto">
                                                {JSON.stringify(JSON.parse(entry.changes), null, 2)}
                                              </pre>
                                            </details>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      ) : (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Retention Policy</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Deleted streams are retained for 30 days</li>
                <li>After 30 days, streams are permanently deleted</li>
                <li>Restored streams keep their original configuration</li>
                <li>All changes are logged in the audit trail</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRestoreDialog}
        onClose={() => {
          setShowRestoreDialog(false);
          setSelectedStream(null);
        }}
        onConfirm={confirmRestore}
        title="Restore Stream"
        message={selectedStream ? `Are you sure you want to restore the stream "${selectedStream.name}"? It will become active again with its original configuration.` : ''}
        confirmText="Restore Stream"
        type="success"
        isProcessing={restoring !== null}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedStream(null);
        }}
        onConfirm={confirmPermanentDelete}
        title="Permanently Delete Stream"
        message={selectedStream ? `Are you sure you want to permanently delete the stream "${selectedStream.name}"? This action cannot be undone and all history will be lost.` : ''}
        confirmText="Delete Forever"
        type="danger"
        isProcessing={deleting !== null}
      />
    </div>
  );
};

export default StreamHistory;
