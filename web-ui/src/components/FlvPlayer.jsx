import { useEffect, useRef, useState } from 'react';
import flvjs from 'flv.js';

export default function FlvPlayer({ url, autoPlay = true }) {
  const videoRef = useRef(null);
  const flvPlayerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flvjs.isSupported()) {
      setError('FLV.js is not supported in this browser');
      setLoading(false);
      return;
    }

    if (videoRef.current && url) {
      console.log('Initializing FLV player with URL:', url);

      // Create FLV player with ultra-low latency config (~1s target)
      flvPlayerRef.current = flvjs.createPlayer({
        type: 'flv',
        url: url,
        isLive: true,
        hasAudio: true,
        hasVideo: true,
      }, {
        enableWorker: false,
        enableStashBuffer: false,
        stashInitialSize: 64,          // Minimal initial buffer
        isLive: true,
        lazyLoad: false,
        autoCleanupSourceBuffer: true,
        fixAudioTimestampGap: true,

        // Ultra-low latency optimizations
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1.0,   // Max 1s latency
        liveBufferLatencyMinRemain: 0.2,    // Min 200ms buffer

        // Aggressive buffer management
        liveSync: true,
        liveSyncDuration: 0.3,              // Sync within 300ms
        liveSyncPlaybackRate: 1.2,          // Speed up to 1.2x to catch up
      });

      flvPlayerRef.current.attachMediaElement(videoRef.current);

      // Event listeners for detailed debugging
      flvPlayerRef.current.on(flvjs.Events.LOADING_COMPLETE, () => {
        console.log('[FlvPlayer] FLV loading complete');
      });

      flvPlayerRef.current.on(flvjs.Events.MEDIA_INFO, (mediaInfo) => {
        console.log('[FlvPlayer] Media info:', mediaInfo);
        setLoading(false);
      });

      flvPlayerRef.current.on(flvjs.Events.METADATA_ARRIVED, (metadata) => {
        console.log('[FlvPlayer] Metadata arrived:', metadata);
        setLoading(false); // Also clear loading when metadata arrives
      });

      flvPlayerRef.current.on(flvjs.Events.STATISTICS_INFO, (stats) => {
        console.log('[FlvPlayer] Statistics:', stats);
      });

      flvPlayerRef.current.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
        console.error('[FlvPlayer] Error:', errorType, errorDetail, errorInfo);
        setError(`Player error: ${errorType} - ${errorDetail}`);
        setLoading(false);
      });

      // Load and play
      flvPlayerRef.current.load();

      if (autoPlay) {
        // Wait a bit for the player to initialize
        setTimeout(() => {
          videoRef.current?.play().catch(err => {
            console.log('Autoplay failed:', err.message);
            setLoading(false);
          });
        }, 500);
      }

      // Video element events for detailed state tracking
      if (videoRef.current) {
        const video = videoRef.current;

        video.addEventListener('loadstart', () => {
          console.log('[Video] Load start');
        });

        video.addEventListener('loadedmetadata', () => {
          console.log('[Video] Metadata loaded - dimensions:', video.videoWidth, 'x', video.videoHeight);
          setLoading(false);
        });

        video.addEventListener('loadeddata', () => {
          console.log('[Video] Data loaded');
          setLoading(false);
        });

        video.addEventListener('canplay', () => {
          console.log('[Video] Can play');
          setLoading(false);
        });

        video.addEventListener('playing', () => {
          console.log('[Video] Playing');
          setLoading(false);
        });

        video.addEventListener('waiting', () => {
          console.log('[Video] Waiting for data');
        });

        video.addEventListener('stalled', () => {
          console.warn('[Video] Stream stalled');
        });

        video.addEventListener('error', (e) => {
          console.error('[Video] Error:', e, 'Code:', video.error?.code, 'Message:', video.error?.message);
          setError(`Video error: ${video.error?.message || 'Unknown error'}`);
          setLoading(false);
        });
      }
    }

    // Cleanup
    return () => {
      if (flvPlayerRef.current) {
        try {
          flvPlayerRef.current.pause();
          flvPlayerRef.current.unload();
          flvPlayerRef.current.detachMediaElement();
          flvPlayerRef.current.destroy();
          flvPlayerRef.current = null;
        } catch (e) {
          console.error('Error cleaning up player:', e);
        }
      }
    };
  }, [url, autoPlay]);

  if (error) {
    return (
      <div className="w-full p-8 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-800 font-medium mb-2">Playback Error</p>
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-gray-600 mt-2">URL: {url}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white text-sm">Loading stream...</div>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        className="w-full h-auto"
        style={{ maxHeight: '500px', backgroundColor: '#000', minHeight: '300px' }}
        playsInline
        muted={autoPlay}
      />
    </div>
  );
}
