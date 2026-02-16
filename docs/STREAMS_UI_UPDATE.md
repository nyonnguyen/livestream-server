# Streams UI Update - SRT URLs & Improved Watch Live

## Changes Implemented

### 1. Multiple Protocol URLs Display

The Streams tab now shows **both RTMP and SRT URLs** for publishing and playback, with latency information and compatibility notes.

#### Publish URLs (Left Column):

**RTMP:**
- 🏠 LAN: `rtmp://192.168.1.55:1935/live/stream_key`
- 🌐 Public: `rtmp://nyoncamera.ddns.net:1935/live/stream_key`
- Note: "OBS, Streamlabs, etc."

**SRT:**
- 🏠 LAN: `srt://192.168.1.55:10080?streamid=stream_key`
- 🌐 Public: `srt://nyoncamera.ddns.net:10080?streamid=stream_key`
- Note: "Low latency, better for unstable networks"

#### Playback URLs (Right Column):

**HTTP-FLV:**
- ~1s latency
- VLC/OBS/Browser compatible
- 🏠 LAN: `http://192.168.1.55:8080/live/stream_key.flv`
- 🌐 Public: `http://nyoncamera.ddns.net:8080/live/stream_key.flv`

**SRT:**
- ~0.5s latency (lowest!)
- VLC recommended
- 🏠 LAN: `srt://192.168.1.55:10080?streamid=stream_key`
- 🌐 Public: `srt://nyoncamera.ddns.net:10080?streamid=stream_key`

**RTMP:**
- ~1-2s latency
- VLC/OBS compatible
- 🏠 LAN: `rtmp://192.168.1.55:1935/live/stream_key`
- 🌐 Public: `rtmp://nyoncamera.ddns.net:1935/live/stream_key`

### 2. Improved "Watch Live" Button Behavior

**Old behavior:**
- Clicking "Watch Live" only toggled the player on/off
- If stream was collapsed, player was hidden

**New behavior:**
- Clicking "Watch Live" on a **collapsed stream**:
  1. Automatically expands the stream
  2. Starts the video player
  3. Smoothly scrolls to the player so it's in view

- Clicking "Watch Live" again (when player is active):
  1. Stops the video player
  2. Keeps the stream expanded

**Technical implementation:**
```javascript
const togglePlaying = (id) => {
  const isCurrentlyPlaying = playingStreams[id];

  if (!isCurrentlyPlaying) {
    // Expand the stream if collapsed
    setExpandedStreams((prev) => ({ ...prev, [id]: true }));
    // Enable playing
    setPlayingStreams((prev) => ({ ...prev, [id]: true }));

    // Scroll to the stream after a short delay
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
```

## UI Layout

### Expanded Stream View:
```
┌─────────────────────────────────────────────────────────────────┐
│ [▼] Stream Name [LIVE] [Active] [RTMP]     [Watch Live] [⚙️📝🗑️] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Video Player - when Watch Live is clicked]                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Stream Key: ••••••••••••••• [👁️] [📋]                          │
├─────────────────────────────────────────────────────────────────┤
│ 📤 Publish URLs              │ 📥 Playback URLs                 │
│                              │                                  │
│ RTMP (OBS, Streamlabs...)    │ HTTP-FLV (~1s latency)          │
│ 🏠 LAN: rtmp://...           │ 🏠 LAN: http://...flv           │
│ 🌐 Public: rtmp://...        │ 🌐 Public: http://...flv        │
│                              │                                  │
│ SRT (Low latency)            │ SRT (~0.5s latency) ⭐          │
│ 🏠 LAN: srt://...            │ 🏠 LAN: srt://...               │
│ 🌐 Public: srt://...         │ 🌐 Public: srt://...            │
│                              │                                  │
│                              │ RTMP (~1-2s latency)             │
│                              │ 🏠 LAN: rtmp://...              │
│                              │ 🌐 Public: rtmp://...           │
└─────────────────────────────────────────────────────────────────┘
```

### Collapsed Stream View:
```
┌─────────────────────────────────────────────────────────────────┐
│ [▶] Stream Name [LIVE] [Active] [RTMP] [Watch Live] [⚙️📝🔄🗑️]   │
└─────────────────────────────────────────────────────────────────┘
```

## Protocol Recommendations

### For Publishing (OBS/Streamlabs):

**Use RTMP when:**
- Standard streaming from stable network
- Maximum compatibility needed
- Network is good and consistent

**Use SRT when:**
- Streaming over WiFi or mobile network
- Network is unstable or has packet loss
- You need lower latency
- Streaming over long distances

### For Viewing (VLC/OBS as viewer):

**Use HTTP-FLV when:**
- Viewing in browser (with "Watch Live" button)
- Need broad compatibility
- ~1s latency is acceptable

**Use SRT when:**
- Need lowest latency (~0.5s) ⭐
- Using VLC or OBS to view
- Network might be unstable
- **Recommended for best performance**

**Use RTMP when:**
- Maximum compatibility needed
- 1-2s latency is acceptable
- Other protocols don't work

## Quick Test

### Test SRT Publishing (from OBS):
1. In OBS Settings → Stream:
   - Server: `srt://nyoncamera.ddns.net:10080`
   - Stream Key: `?streamid=camera001_test12345678901234567890`
2. Start Streaming

### Test SRT Playback (in VLC):
1. VLC → Media → Open Network Stream
2. URL: `srt://nyoncamera.ddns.net:10080?streamid=camera001_test12345678901234567890`
3. **Expected latency: 0.5-1 second** (best option!)

### Test HTTP-FLV in Browser:
1. Go to Streams tab
2. Click "Watch Live" on collapsed stream
3. Stream expands and scrolls into view
4. Video player starts automatically
5. **Expected latency: ~1 second**

## Color Coding

The UI uses color-coded badges to help identify protocols:
- 🟣 **Purple** = RTMP (standard protocol)
- 🟠 **Orange** = HTTP-FLV (browser/web playback)
- 🔵 **Indigo** = SRT (low latency, error correction)
- 🔵 **Blue** = LAN (local network)
- 🟢 **Green** = Public (internet accessible)

## Notes

- All URLs are shown with both LAN and Public addresses (if public address is configured)
- Each protocol shows expected latency to help users choose
- Copy buttons (📋) are next to each URL for easy copying
- Stream ID is automatically added to each stream card for scroll-to functionality
- Smooth scroll animation when clicking "Watch Live" on collapsed streams
