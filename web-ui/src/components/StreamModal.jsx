import { useState, useEffect } from 'react';
import { streamsAPI } from '../services/api';
import { X, Sparkles } from 'lucide-react';

export default function StreamModal({ stream, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    stream_key: '',
    description: '',
    protocol: 'rtmp',
    max_bitrate: 5000,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stream) {
      setFormData({
        name: stream.name,
        stream_key: stream.stream_key || '',
        description: stream.description || '',
        protocol: stream.protocol,
        max_bitrate: stream.max_bitrate || 5000,
      });
    }
  }, [stream]);

  const generateStreamKey = () => {
    // Generate a random 32-character hexadecimal string
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Use stream name as prefix if available, otherwise use "stream"
    const prefix = formData.name
      ? formData.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
      : 'stream';

    const generatedKey = `${prefix}_${randomHex}`;
    setFormData({ ...formData, stream_key: generatedKey });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Prepare data - remove empty stream_key to let backend handle it
    const submitData = { ...formData };
    if (!submitData.stream_key || submitData.stream_key.trim() === '') {
      delete submitData.stream_key;
    }

    console.log('[StreamModal] Submitting form:', { stream, formData, submitData });

    try {
      if (stream) {
        console.log('[StreamModal] Updating stream:', stream.id);
        const response = await streamsAPI.update(stream.id, submitData);
        console.log('[StreamModal] Update response:', response.data);
      } else {
        console.log('[StreamModal] Creating stream');
        const response = await streamsAPI.create(submitData);
        console.log('[StreamModal] Create response:', response.data);
      }
      console.log('[StreamModal] Success, calling onSave()');
      onSave();
    } catch (error) {
      console.error('[StreamModal] Error:', error);
      console.error('[StreamModal] Error response:', error.response);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to save stream';
      console.error('[StreamModal] Error message:', errorMsg);
      setError(errorMsg);
      setLoading(false); // Keep modal open on error
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {stream ? 'Edit Stream' : 'Add Stream'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="label">Stream Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={3}
              maxLength={100}
            />
          </div>

          <div className="mb-4">
            <label className="label">Stream Key (optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                value={formData.stream_key}
                onChange={(e) => setFormData({ ...formData, stream_key: e.target.value })}
                placeholder="Leave blank to auto-generate"
                pattern="[a-zA-Z0-9_-]*"
                minLength={3}
                maxLength={100}
              />
              <button
                type="button"
                onClick={generateStreamKey}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                title="Generate random stream key"
              >
                <Sparkles className="w-4 h-4" />
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stream
                ? 'Change the stream key (warning: existing URLs will stop working)'
                : 'Custom stream key, click Generate, or leave blank to auto-generate from name'}
            </p>
          </div>

          <div className="mb-4">
            <label className="label">Description (optional)</label>
            <textarea
              className="input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
            />
          </div>

          <div className="mb-4">
            <label className="label">Protocol</label>
            <select
              className="input"
              value={formData.protocol}
              onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
            >
              <option value="rtmp">RTMP</option>
              <option value="srt">SRT</option>
              <option value="both">Both (RTMP + SRT)</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="label">Max Bitrate (kbps)</label>
            <input
              type="number"
              className="input"
              value={formData.max_bitrate}
              onChange={(e) =>
                setFormData({ ...formData, max_bitrate: parseInt(e.target.value) })
              }
              min={100}
              max={50000}
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 2500-5000 kbps for 1080p
            </p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : stream ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
