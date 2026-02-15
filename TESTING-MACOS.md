# Testing on macOS

Complete guide for testing the Livestream Server on macOS before deploying to Raspberry Pi.

## Prerequisites

### 1. Install Docker Desktop

Download and install Docker Desktop for Mac:
- **Intel Mac**: https://desktop.docker.com/mac/main/amd64/Docker.dmg
- **Apple Silicon (M1/M2/M3)**: https://desktop.docker.com/mac/main/arm64/Docker.dmg

After installation:
1. Open Docker Desktop
2. Wait for it to start (whale icon in menu bar should be steady)
3. Go to **Settings** → **Resources**
   - **CPUs**: Allocate 4 CPUs (recommended)
   - **Memory**: Allocate 4GB RAM (minimum 2GB)
   - Click **Apply & Restart**

### 2. Verify Installation

```bash
docker --version
# Should show: Docker version 20.x or higher

docker-compose --version
# Should show: docker-compose version 1.29 or higher

docker ps
# Should show: empty list (no errors)
```

## Quick Start (Automated)

The easiest way to test:

```bash
cd /Users/nhnguyen/nyon/livestream-server
bash scripts/test-macos.sh
```

This script will:
- Create `.env` file with localhost settings
- Build all Docker images
- Start all services
- Initialize the database
- Show you access URLs

**Total time**: 5-10 minutes (first build)

## Manual Setup (Step by Step)

If you prefer manual setup:

### Step 1: Create Environment File

```bash
cd /Users/nhnguyen/nyon/livestream-server
cp .env.example .env
```

Edit `.env`:
```bash
# Change SERVER_IP to localhost
SERVER_IP=localhost

# Generate a random JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Keep testing password
DEFAULT_ADMIN_PASSWORD=admin123

# Increase streams for Mac (has more power than Pi3)
MAX_CONCURRENT_STREAMS=5
```

### Step 2: Build Images

```bash
docker-compose build
```

Expected output:
```
Building web-api...
Building web-ui...
Successfully built...
```

This takes **5-10 minutes** on first build.

### Step 3: Start Services

```bash
docker-compose up -d
```

Check status:
```bash
docker-compose ps
```

All services should show "Up":
```
NAME                  STATUS
livestream-srs        Up
livestream-api        Up
livestream-ui         Up
livestream-nginx      Up
```

### Step 4: Initialize Database

```bash
docker exec livestream-api npm run init-db
```

Expected output:
```
✓ Created admin user (username: admin, password: admin123)
✓ Created default streams
✓ Created default configuration
```

### Step 5: Access Web UI

Open browser: **http://localhost**

Login:
- **Username**: admin
- **Password**: admin123

## Testing Scenarios

### 1. Test Stream Publishing (OBS Studio)

#### Install OBS Studio
Download from: https://obsproject.com/download

#### Configure OBS
1. Open OBS Studio
2. Go to **Settings** → **Stream**
3. Configure:
   - **Service**: Custom
   - **Server**: `rtmp://localhost:1935/live`
   - **Stream Key**: Copy from web UI (Streams page)

4. Go to **Settings** → **Output**
   - **Output Mode**: Advanced
   - **Encoder**: x264
   - **Rate Control**: CBR
   - **Bitrate**: 2500 Kbps
   - **Keyframe Interval**: 2

5. Add a source:
   - **Sources** → **+** → **Display Capture** (capture your screen)
   - Or **Video Capture Device** (if you have a webcam)

6. Click **Start Streaming**

#### Verify in Web UI
1. Go to **Sessions** page
2. You should see your active stream
3. Note the bitrate and resolution

### 2. Test Playback (VLC)

#### Install VLC
Download from: https://www.videolan.org/vlc/

#### Play Stream
1. Open VLC
2. **Media** → **Open Network Stream**
3. Enter URL: `http://localhost:8080/live/[your_stream_key].flv`
   - Get stream key from web UI
4. Click **Play**

**Expected**: Video starts playing within 1-2 seconds

#### Measure Latency
1. In OBS, add **Text** source showing current time
2. Take screenshot of both OBS and VLC
3. Compare timestamps
4. **Expected latency**: < 2 seconds on macOS (network is localhost)

### 3. Test Multiple Streams

Open multiple OBS instances (or use FFmpeg):

```bash
# Terminal 1 - Stream 1
ffmpeg -f avfoundation -framerate 30 -i "0" \
  -c:v libx264 -preset ultrafast -b:v 2M \
  -f flv rtmp://localhost:1935/live/[stream_key_1]

# Terminal 2 - Stream 2
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
  -c:v libx264 -preset ultrafast -b:v 2M \
  -f flv rtmp://localhost:1935/live/[stream_key_2]
```

Check in web UI:
- **Dashboard**: Should show 2 active streams
- **Sessions**: Should list both streams
- Monitor CPU/bandwidth

### 4. Test API

#### Get Auth Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Save the token from response.

#### List Streams
```bash
TOKEN="your-token-here"

curl http://localhost:3000/api/streams \
  -H "Authorization: Bearer $TOKEN"
```

#### Create New Stream
```bash
curl -X POST http://localhost:3000/api/streams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Stream",
    "description": "Testing from macOS",
    "protocol": "rtmp",
    "max_bitrate": 5000
  }'
```

### 5. Test Webhooks

Publish a stream and watch the logs:

```bash
docker-compose logs -f web-api
```

You should see:
```
SRS on_publish webhook: { action: 'on_publish', stream: 'your_key', ... }
Session created for stream: your_key
```

When you stop streaming:
```
SRS on_unpublish webhook: { action: 'on_unpublish', ... }
Session ended for client: xxx
```

## Performance Monitoring

### Resource Usage

```bash
docker stats
```

**Expected on macOS (M1/M2/M3 or recent Intel)**:
- SRS: 5-10% CPU, ~100MB RAM
- Web API: 1-3% CPU, ~80MB RAM
- Web UI: 1% CPU, ~30MB RAM

**Expected with 3 concurrent streams**:
- Total CPU: 10-20%
- Total RAM: ~500MB

### Check Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f srs
docker-compose logs -f web-api

# Last 50 lines
docker-compose logs --tail=50 srs
```

## Troubleshooting on macOS

### Port Already in Use

Error:
```
Bind for 0.0.0.0:80 failed: port is already allocated
```

**Solution 1**: Use different port
```yaml
# In docker-compose.yml
web-ui:
  ports:
    - "8080:80"  # Access on http://localhost:8080
```

**Solution 2**: Find and stop process using port
```bash
sudo lsof -i :80
# Kill the process or stop the service
```

### Docker Desktop Not Enough Resources

If services are slow or crashing:

1. **Docker Desktop** → **Settings** → **Resources**
2. Increase:
   - CPUs to 4
   - Memory to 4GB
3. **Apply & Restart**

### Cannot Connect to API

Check if API is running:
```bash
docker-compose ps web-api
curl http://localhost:3000/api/health
```

If not responding:
```bash
docker-compose logs web-api
docker-compose restart web-api
```

### OBS Cannot Connect

1. **Check stream key**: Copy exact key from web UI
2. **Check SRS is running**:
   ```bash
   docker-compose ps srs
   telnet localhost 1935
   ```
3. **Check logs**:
   ```bash
   docker-compose logs srs
   ```

### High CPU Usage

This is normal on first run (building/caching). If persistent:

1. **Check number of streams**:
   - Reduce to 1-2 for testing
2. **Reduce bitrate** in OBS:
   - Try 1500 Kbps instead of 2500
3. **Use hardware encoder** in OBS:
   - VideoToolbox (Mac)
   - Hardware encoding uses GPU instead of CPU

## Differences from Raspberry Pi

| Aspect | macOS Test | Raspberry Pi 3 | Notes |
|--------|-----------|----------------|-------|
| CPU | Intel/M1/M2 | ARM Cortex-A53 | macOS much faster |
| Architecture | x86_64/arm64 | armv7l/aarch64 | Both supported by Docker |
| Concurrent Streams | 5-10 easy | 3 recommended | Mac has more power |
| Latency | < 1s | 0.8-1.2s | Similar (localhost faster) |
| Build Time | 5-10 min | 20-30 min | Mac significantly faster |

## Cleaning Up

### Stop Services
```bash
docker-compose down
```

### Remove Everything (including images)
```bash
docker-compose down -v --rmi all
rm -rf data/
```

### Keep Data, Stop Services
```bash
docker-compose stop
```

### Restart Later
```bash
docker-compose start
```

## Next Steps After Testing

Once you've verified everything works on macOS:

1. **Copy project to Raspberry Pi**:
   ```bash
   rsync -avz --exclude 'node_modules' --exclude 'data' \
     /Users/nhnguyen/nyon/livestream-server \
     pi@192.168.1.100:/home/pi/
   ```

2. **On Raspberry Pi**:
   ```bash
   cd /home/pi/livestream-server
   bash scripts/setup.sh
   ```

3. **Update configuration**:
   - Change `SERVER_IP` to Pi's IP address
   - Regenerate JWT secret
   - Change admin password

## Tips for Testing

1. **Start simple**: Test with 1 stream first
2. **Monitor logs**: Keep logs open in terminal
3. **Check web UI**: Refresh Dashboard to see live updates
4. **Test latency**: Use timestamp overlay in OBS
5. **Try different codecs**: H.264 vs hardware encoding
6. **Test over WiFi**: Disconnect ethernet to simulate wireless
7. **Simulate Pi3**: Limit Docker resources to 1 CPU / 1GB RAM

## Common Test Scenarios

✅ **Basic functionality**:
- [ ] Web UI loads
- [ ] Can login
- [ ] Can create stream
- [ ] Can publish with OBS
- [ ] Can play in VLC
- [ ] Can disconnect stream

✅ **Authentication**:
- [ ] Wrong password rejected
- [ ] Can change password
- [ ] Invalid stream key rejected
- [ ] Token expires after 24h

✅ **Limits**:
- [ ] Max concurrent streams enforced
- [ ] Rate limiting works (5 failed logins)

✅ **Monitoring**:
- [ ] Dashboard shows stats
- [ ] Sessions update in real-time
- [ ] Can see bitrate/resolution

## Ready for Production?

After successful testing on macOS, you're ready to deploy to Raspberry Pi! The only differences will be:
- Slower build times (20-30 min vs 5-10 min)
- Lower max concurrent streams (3 vs 5-10)
- Slightly higher latency on WiFi

The Docker images and configuration are identical! 🚀
