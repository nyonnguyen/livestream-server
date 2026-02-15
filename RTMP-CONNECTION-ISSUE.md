# RTMP Connection Issue - SOLVED

## Problem

**Error**: "Could not connect to server" when trying to stream to:
```
rtmp://192.168.2.34:1935/live/abc
```

## Root Cause

The stream key **`abc`** is **NOT a valid stream key**.

Your server has authentication enabled and only accepts pre-configured stream keys. The key "abc" was rejected, causing the connection to fail.

## What Happened

From the SRS logs:
```
[2026-02-14 09:31:23.495] RTMP client ip=192.168.65.1:61805
[2026-02-14 09:31:23.495][WARN] client disconnect peer. ret=1008
```

The client connected but was immediately disconnected because the stream key wasn't valid.

## Solution

### Option 1: Use Pre-configured Stream Keys (Easiest)

Your server was initialized with 3 default stream keys:

**Stream 1: Drone**
```
Server: rtmp://192.168.2.34:1935/live
Stream Key: drone001_test12345678901234567890
```

**Stream 2: Phone**
```
Server: rtmp://192.168.2.34:1935/live
Stream Key: phone001_test12345678901234567890
```

**Stream 3: Camera**
```
Server: rtmp://192.168.2.34:1935/live
Stream Key: camera001_test12345678901234567890
```

### Option 2: Get Stream Keys from Web Dashboard

1. Open: http://192.168.2.34
2. Login with your credentials
3. Go to **Streams** page
4. Click the eye icon to reveal stream keys
5. Copy the stream key you want to use

### Option 3: Create a Custom Stream Key

1. Login to web dashboard: http://192.168.2.34
2. Go to **Streams** page
3. Click **Add Stream** button
4. Enter:
   - Name: "My Custom Stream"
   - Description: (optional)
   - Protocol: RTMP
5. Click **Create**
6. The system will auto-generate a secure stream key
7. Copy and use it

## Testing the Fix

### Test 1: Using OBS Studio

1. Open OBS Studio
2. **Settings** → **Stream**
   - Service: **Custom**
   - Server: `rtmp://192.168.2.34:1935/live`
   - Stream Key: `drone001_test12345678901234567890`
3. **Settings** → **Output**
   - Encoder: x264
   - Rate Control: CBR
   - Bitrate: 2500 Kbps
   - Keyframe Interval: 2
4. Add a source (Display Capture, Video Capture, etc.)
5. Click **Start Streaming**

**Expected Result**: Stream connects successfully!

### Test 2: Using FFmpeg

```bash
# Test with valid stream key
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -c:a aac -b:a 128k \
  -f flv rtmp://192.168.2.34:1935/live/drone001_test12345678901234567890
```

**Expected**: FFmpeg connects and starts streaming.

### Test 3: Verify in Web Dashboard

After starting your stream:

1. Open: http://192.168.2.34
2. Go to **Sessions** page
3. You should see your active stream with:
   - Stream name
   - IP address
   - Bitrate
   - Duration

### Test 4: Playback with VLC

1. Open VLC
2. **Media** → **Open Network Stream**
3. Enter URL:
   ```
   http://192.168.2.34:8080/live/drone001_test12345678901234567890.flv
   ```
4. Click **Play**

**Expected**: Video plays within 1-2 seconds!

## Why "abc" Doesn't Work

The server has **stream authentication enabled** for security:

1. When you try to publish to a stream key, SRS calls the webhook: `/api/hooks/on_publish`
2. The API checks if the stream key exists in the database
3. If valid and active → connection allowed
4. If not valid → connection rejected (error 1008)

The key "abc" is not in the database, so it was rejected.

## Network Verification

I've verified your network setup is correct:

✅ **Server IP**: 192.168.2.34 (correct)
✅ **Port 1935**: Open and accessible
✅ **SRS Server**: Running and healthy (v5.0.213)
✅ **Docker ports**: Correctly mapped to host

The connection itself works fine - you just need to use a valid stream key!

## Quick Reference

### Valid RTMP URLs

Replace `[STREAM_KEY]` with one of your valid keys:

```bash
# Publishing (OBS, FFmpeg, etc.)
rtmp://192.168.2.34:1935/live/[STREAM_KEY]

# Examples:
rtmp://192.168.2.34:1935/live/drone001_test12345678901234567890
rtmp://192.168.2.34:1935/live/phone001_test12345678901234567890
rtmp://192.168.2.34:1935/live/camera001_test12345678901234567890
```

### Valid Playback URLs

```bash
# HTTP-FLV (VLC, OBS Media Source, Web Player)
http://192.168.2.34:8080/live/[STREAM_KEY].flv

# Examples:
http://192.168.2.34:8080/live/drone001_test12345678901234567890.flv
http://192.168.2.34:8080/live/phone001_test12345678901234567890.flv
http://192.168.2.34:8080/live/camera001_test12345678901234567890.flv
```

## Getting Stream Keys via API (Advanced)

If you need to script getting stream keys:

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://192.168.2.34:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 2. Get streams
curl -s http://192.168.2.34:3000/api/streams \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

## Disabling Authentication (Not Recommended)

If you want to allow any stream key (for testing only):

1. Login to web dashboard
2. Go to **Settings**
3. Toggle **Require Authentication** to OFF
4. Click **Save Changes**

**⚠️ Warning**: This allows anyone to publish to your server!

## Summary

❌ **Problem**: Stream key "abc" is not valid
✅ **Solution**: Use one of these valid keys:
   - `drone001_test12345678901234567890`
   - `phone001_test12345678901234567890`
   - `camera001_test12345678901234567890`

Or create a new stream in the web dashboard!

---

## Need Help?

If you're still having issues after using a valid stream key:

1. Check SRS logs: `docker-compose logs srs | tail -50`
2. Check API logs: `docker-compose logs web-api | tail -50`
3. Verify port is open: `nc -zv 192.168.2.34 1935`
4. Test locally first: `rtmp://localhost:1935/live/[KEY]`

The server is working correctly - just use a valid stream key! 🚀
