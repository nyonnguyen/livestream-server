# Latency Optimization Guide

## Changes Made

### 1. SRS Server Configuration (Ultra-Low Latency Mode)

**Key optimizations:**
- `gop_cache off` - No GOP caching for minimum latency
- `queue_length 3` - Minimal queue buffering (reduced from 10)
- `mr_latency 100` - RTMP receive latency reduced to 100ms (from 350ms)
- `mw_latency 100` - RTMP send latency reduced to 100ms (from 350ms)
- `fast_cache 2` - HTTP-FLV cache reduced to 2 frames (from 10)
- WebRTC enabled for sub-500ms latency option

### 2. FlvPlayer (Browser) Ultra-Low Latency Settings

**Player optimizations:**
- `stashInitialSize: 64` - Minimal initial buffer
- `liveBufferLatencyMaxLatency: 1.0` - Target max 1s latency
- `liveBufferLatencyMinRemain: 0.2` - Minimal 200ms buffer remain
- `liveSync: true` - Enable aggressive buffer sync
- `liveSyncPlaybackRate: 1.2` - Speed up to catch up when behind

### 3. WebRTC Support Added

- Ultra-low latency playback (< 500ms) for browsers
- Port 8000 UDP opened for WebRTC
- Signaling proxy at `/rtc/` endpoint

## Playback Options & Expected Latency

### Option 1: HTTP-FLV (OBS/VLC Compatible) - Target: ~1s

**Browser:**
```
http://nyoncamera.ddns.net/live/<stream_key>.flv
```
Use the "Watch Live" button in the web UI (uses optimized flv.js player)

**VLC:**
```
Menu → Media → Open Network Stream
URL: http://nyoncamera.ddns.net/live/<stream_key>.flv
```

**OBS (as Media Source):**
```
Add Source → Media Source
☑ Local File: OFF
Input: http://nyoncamera.ddns.net/live/<stream_key>.flv
☑ Restart playback when source becomes active
```

**Expected Latency: 0.8 - 1.5 seconds**

### Option 2: WebRTC (Browser Only) - Target: < 500ms

**URL format:**
```
webrtc://nyoncamera.ddns.net/live/<stream_key>
```

You can use SRS's built-in player at:
```
http://nyoncamera.ddns.net:8080/players/rtc_player.html?schema=http&port=80&autostart=true&stream=<stream_key>
```

**Expected Latency: 200 - 500ms**
*Note: WebRTC requires modern browsers. Not compatible with VLC/OBS.*

### Option 3: RTMP Playback - Target: 1-2s

**VLC:**
```
rtmp://nyoncamera.ddns.net/live/<stream_key>
```

**OBS (as Media Source):**
```
rtmp://nyoncamera.ddns.net/live/<stream_key>
```

**Expected Latency: 1 - 2 seconds**

### Option 4: SRT Playback (Lowest Latency for VLC) - Target: < 1s

**VLC:**
```
srt://nyoncamera.ddns.net:10080?streamid=<stream_key>
```

**OBS (as Media Source):**
```
srt://nyoncamera.ddns.net:10080?streamid=<stream_key>&latency=120
```

**Expected Latency: 0.5 - 1 second**
*Note: SRT provides lower latency than RTMP with better error correction*

## Testing Latency

### Method 1: Clock Overlay Test

**On publisher side (OBS):**
1. Add a Text source with current time: `%H:%M:%S`
2. Or use a timer website in Browser Source

**On viewer side:**
1. Open playback in another window
2. Compare timestamps
3. Difference = glass-to-glass latency

### Method 2: FFmpeg with Timer

**Publish:**
```bash
ffmpeg -f lavfi -i "testsrc=size=1280x720:rate=30" \
  -vf "drawtext=text='%{localtime\:%T}':fontsize=72:fontcolor=white:x=50:y=50" \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -b:v 2500k -maxrate 2500k -bufsize 5000k \
  -g 30 -keyint_min 30 -sc_threshold 0 \
  -f flv rtmp://nyoncamera.ddns.net/live/<stream_key>
```

**View and measure:**
Open in VLC/browser and record screen, compare timestamps

## OBS Publishing Settings for Low Latency

To achieve the best latency, configure OBS with these settings:

**Settings → Output:**
- **Output Mode:** Advanced
- **Encoder:** x264 (or hardware encoder if available)
- **Rate Control:** CBR
- **Bitrate:** 2500-4000 kbps (adjust based on network)
- **Keyframe Interval:** 1 second (important!)
- **CPU Usage Preset:** ultrafast or veryfast
- **Tune:** zerolatency

**Settings → Advanced:**
- **Process Priority:** Normal or Above Normal

**Keyframe Interval Explained:**
- 1 second = faster startup, lower latency, slightly higher bandwidth
- 2 seconds = default, good balance
- 4+ seconds = longer latency for new viewers to see video

## Troubleshooting High Latency

### If latency is still > 2 seconds:

1. **Check GOP size on encoder:**
   - OBS: Keyframe Interval should be 1-2 seconds
   - FFmpeg: `-g 30` for 30fps = 1 second GOP

2. **Check network buffering:**
   - Use CBR (Constant Bitrate) not VBR
   - Set bitrate within your upload capacity (test at speedtest.net)

3. **Verify SRS config is loaded:**
   ```bash
   docker logs livestream-srs | grep "mr_latency"
   ```
   Should show: `mw sleep:100ms. mr enabled:on, default:0, sleep:100ms`

4. **Check player buffer:**
   - Browser: Open console (F12), look for buffer warnings
   - VLC: Tools → Preferences → Show Settings: All → Input/Codecs
     - Set "Network caching" to 200-500ms (default is 1000ms)

5. **Use WebRTC for ultimate low latency:**
   - If you need < 500ms, use WebRTC playback in browser
   - Trade-off: Only works in browsers, not OBS/VLC

## Recommended Configurations by Use Case

### Case 1: Monitoring/Preview (Sub-second required)
**Publish:** RTMP/SRT
**Playback:** WebRTC in browser (< 500ms)

### Case 2: Re-streaming to OBS (< 1.5s acceptable)
**Publish:** RTMP
**Playback:** HTTP-FLV in OBS (~1s)

### Case 3: Viewing in VLC (< 1s desired)
**Publish:** SRT
**Playback:** SRT in VLC (~0.5-1s)

### Case 4: Maximum Compatibility
**Publish:** RTMP
**Playback:** HTTP-FLV (works everywhere)

## Performance Impact on Raspberry Pi 3

With these optimizations:
- CPU usage: ~5-10% per stream (relay mode, no transcoding)
- Memory: ~50MB per stream
- 3 concurrent streams: ~20-30% CPU, ~150-200MB RAM
- **Note:** Ultra-low latency increases CPU usage slightly vs. default config

## Further Optimization (If Needed)

If you still need lower latency:

1. **Use SRT for both publish and playback:**
   - Lowest latency protocol for point-to-point
   - Best for local network scenarios

2. **Reduce video resolution/framerate:**
   - 720p30 instead of 1080p60 = less data = less latency

3. **Wired network:**
   - WiFi adds 5-50ms jitter
   - Use Ethernet on both publisher and viewer

4. **Upgrade to Pi 4/5:**
   - Enables transcoding if needed
   - Better network performance
   - Can handle WebRTC better

## Verification

After applying these changes, you should see:

- **HTTP-FLV playback:** 0.8 - 1.5s latency
- **WebRTC playback:** 0.2 - 0.5s latency
- **SRT playback:** 0.5 - 1s latency

The web UI "Watch Live" button now uses the optimized HTTP-FLV player and should show approximately 1 second delay from source.
