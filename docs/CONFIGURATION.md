# Configuration Guide

Complete guide to configuring your Livestream Server.

## Environment Variables

### Server Configuration

```bash
# Server IP address (required)
SERVER_IP=192.168.1.100

# Node environment
NODE_ENV=production
```

### Security

```bash
# JWT secret for authentication (32+ characters recommended)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-secret-key-here

# Default admin password (change after first login)
DEFAULT_ADMIN_PASSWORD=admin123
```

### Stream Configuration

```bash
# Maximum number of concurrent streams (1-20)
# Raspberry Pi 3: 3-5 recommended
# Raspberry Pi 4: 5-10 recommended
# Raspberry Pi 5: 10-20 possible
MAX_CONCURRENT_STREAMS=3

# Default stream keys (auto-generated if not specified)
DEFAULT_STREAM_KEY_1=drone001_random32characters
DEFAULT_STREAM_KEY_2=phone001_random32characters
DEFAULT_STREAM_KEY_3=camera001_random32characters
```

### Database

```bash
# SQLite database path
DB_PATH=/app/data/livestream.db
```

### SRS Configuration

```bash
# SRS HTTP API URL (internal Docker network)
SRS_HTTP_API_URL=http://srs:1985/api/v1
```

### API Configuration

```bash
# API server port
API_PORT=3000

# Rate limiting for login attempts
API_RATE_LIMIT_WINDOW=15          # Minutes
API_RATE_LIMIT_MAX_REQUESTS=5     # Max attempts per window
```

## SRS Configuration

Located at `srs/srs.conf`. Key settings for low latency:

### Latency Settings

```nginx
vhost __defaultVhost__ {
    min_latency     on;          # Enable fast path
    tcp_nodelay     on;          # Disable Nagle's algorithm
    gop_cache       1;           # Cache only 1 GOP
    queue_length    10;          # Minimal queue

    publish {
        mr          on;          # Minimum receive latency
        mr_latency  350;         # 350ms jitter buffer
    }

    play {
        mw_latency  350;         # Minimum send latency
    }
}
```

### HTTP-FLV Configuration

```nginx
http_remux {
    enabled     on;
    mount       [vhost]/[app]/[stream].flv;
    fast_cache  10;              # Fast cache for low latency
}
```

### SRT Configuration

```nginx
srt_server {
    enabled         on;
    listen          10080;
    latency         20;          # Ultra-low latency
    peerlatency     0;
    recvlatency     0;
}
```

### Webhooks

```nginx
http_hooks {
    enabled         on;
    on_publish      http://web-api:3000/api/hooks/on_publish;
    on_unpublish    http://web-api:3000/api/hooks/on_unpublish;
}
```

## Docker Compose Configuration

### Resource Limits

Adjust based on your Raspberry Pi model:

#### Raspberry Pi 3
```yaml
srs:
  mem_limit: 256m
  cpus: 1.5

web-api:
  mem_limit: 128m
  cpus: 0.5

web-ui:
  mem_limit: 64m
  cpus: 0.5
```

#### Raspberry Pi 4/5
```yaml
srs:
  mem_limit: 512m
  cpus: 2.0

web-api:
  mem_limit: 256m
  cpus: 1.0

web-ui:
  mem_limit: 128m
  cpus: 0.5
```

### Port Mapping

Default ports:
- `1935`: RTMP ingestion
- `10080`: SRT ingestion
- `1985`: SRS HTTP API
- `8080`: HTTP-FLV playback
- `3000`: Web API
- `80`: Web UI

To change:
```yaml
services:
  web-ui:
    ports:
      - "8080:80"  # Access UI on port 8080
```

## Database Configuration

### Schema

Tables are automatically created on first run:
- `users` - User accounts
- `streams` - Stream configurations
- `sessions` - Active/historical sessions
- `config` - System configuration
- `activity_log` - Audit log

### Initial Data

Created by `npm run init-db`:
- Admin user (username: admin)
- 3 default streams (drone001, phone001, camera001)
- Default configuration values

## Web UI Configuration

### Build-time Variables

Located in `web-ui/vite.config.js`:

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        flv: ['flv.js']
      }
    }
  }
}
```

### API URL

Set during build:
```bash
docker build --build-arg VITE_API_URL=http://192.168.1.100:3000 .
```

## System Configuration (via Web UI)

### Max Concurrent Streams

- **Range**: 1-20
- **Recommended**: 3 for Pi3, 5-10 for Pi4, 10-20 for Pi5
- **Impact**: CPU and RAM usage scales linearly

### Require Authentication

- **Default**: Enabled
- **Impact**: Validates stream keys via webhook
- **Disable**: For testing only (security risk)

### Allow Recording

- **Default**: Disabled
- **Impact**: Enables DVR recording to disk
- **Note**: Requires significant disk I/O, use high-endurance SD card

### Default Protocol

- **Options**: RTMP, SRT
- **Default**: RTMP
- **Impact**: Default for new streams

### Session Timeout

- **Range**: 60-3600 seconds
- **Default**: 300 seconds (5 minutes)
- **Impact**: Inactive sessions auto-disconnect

## Performance Tuning

### For Lower Latency (< 500ms)

1. Use SRT protocol
2. Set `latency 0` in SRT config
3. Use wired ethernet
4. Minimize keyframe interval (1-2 seconds)

### For Higher Quality

1. Increase `max_bitrate` per stream
2. Increase `gop_cache` to 2-3
3. Use H.264 High profile
4. Consider Pi4/Pi5 for transcoding

### For More Streams

1. Reduce per-stream bitrate (2-3 Mbps)
2. Use relay mode only (no transcoding)
3. Upgrade to Pi4/Pi5
4. Use wired ethernet for all streams

## Security Configuration

### Password Policy

Enforced in web UI:
- Minimum 8 characters
- Must change on first login
- Must differ from previous password

### Stream Keys

- Auto-generated: 32 characters (prefix + random)
- Can be custom set
- Regenerate regularly for security
- Grace period: Consider old/new key overlap

### JWT Tokens

- Expiration: 24 hours
- Stored in localStorage
- Cleared on logout
- Auto-refresh not implemented (manual re-login)

### Rate Limiting

Login endpoint:
- 5 attempts per 15 minutes per IP
- Returns 429 Too Many Requests when exceeded
- Resets after window expires

## Network Configuration

### Firewall Rules

Required ports:
```bash
# RTMP
sudo ufw allow 1935/tcp

# SRT
sudo ufw allow 10080/udp

# HTTP-FLV
sudo ufw allow 8080/tcp

# Web UI
sudo ufw allow 80/tcp

# Optional: API (if external access needed)
sudo ufw allow 3000/tcp
```

### Static IP

Configure in Raspberry Pi OS:
```bash
# Edit /etc/dhcpcd.conf
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

### DNS Configuration

Optional, for accessing via hostname:
```bash
# Add to /etc/hosts on client machines
192.168.1.100  livestream.local
```

## Logging Configuration

### SRS Logs

Configure verbosity in `srs.conf`:
```nginx
srs_log_level info;  # Options: trace, debug, info, warn, error
```

View logs:
```bash
docker-compose logs -f srs
```

### API Logs

Environment-based:
- `development`: Detailed logs with request/response
- `production`: Minimal logs (errors only)

View logs:
```bash
docker-compose logs -f web-api
```

### Access Logs

Nginx access logs for web UI:
```bash
docker-compose logs -f web-ui
```

## Backup Configuration

### Database Backup

Manual:
```bash
docker-compose exec web-api cp /app/data/livestream.db /app/data/backup.db
docker cp livestream-api:/app/data/backup.db ./backup.db
```

Automated (cron):
```bash
# Add to crontab
0 2 * * * docker-compose -f /path/to/docker-compose.yml exec web-api cp /app/data/livestream.db /app/data/backup-$(date +\%Y\%m\%d).db
```

### Configuration Backup

```bash
# Backup .env and custom configs
tar -czf config-backup.tar.gz .env srs/srs.conf docker-compose.yml
```

## Advanced Configuration

### Transcoding (Pi4/Pi5 only)

Enable in `srs.conf`:
```nginx
vhost __defaultVhost__ {
    transcode {
        enabled     on;
        ffmpeg      /usr/local/bin/ffmpeg;

        engine low {
            enabled         on;
            vcodec          libx264;
            vbitrate        500;
            vfps            15;
            vwidth          640;
            vheight         360;
            vthreads        2;
            vprofile        baseline;
            vpreset         ultrafast;
        }
    }
}
```

### WebRTC (Future)

Not supported on Pi3, possible on Pi4/Pi5:
```nginx
rtc_server {
    enabled on;
    listen 8000;
    candidate $CANDIDATE;
}
```

### HLS (Higher Latency)

If HTTP-FLV not supported by clients:
```nginx
hls {
    enabled         on;
    hls_fragment    2;
    hls_window      10;
    hls_path        /tmp/hls;
}
```
