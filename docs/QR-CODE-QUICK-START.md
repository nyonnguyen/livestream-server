# 📱 QR Code Feature - Quick Start Guide

## ✅ Feature is LIVE!

Your livestream server now has **QR code support** for mobile apps!

---

## 🎯 How to Use (3 Easy Steps)

### Step 1: Open Dashboard

```
http://192.168.2.34
(or http://localhost if testing on Mac)
```

**Login**: Use your credentials

### Step 2: Get QR Code

1. Go to **Streams** page
2. Find the stream you want to use
3. Look for the **purple QR code icon** (📱) in the action buttons
4. **Click it!**

### Step 3: Scan with Phone

1. Open your mobile streaming app (Larix Broadcaster recommended)
2. Go to **Settings** → **Connections**
3. Tap **+ Add** → **Scan QR Code**
4. Point phone at the QR code on screen
5. **Done!** Connection auto-configured ✨

---

## 📱 What You'll See

### On Desktop
- Purple QR code button appears on each stream card
- Click it → Modal opens with:
  - Large QR code (ready to scan)
  - RTMP URL
  - Playback URL
  - Instructions
  - Download button

### On Phone (Larix Broadcaster)
- QR scanner opens
- Scans the code
- Connection settings automatically filled:
  - Server: `rtmp://192.168.2.34:1935/live`
  - Stream Key: `[your_key]`
- Start streaming immediately!

---

## 🎬 Quick Test

**Test with your existing streams**:

Stream keys you have:
1. `drone001_test12345678901234567890`
2. `phone001_test12345678901234567890`
3. `camera001_test12345678901234567890`

**Complete workflow**:
```
1. Open http://192.168.2.34
2. Streams → Click QR icon on "Drone Stream 1"
3. Open Larix on phone
4. Scan QR code
5. Tap record button
6. Go to Sessions page → See your stream live!
```

---

## 📱 Recommended App: Larix Broadcaster

**Why Larix?**
- ✅ Native QR code support
- ✅ Low latency mode
- ✅ Hardware encoding
- ✅ Professional quality
- ✅ Free version available

**Download**:
- iOS: App Store → "Larix Broadcaster"
- Android: Play Store → "Larix Broadcaster"

---

## 🎨 What's New in the UI

### New Button
**Location**: Streams page, action column
**Icon**: 📱 QR Code (purple)
**Position**: Top of actions (first button)
**Tooltip**: "Show QR Code for Mobile Apps"

### New Modal
**Title**: "Mobile App QR Code"
**Layout**: 2 columns
**Features**:
- Scannable QR code
- Download as PNG
- Copy URLs
- Instructions
- Supported apps list

---

## 💡 Tips

### For Best Scanning

1. **Brightness**: Max screen brightness
2. **Distance**: 6-12 inches from screen
3. **Angle**: Straight on (no glare)
4. **Steady**: Hold phone still

### Download & Share

1. Click **"Download QR Code"** button
2. Save PNG file
3. Share via:
   - Email
   - WhatsApp/Telegram
   - AirDrop
   - Print it

### If Scanning Fails

Use manual setup shown in modal:
- **Server**: `rtmp://192.168.2.34:1935/live`
- **Stream Key**: Copy from modal

---

## 📚 More Info

- **Full guide**: `MOBILE-APP-QR-CODE.md`
- **Technical details**: `QR-CODE-FEATURE-SUMMARY.md`
- **Troubleshooting**: Check the main README

---

## ✅ Status Check

```bash
# Verify everything is running
docker-compose ps

# Should show:
# - livestream-ui: Up (port 80)
# - livestream-api: Up (port 3000)
# - livestream-srs: Up (ports 1935, 8080, etc.)
```

---

## 🚀 You're Ready!

The QR code feature is **live and working**!

**Try it now**:
1. Open: http://192.168.2.34
2. Streams page
3. Click purple QR icon
4. Scan with your phone
5. Start streaming! 🎬

**That's it!** No more typing long URLs and stream keys! 📱✨
