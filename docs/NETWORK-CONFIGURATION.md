# Network Configuration Guide

## Overview

The livestream server now supports flexible network IP configuration with automatic detection and manual override. This ensures QR codes and stream URLs use the correct IP address for your network.

---

## Features

### 1. **Show All Network Interfaces**
- Lists ALL detected interfaces (Ethernet, WiFi, Docker)
- Color-coded by type:
  - **Green**: Ethernet (highest priority, recommended)
  - **Blue**: WiFi (second priority)
  - **Orange**: Docker Internal (not accessible from other devices)
  - **Gray**: Other interfaces
- One-click selection for manual configuration

### 2. **Smart IP Detection**
- **Auto Mode**: Automatically selects best IP (Ethernet > WiFi > Other, excludes Docker)
- **Manual Mode**: User selects specific IP address
- **Client IP Detection**: Suggests your device's IP when accessing the dashboard

### 3. **IP Filtering**
- **Accepts**: Valid LAN addresses only
  - 192.168.x.x
  - 10.x.x.x
  - 172.16.x.x - 172.31.x.x
- **Rejects**:
  - 127.x.x.x (loopback/localhost)
  - Link-local addresses
  - Public IPs

### 4. **Immediate URL Updates**
- All URLs update automatically after saving settings:
  - Stream URLs (RTMP/SRT)
  - Playback URLs (HTTP-FLV)
  - QR codes
  - Mobile stream pages
- No page reload required

---

## Configuration Guide

### On macOS (Development/Testing)

Since the API runs in Docker, it can only see Docker's internal network. You must use **Manual Mode**:

1. **Find Your Mac's IP Address**:
   ```bash
   # WiFi
   ipconfig getifaddr en0

   # Ethernet
   ipconfig getifaddr en1

   # All IPs
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Configure in Dashboard**:
   - Login: http://localhost/
   - Go to: **Settings** → **Network Settings**
   - Select: **Manual IP Address**
   - Enter: Your Mac's LAN IP (e.g., `192.168.1.55`)
   - Click: **Save Changes**

3. **Verify**:
   - Go to **Streams** page
   - Check that URLs show your IP instead of "localhost"
   - Example: `rtmp://192.168.1.55:1935/live/[key]`

### On Raspberry Pi (Production)

The system can see real network interfaces. **Auto Mode** works perfectly:

1. **Connect Pi to Network**:
   - Ethernet cable (recommended), or
   - WiFi connection

2. **Configure in Dashboard**:
   - Go to: **Settings** → **Network Settings**
   - Select: **Auto-detect (Recommended)**
   - Click: **Save Changes**

3. **System Automatically**:
   - Detects all interfaces
   - Prioritizes: Ethernet > WiFi > Others
   - Uses the best available IP
   - Updates all URLs instantly

---

## Network Settings UI

### Available Interfaces Section

Shows all detected network interfaces:

```
┌─────────────────────────────────────────────────────┐
│ eth0          [Recommended]                         │
│ ETHERNET - 192.168.1.100                 [Use This IP] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ wlan0                                                │
│ WIFI - 192.168.1.101                      [Use This IP] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ eth0          [Internal Only]                        │
│ DOCKER INTERNAL - 172.18.0.3                         │
│ ⚠️ Docker container IP - not accessible from other devices │
└─────────────────────────────────────────────────────┘
```

### IP Detection Modes

**Auto-detect Mode** (Default):
- Automatically uses the best available LAN IP
- Priority: Ethernet > WiFi > Others
- Excludes Docker internal IPs
- Perfect for Raspberry Pi

**Manual Mode**:
- Specify any custom IP address
- Click "Use This IP" on any interface to select it
- Or type IP manually
- Required when running in Docker on macOS

---

## API Endpoints

### Get Network Interfaces
```bash
GET /api/network/interfaces
```

Response:
```json
{
  "success": true,
  "data": {
    "interfaces": [
      {
        "name": "eth0",
        "address": "192.168.1.100",
        "type": "ethernet",
        "priority": 1,
        "label": "Ethernet",
        "netmask": "255.255.0.0",
        "mac": "xx:xx:xx:xx:xx:xx"
      }
    ],
    "recommended": "192.168.1.100",
    "clientIP": "192.168.1.55"
  }
}
```

### Get Current Server IP
```bash
GET /api/network/server-ip
```

Response:
```json
{
  "success": true,
  "data": {
    "ip": "192.168.1.100"
  }
}
```

### Update Network Configuration
```bash
PUT /api/network/config
Content-Type: application/json

{
  "server_ip_mode": "manual",
  "server_ip_address": "192.168.1.100"
}
```

---

## URL Behavior

### Before Configuration
- URLs show: `rtmp://localhost:1935/live/[key]`
- Works only on same machine
- QR codes don't work from phones

### After Configuration
- URLs show: `rtmp://192.168.1.100:1935/live/[key]`
- Works from any device on LAN
- QR codes work perfectly
- Mobile apps can connect

### Where URLs Are Used

1. **Streams Page** (web-ui/src/pages/Streams.jsx):
   - Publish URL: `rtmp://[IP]:1935/live/[key]`
   - Playback URL: `http://[IP]:8080/live/[key].flv`

2. **QR Code Modal** (web-ui/src/components/QRCodeModal.jsx):
   - QR contains: `http://[IP]/mobile/[key]`
   - Shows RTMP URL: `rtmp://[IP]:1935/live/[key]`

3. **Mobile Stream Page** (web-ui/src/pages/MobileStream.jsx):
   - Auto-copies: `rtmp://[IP]:1935/live/[key]`
   - Displays playback: `http://[IP]:8080/live/[key].flv`

---

## Technical Details

### Network Detection Logic

```javascript
// Priority order
1. Ethernet (eth0, en0, ens33) - Priority 1
2. WiFi (wlan0, en1, wlp2s0)   - Priority 2
3. Other interfaces             - Priority 3
4. Docker (172.18.x.x)         - Priority 4 (excluded from auto-detect)
```

### IP Validation

```javascript
isValidLANAddress(ip) {
  // Accept: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
  // Reject: 127.x.x.x (loopback)
  // Show but warn: Docker IPs (for transparency)
}
```

### Client IP Detection

The system tries to detect your device's IP from HTTP requests:

1. `X-Forwarded-For` header
2. `X-Real-IP` header
3. Socket remote address
4. Filters for valid LAN addresses

This is used to pre-fill the IP address input when you access Settings.

---

## Troubleshooting

### Issue: "No network interfaces detected"

**Cause**: Running in Docker on macOS - container can't see host interfaces

**Solution**: Use Manual Mode:
1. Find your Mac's IP: `ifconfig | grep "inet " | grep -v 127`
2. Enter it manually in Settings
3. Save changes

### Issue: URLs still show "localhost"

**Cause**: Configuration not saved or page not refreshed after fetch

**Solution**:
1. Go to Settings → Network Settings
2. Select Manual mode
3. Enter your LAN IP
4. Click "Save Changes"
5. Go back to Streams page
6. URLs should now show your IP

If still showing localhost:
1. Check browser console for errors
2. Verify API is returning correct IP: `curl localhost:3000/api/network/server-ip`
3. Hard refresh the page (Cmd+Shift+R)

### Issue: QR codes don't work

**Cause**: IP address is internal (127.x.x.x or 172.x.x.x)

**Solution**:
1. Ensure you're using a valid LAN IP (192.168.x.x or 10.x.x.x)
2. Verify in Settings → Network Settings
3. Regenerate QR code (click the purple icon again)

### Issue: Mobile app can't connect

**Checklist**:
- ✅ Phone on same WiFi network as server
- ✅ IP address is correct (not localhost)
- ✅ Stream is active (toggle in Streams page)
- ✅ Stream key is correct
- ✅ Firewall allows port 1935 (RTMP)

---

## Production Deployment (Raspberry Pi)

### Recommended Setup

1. **Use Ethernet**: Most stable, highest priority
2. **Static IP**: Configure router to assign static IP to Pi
3. **Auto Mode**: Let system detect best interface
4. **Verify**: Check Settings → Network Settings shows correct IP

### Example Configuration

```bash
# On Raspberry Pi
# 1. Set static IP (optional but recommended)
sudo nano /etc/dhcpcd.conf

# Add:
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1

# 2. Restart networking
sudo systemctl restart dhcpcd

# 3. Deploy application
cd /home/pi/livestream-server
docker-compose up -d

# 4. Access dashboard and verify
# http://192.168.1.100
# Settings → Network Settings
# Should show: Auto-detect, eth0, 192.168.1.100
```

---

## Summary

### For Testing (macOS + Docker):
- ✅ Use **Manual Mode**
- ✅ Enter your Mac's LAN IP
- ✅ System shows Docker interface (with warning)
- ✅ URLs update immediately

### For Production (Raspberry Pi):
- ✅ Use **Auto-detect Mode**
- ✅ System detects real interfaces
- ✅ Prioritizes Ethernet > WiFi
- ✅ Zero configuration needed

### Key Benefits:
- 🎯 No more localhost URLs
- 📱 QR codes work from any phone
- 🔄 Automatic updates after saving
- 👀 See all interfaces with clear labels
- ⚙️ Flexible manual override when needed

---

## Related Documentation

- **QR-CODE-QUICK-START.md** - How to use QR codes
- **QR-CODE-FEATURE-SUMMARY.md** - QR code implementation details
- **MOBILE-APP-QR-CODE.md** - Mobile app integration guide
