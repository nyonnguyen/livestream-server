# Troubleshooting Guide

Common issues and solutions for Livestream Server.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Connection Issues](#connection-issues)
- [Streaming Issues](#streaming-issues)
- [Performance Issues](#performance-issues)
- [Authentication Issues](#authentication-issues)
- [Web UI Issues](#web-ui-issues)
- [Docker Issues](#docker-issues)

## Installation Issues

### Docker Compose Failed to Start

**Symptoms:**
```
ERROR: Version in "./docker-compose.yml" is unsupported
```

**Solution:**
Update Docker Compose to version 1.27.0 or higher:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Database Initialization Failed

**Symptoms:**
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Solution:**
1. Check data directory permissions:
   ```bash
   sudo chown -R 1000:1000 ./data
   chmod 755 ./data
   ```

2. Ensure data directory exists:
   ```bash
   mkdir -p ./data
   ```

3. Re-run initialization:
   ```bash
   docker-compose restart web-api
   docker exec -it livestream-api npm run init-db
   ```

### Port Already in Use

**Symptoms:**
```
ERROR: for srs  Cannot start service srs: driver failed programming external connectivity
Bind for 0.0.0.0:1935 failed: port is already allocated
```

**Solution:**
1. Find process using the port:
   ```bash
   sudo lsof -i :1935
   ```

2. Stop conflicting service or change port in `docker-compose.yml`:
   ```yaml
   ports:
     - "11935:1935"  # Use different external port
   ```

## Connection Issues

### Cannot Connect to Stream

**Symptoms:**
- OBS shows "Failed to connect to server"
- FFmpeg shows connection refused

**Diagnosis:**
```bash
# Check if SRS is running
docker ps | grep srs

# Check SRS logs
docker-compose logs srs | tail -50

# Test RTMP port
telnet <SERVER_IP> 1935
```

**Solutions:**

1. **Verify stream key is correct**
   - Copy exact key from web UI
   - Check for extra spaces or characters

2. **Check stream is enabled**
   ```bash
   # Via web UI: Streams page, verify "Active" status
   ```

3. **Verify firewall rules**
   ```bash
   sudo ufw status
   sudo ufw allow 1935/tcp
   sudo ufw allow 10080/udp
   ```

4. **Check max concurrent streams**
   - Default is 3 streams
   - Increase in Settings if needed

### Stream Key Rejected

**Symptoms:**
- Connection immediately closes
- Log shows: "Stream key validation failed"

**Solutions:**

1. **Regenerate stream key**
   - Go to Streams page
   - Click regenerate icon
   - Use new key

2. **Check stream is active**
   ```bash
   # Web UI: Streams page → Enable toggle
   ```

3. **Verify webhook is working**
   ```bash
   docker-compose logs web-api | grep on_publish
   ```

4. **Check authentication requirement**
   ```bash
   # Settings → Require Authentication
   # Temporarily disable for testing
   ```

## Streaming Issues

### High Latency (> 3 seconds)

**Symptoms:**
- Noticeable delay between publisher and viewer
- Measured latency exceeds 3 seconds

**Solutions:**

1. **Use HTTP-FLV instead of HLS**
   - HLS: 6-30 seconds latency
   - HTTP-FLV: 0.5-1.5 seconds latency

2. **Optimize OBS settings**
   ```
   Output → Streaming
   - Encoder: x264
   - Rate Control: CBR
   - Bitrate: 2500-5000 kbps
   - Keyframe Interval: 2 seconds

   Advanced → Video
   - CPU Usage Preset: veryfast or faster
   ```

3. **Use wired ethernet**
   - WiFi adds 50-200ms latency
   - WiFi can cause jitter and packet loss

4. **Reduce network hops**
   - Publisher and Pi on same LAN
   - Avoid VPN or proxy

5. **Check SRS latency settings**
   ```nginx
   # In srs.conf, verify:
   min_latency     on;
   tcp_nodelay     on;
   gop_cache       1;
   ```

### Choppy/Stuttering Video

**Symptoms:**
- Video freezes or stutters
- Frame drops in player

**Solutions:**

1. **Check network bandwidth**
   ```bash
   # Test speed between publisher and Pi
   iperf3 -s  # On Pi
   iperf3 -c <PI_IP> -t 30  # On publisher
   ```

2. **Reduce bitrate**
   - Lower bitrate in OBS (2500 kbps recommended)
   - Reduce resolution (720p instead of 1080p)

3. **Check CPU usage**
   ```bash
   docker stats
   # If SRS > 80%, reduce concurrent streams
   ```

4. **Verify codec compatibility**
   - Use H.264 video (not H.265)
   - Use AAC audio (not MP3)

### No Audio

**Symptoms:**
- Video works but no audio
- Player shows video only

**Solutions:**

1. **Check audio codec**
   - Must be AAC
   - Not MP3, AC3, or other codecs

2. **Verify audio track in source**
   ```bash
   ffprobe -i <source>
   # Should show audio stream
   ```

3. **Check OBS audio settings**
   ```
   Audio → Advanced
   - Audio Encoder: AAC
   - Audio Bitrate: 128 kbps
   ```

### Stream Disconnects Randomly

**Symptoms:**
- Stream drops after 5-15 minutes
- Need to reconnect frequently

**Solutions:**

1. **Check network stability**
   ```bash
   ping -c 100 <PI_IP>
   # Should have < 1% packet loss
   ```

2. **Increase session timeout**
   - Settings → Session Timeout
   - Increase to 600 seconds (10 minutes)

3. **Check for memory issues**
   ```bash
   free -m
   # Should have > 200MB available
   ```

4. **Review SRS logs for errors**
   ```bash
   docker-compose logs srs | grep -i error
   ```

## Performance Issues

### High CPU Usage

**Symptoms:**
- CPU consistently > 80%
- System feels sluggish
- Streams stutter

**Solutions:**

1. **Verify relay mode (no transcoding)**
   ```nginx
   # In srs.conf, transcode should be disabled
   # or not present
   ```

2. **Reduce concurrent streams**
   - Settings → Max Concurrent Streams
   - Reduce to 2 or 1

3. **Lower bitrate per stream**
   - Max bitrate per stream: 2500 kbps
   - Total bandwidth < 10 Mbps

4. **Check for rogue processes**
   ```bash
   top -o %CPU
   # Kill unnecessary processes
   ```

### High Memory Usage

**Symptoms:**
- System shows > 900MB RAM used
- Containers being killed (OOM)

**Solutions:**

1. **Check container limits**
   ```bash
   docker stats
   # Verify no container exceeds limit
   ```

2. **Reduce memory limits if needed**
   ```yaml
   # In docker-compose.yml
   srs:
     mem_limit: 128m  # Reduce from 256m for testing
   ```

3. **Clear old sessions**
   ```bash
   docker exec -it livestream-api sqlite3 /app/data/livestream.db
   DELETE FROM sessions WHERE ended_at < datetime('now', '-7 days');
   .quit
   ```

### Slow Web UI

**Symptoms:**
- Dashboard takes > 5 seconds to load
- Pages feel sluggish

**Solutions:**

1. **Check API response time**
   ```bash
   curl -w "@-" -o /dev/null -s http://<PI_IP>:3000/api/health
   # Should respond < 100ms
   ```

2. **Reduce auto-refresh frequency**
   - Edit `Dashboard.jsx` and `Sessions.jsx`
   - Change refresh interval from 5000 to 10000 (10 seconds)

3. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Authentication Issues

### Cannot Login

**Symptoms:**
- "Invalid username or password" error
- Correct credentials don't work

**Solutions:**

1. **Reset password via CLI**
   ```bash
   docker exec -it livestream-api npm run reset-password admin newpassword123
   ```

2. **Check database**
   ```bash
   docker exec -it livestream-api sqlite3 /app/data/livestream.db
   SELECT username, is_active FROM users;
   .quit
   ```

3. **Verify API is running**
   ```bash
   curl http://<PI_IP>:3000/api/health
   # Should return {"success":true}
   ```

### Token Expired

**Symptoms:**
- Suddenly logged out
- "Token expired" error

**Solutions:**

1. **Login again**
   - Tokens expire after 24 hours
   - This is expected behavior

2. **Clear localStorage**
   ```javascript
   // In browser console
   localStorage.clear();
   location.reload();
   ```

### Rate Limited

**Symptoms:**
- "Too many login attempts" error
- Cannot login for 15 minutes

**Solutions:**

1. **Wait 15 minutes**
   - Rate limit resets after window

2. **Temporarily disable rate limiting**
   ```bash
   # In .env
   API_RATE_LIMIT_MAX_REQUESTS=100
   docker-compose restart web-api
   ```

## Web UI Issues

### Blank Page

**Symptoms:**
- White screen
- No error message

**Solutions:**

1. **Check browser console**
   - Press F12 → Console tab
   - Look for JavaScript errors

2. **Clear cache and hard refresh**
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)

3. **Check web-ui container**
   ```bash
   docker-compose logs web-ui
   docker-compose restart web-ui
   ```

### Cannot See Streams

**Symptoms:**
- Streams page shows empty
- API returns streams but UI doesn't display

**Solutions:**

1. **Check API URL configuration**
   ```javascript
   // In browser console
   console.log(import.meta.env.VITE_API_URL)
   ```

2. **Verify API is accessible**
   ```bash
   curl http://<PI_IP>:3000/api/streams \
     -H "Authorization: Bearer <token>"
   ```

3. **Check CORS**
   ```bash
   # In browser console, look for CORS errors
   # If found, check web-api CORS config
   ```

## Docker Issues

### Container Won't Start

**Symptoms:**
- `docker-compose up` fails
- Container exits immediately

**Solutions:**

1. **Check logs**
   ```bash
   docker-compose logs <container-name>
   ```

2. **Verify environment variables**
   ```bash
   docker-compose config
   # Check all variables are set
   ```

3. **Remove and rebuild**
   ```bash
   docker-compose down -v
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Cannot Connect to Database

**Symptoms:**
- API logs show "SQLITE_CANTOPEN"
- Database errors on startup

**Solutions:**

1. **Check volume mount**
   ```bash
   docker-compose exec web-api ls -la /app/data
   ```

2. **Recreate volume**
   ```bash
   docker-compose down -v
   docker volume rm livestream-server_data
   docker-compose up -d
   docker exec -it livestream-api npm run init-db
   ```

### Out of Disk Space

**Symptoms:**
- "no space left on device" errors
- Containers won't start

**Solutions:**

1. **Check disk usage**
   ```bash
   df -h
   docker system df
   ```

2. **Clean up Docker**
   ```bash
   docker system prune -a --volumes
   ```

3. **Remove old images**
   ```bash
   docker images
   docker rmi <old-image-id>
   ```

## Diagnostic Commands

### System Health Check

```bash
# Check all services
docker-compose ps

# Check resource usage
docker stats

# Check network connectivity
ping 8.8.8.8

# Check disk space
df -h

# Check memory
free -m

# Check CPU temperature (Raspberry Pi)
vcgencmd measure_temp
```

### SRS Diagnostics

```bash
# SRS API status
curl http://<PI_IP>:1985/api/v1/versions

# Active streams
curl http://<PI_IP>:1985/api/v1/streams/

# Connected clients
curl http://<PI_IP>:1985/api/v1/clients/
```

### API Diagnostics

```bash
# Health check
curl http://<PI_IP>:3000/api/health

# Test authentication
curl -X POST http://<PI_IP>:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Get config
curl http://<PI_IP>:3000/api/config/health
```

## Getting Help

### Collect Debug Information

Before asking for help, collect:

1. **System information**
   ```bash
   uname -a
   cat /etc/os-release
   docker --version
   docker-compose --version
   ```

2. **Service logs**
   ```bash
   docker-compose logs > logs.txt
   ```

3. **Configuration**
   ```bash
   docker-compose config > config.txt
   # Remove sensitive information before sharing
   ```

4. **Resource usage**
   ```bash
   free -m > resources.txt
   df -h >> resources.txt
   vcgencmd measure_temp >> resources.txt
   ```

### Community Support

- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Discord: [Join server](#)
- Forum: [Discussion board](#)

### Commercial Support

For commercial deployments or custom features:
- Email: support@example.com
- Professional services available
