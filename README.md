# Nyon Livestream Server

**Version:** 0.9.0-beta | **Author:** Nyon (nyonnguyen@gmail.com) | **License:** MIT

A complete livestream solution running on Raspberry Pi 3+, supporting RTMP/SRT ingestion with HTTP-FLV playback. Achieves sub-second latency with minimal CPU usage through relay mode (no transcoding).

> **Non-Profit Project**: Free and open-source software for the community.

## Features

- **Low Latency Streaming**: < 1 second glass-to-glass latency via HTTP-FLV
- **Multiple Protocols**: RTMP and SRT ingestion support
- **Web Dashboard**: Manage streams, monitor sessions, configure settings
- **Built-in Help**: Comprehensive in-app user guide and troubleshooting
- **Authentication**: Secure stream publishing with stream keys
- **Resource Efficient**: Optimized for Raspberry Pi 3 (relay mode, no transcoding)
- **Docker-based**: Easy deployment with docker-compose
- **RESTful API**: Full-featured API for integrations
- **QR Code Sharing**: Generate QR codes for easy mobile stream access

## Tech Stack

- **SRS 5**: Streaming server (RTMP, SRT, HTTP-FLV)
- **Node.js + Express**: Web API server
- **React + Vite**: Modern web UI
- **SQLite**: Configuration and session data
- **Nginx**: Reverse proxy
- **Docker**: Containerization

## Quick Start

![Build Status](https://github.com/nyonnguyen/livestream-server/actions/workflows/build-and-publish.yml/badge.svg)

### ⚡ One-Command Installation (Easiest)

Install everything with a single command on your Raspberry Pi:

```bash
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

**What it does:**
- ✅ Installs Docker and Docker Compose (if needed)
- ✅ Downloads and configures the application
- ✅ Generates secure credentials
- ✅ Starts all services
- ✅ **Enables auto-start on boot**
- ✅ Takes 5-15 minutes

**After installation**, access your server at `http://YOUR_PI_IP` and login with the credentials shown.

📖 **Full installation guide:** [INSTALL.md](INSTALL.md)

---

### Manual Installation Options

#### Option 1: Use Pre-built Images (Recommended)

Use official Docker images from GitHub Container Registry:

```bash
# 1. Clone repository for config files
git clone https://github.com/nyonnguyen/livestream-server.git
cd livestream-server

# 2. Create environment file
cp .env.example .env
nano .env  # Configure your settings

# 3. Deploy with pre-built images
docker-compose -f docker-compose.prod.yml up -d
```

**Benefits:**
- ✅ No build time required (~10 minutes saved)
- ✅ Pre-tested images
- ✅ Automatic multi-platform support (amd64/arm64)
- ✅ Faster deployment

#### Option 2: Build from Source

Build Docker images locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/nyonnguyen/livestream-server.git
   cd livestream-server
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   nano .env
   ```

   Update the following variables:
   - `SERVER_IP`: Your Raspberry Pi's IP address
   - `JWT_SECRET`: Generate with `openssl rand -base64 32`
   - `DEFAULT_ADMIN_PASSWORD`: Change from default
   - Stream keys (optional, will be auto-generated)

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Initialize the database**
   ```bash
   docker exec -it livestream-api npm run init-db
   ```

5. **Access the web UI**
   - Open browser: `http://<SERVER_IP>/`
   - Login with: `admin` / `<DEFAULT_ADMIN_PASSWORD>`
   - Change password immediately!

## Web Interface

The dashboard provides the following pages:

- **Dashboard** (`/`) - Overview of active streams and system stats
- **Streams** (`/streams`) - Manage streams (create, edit, delete, view URLs)
- **Sessions** (`/sessions`) - Monitor active streaming sessions
- **Settings** (`/settings`) - Configure system settings and change password
- **Help** (`/help`) - Comprehensive user guide with examples
- **About** (`/about`) - Project information, version, and credits

### First-Time Setup

1. Login with default credentials
2. Navigate to **Settings** → Change your password
3. Visit **Help** page for detailed usage instructions
4. Check **About** page for version information

## Publishing Streams

### Using OBS Studio

1. Go to **Settings** → **Stream**
2. Configure:
   - Service: Custom
   - Server: `rtmp://<SERVER_IP>:1935/live`
   - Stream Key: (copy from web UI)
3. Click **Start Streaming**

### Using FFmpeg

```bash
# RTMP publishing
ffmpeg -re -i video.mp4 -c copy -f flv rtmp://<SERVER_IP>:1935/live/<STREAM_KEY>

# SRT publishing
ffmpeg -re -i video.mp4 -c copy -f mpegts srt://<SERVER_IP>:10080?streamid=<STREAM_KEY>
```

### Mobile Apps

- **Larix Broadcaster** (iOS/Android)
  - Connection: RTMP
  - URL: `rtmp://<SERVER_IP>:1935/live/<STREAM_KEY>`

- **prism live studio** (Android)
  - Custom RTMP server
  - URL: `rtmp://<SERVER_IP>:1935/live`
  - Stream Key: (from web UI)

## Playback

### Using OBS

1. Add **Media Source**
2. Input: `http://<SERVER_IP>:8080/live/<STREAM_KEY>.flv`
3. Uncheck "Local File"

### Using VLC

1. **Media** → **Open Network Stream**
2. URL: `http://<SERVER_IP>:8080/live/<STREAM_KEY>.flv`

### Web Player (flv.js)

See web UI Stream Preview for live playback in browser.

## Architecture

```
┌─────────────────┐
│   Publishers    │
│ (OBS/Phone/etc) │
└────────┬────────┘
         │ RTMP/SRT
         ▼
┌─────────────────┐
│   SRS Server    │
│  (Port 1935)    │
│  (Port 10080)   │
└────────┬────────┘
         │ HTTP-FLV
         │ Webhooks
         ▼
┌─────────────────┐      ┌─────────────────┐
│   Web API       │◄────►│   Web UI        │
│  (Port 3000)    │      │  (Port 80)      │
└────────┬────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│   SQLite DB     │
└─────────────────┘
```

## Configuration

### Stream Limits

Edit in `.env`:
```bash
MAX_CONCURRENT_STREAMS=3  # Increase for Pi4/Pi5
```

Or via web UI: **Settings** → **Max Concurrent Streams**

### Low Latency Tuning

Already optimized in `srs/srs.conf`:
- `min_latency on` - Fast path
- `tcp_nodelay on` - No buffering
- `gop_cache 1` - Minimal cache
- `mr on` - Minimum receive latency

### Security

1. Change default admin password immediately
2. Regenerate stream keys regularly
3. Use strong JWT secret (32+ characters)
4. Disable unused streams

## Resource Usage

**Expected on Raspberry Pi 3:**
- CPU: 20-30% with 3 concurrent streams (relay mode)
- RAM: ~450MB for all containers
- Network: ~15 Mbps for 3x 5Mbps streams

**Per stream (relay mode):**
- CPU: < 5%
- RAM: ~80MB

## Management

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f srs
docker-compose logs -f web-api
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart srs
```

### Reset Password

```bash
docker exec -it livestream-api npm run reset-password admin newpassword123
```

### Backup Database

```bash
cp data/livestream.db data/livestream.db.backup
```

## Updating the Server

### Automatic Update (Recommended)

Use the included update script to safely update your server:

```bash
cd /opt/livestream-server
./update.sh
```

**What it does:**
- ✅ Shows what changes will be applied
- ✅ Asks for confirmation before updating
- ✅ Backs up your configuration (.env)
- ✅ Checks for uncommitted changes
- ✅ Pulls latest code from GitHub
- ✅ Updates Docker images
- ✅ Restarts services
- ✅ Shows status and rollback instructions

**Update to a specific branch:**
```bash
./update.sh branch-name
```

### Manual Update

If you prefer manual control:

```bash
# 1. Navigate to installation directory
cd /opt/livestream-server

# 2. Pull latest code
git pull origin main

# 3. Pull latest Docker images
docker compose pull

# 4. Restart services
docker compose up -d

# 5. Verify services are running
docker compose ps
```

### Check for Updates in Web UI

1. Navigate to **About** page in the web interface
2. Click **Check for Updates** button
3. If updates are available, follow the displayed instructions

### Rollback to Previous Version

If you encounter issues after updating:

```bash
# 1. View recent commits
git log --oneline -10

# 2. Checkout previous version
git checkout <commit-hash>

# 3. Restore backed up config (if needed)
cp .env.backup.* .env

# 4. Restart services
docker compose restart
```

## API Documentation

### Authentication

**Login**
```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}
```

**Change Password**
```bash
PUT /api/auth/change-password
Authorization: Bearer <token>
{
  "oldPassword": "old",
  "newPassword": "new"
}
```

### Streams

**List Streams**
```bash
GET /api/streams
Authorization: Bearer <token>
```

**Create Stream**
```bash
POST /api/streams
Authorization: Bearer <token>
{
  "name": "My Stream",
  "description": "Description",
  "protocol": "rtmp",
  "max_bitrate": 5000
}
```

**Regenerate Stream Key**
```bash
POST /api/streams/:id/regenerate-key
Authorization: Bearer <token>
```

### Sessions

**Active Sessions**
```bash
GET /api/sessions
Authorization: Bearer <token>
```

**Disconnect Session**
```bash
DELETE /api/sessions/:id
Authorization: Bearer <token>
```

See [API.md](./API.md) for complete documentation.

## Troubleshooting

### Stream won't connect

1. Check stream key is correct
2. Verify stream is enabled in web UI
3. Check max concurrent streams limit
4. View SRS logs: `docker-compose logs srs`

### High latency

1. Ensure using HTTP-FLV (not HLS)
2. Check network between publisher and Pi
3. Use wired ethernet (not WiFi)
4. Reduce keyframe interval in OBS (2 seconds)

### High CPU usage

1. Check transcoding is disabled (relay mode)
2. Reduce number of concurrent streams
3. Lower bitrate from publishers
4. Verify codecs are compatible (H.264 + AAC)

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more.

## Upgrade Path

### For Raspberry Pi 4/5

Unlock additional features:
- Increase `MAX_CONCURRENT_STREAMS` to 10+
- Enable transcoding for adaptive bitrate
- Add WebRTC support (< 500ms latency)
- Enable GPU acceleration
- Add recording/DVR

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Test on Raspberry Pi
4. Submit pull request

## License

MIT License - see LICENSE file

## Credits

- [SRS](https://github.com/ossrs/srs) - Streaming server
- [flv.js](https://github.com/bilibili/flv.js) - FLV player

## Documentation

- **[INSTALL.md](./INSTALL.md)** - ⚡ One-command installation guide (recommended)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete installation and deployment guide
- **[TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)** - Architecture and technical details
- **[CI-CD.md](./CI-CD.md)** - CI/CD pipeline and Docker image publishing
- **[NEW_FEATURES.md](./NEW_FEATURES.md)** - Latest features and updates
- **[SRT_FIX.md](./SRT_FIX.md)** - SRT protocol configuration and troubleshooting
- **In-App Help** - Visit `/help` in the web interface for user guide

## Support

- **Email:** nyonnguyen@gmail.com
- **In-App:** Click "Help" in the sidebar for comprehensive guide
- **Issues:** GitHub Issues (coming soon)

## Author

**Nyon** (nyonnguyen@gmail.com)

This is a non-profit project created for the maker and Raspberry Pi community. Enjoy streaming!
