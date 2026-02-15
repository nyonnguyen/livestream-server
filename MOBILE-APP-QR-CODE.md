# 📱 Mobile App QR Code Feature

The web dashboard now supports **QR codes** for easy mobile app configuration! Scan with your phone to instantly add RTMP connection settings to Larix Broadcaster, prism live studio, and other streaming apps.

## ✨ What's New

Added QR code generation for each stream, making it super easy to configure mobile streaming apps without typing long URLs and stream keys.

## 🎯 How to Use

### Step 1: Access the Web Dashboard

1. Open your browser: **http://192.168.2.34** (or localhost if testing)
2. Login with your credentials
3. Go to **Streams** page

### Step 2: Generate QR Code

1. Find the stream you want to use
2. Click the **purple QR code icon** (📱) in the action buttons
3. A modal will appear with:
   - QR code (ready to scan)
   - RTMP URL
   - Playback URL
   - Instructions for mobile apps

### Step 3: Scan with Mobile App

#### For Larix Broadcaster (iOS/Android)

1. Open **Larix Broadcaster** app
2. Tap **Settings** (gear icon)
3. Tap **Connections**
4. Tap **+** to add new connection
5. Tap **Scan QR Code**
6. Point camera at QR code on screen
7. Connection auto-configured! ✅

#### For prism live studio (Android)

1. Open **prism live studio** app
2. Tap **Settings**
3. Tap **Add Platform**
4. Choose **Custom RTMP**
5. Tap **Scan QR Code** icon
6. Scan the QR code
7. Ready to stream! ✅

#### For CameraFi Live

1. Open **CameraFi Live** app
2. Tap **Broadcast** settings
3. Tap **Custom RTMP**
4. Look for QR code scanner icon
5. Scan the code
6. Start broadcasting! ✅

#### For Streamlabs Mobile

1. Open **Streamlabs** app
2. Go to **Settings** → **Stream**
3. Select **Custom RTMP**
4. Use **Scan QR** option if available
5. Or manually enter the URL shown

## 📲 What the QR Code Contains

The QR code encodes the complete RTMP URL:

```
rtmp://192.168.2.34:1935/live/[your_stream_key]
```

Example:
```
rtmp://192.168.2.34:1935/live/drone001_test12345678901234567890
```

## 🖼️ QR Code Modal Features

When you click the QR code button, you'll see:

### 1. **Large QR Code**
- High-quality, scannable QR code
- 200x200 pixels, optimal for phone cameras
- High error correction level

### 2. **Download Option**
- Click "Download QR Code" button
- Saves as PNG image
- Share via email, messaging, or print

### 3. **RTMP URL**
- Complete URL for publishing
- Ready to copy

### 4. **Playback URL**
- HTTP-FLV URL for viewing
- Use in VLC or web players

### 5. **Instructions**
- Step-by-step guide for mobile apps
- Manual setup option if QR doesn't work

### 6. **Supported Apps List**
- Shows compatible apps with badges
- Larix Broadcaster
- prism live studio
- CameraFi Live
- Streamlabs

## 💡 Tips

### For Best Results

1. **Screen Brightness**: Increase screen brightness for better scanning
2. **Distance**: Hold phone 6-12 inches from screen
3. **Steady**: Keep phone steady while scanning
4. **Lighting**: Ensure good lighting on the screen

### If QR Code Doesn't Work

Use the manual setup shown in the modal:
- **Server**: `rtmp://192.168.2.34:1935/live`
- **Stream Key**: Copy from the modal

### Sharing QR Codes

1. Click "Download QR Code" button
2. Share the PNG file via:
   - Email
   - WhatsApp/Telegram
   - AirDrop
   - Print it out

## 🎬 Quick Test Workflow

### Complete Mobile Streaming Test

1. **On Computer**:
   - Login to http://192.168.2.34
   - Go to Streams page
   - Click QR code icon for "Drone Stream 1"

2. **On Phone**:
   - Open Larix Broadcaster
   - Scan the QR code
   - Grant camera/microphone permissions
   - Tap the red record button

3. **Verify**:
   - Back on computer, go to Sessions page
   - See your phone's stream active
   - View bitrate, resolution, duration

4. **Watch**:
   - Open VLC on computer
   - Play: `http://192.168.2.34:8080/live/[stream_key].flv`
   - See your phone's video with < 2 second delay!

## 📱 Recommended Mobile Apps

### **Larix Broadcaster** ⭐ (Best Overall)
- **Platforms**: iOS, Android
- **QR Support**: ✅ Yes
- **Features**:
  - Hardware encoding
  - Low latency mode
  - Bitrate control
  - Multiple camera support
  - Free version available

### **prism live studio**
- **Platform**: Android
- **QR Support**: ✅ Yes
- **Features**:
  - Professional UI
  - Filters and effects
  - Multi-streaming
  - Free

### **CameraFi Live**
- **Platform**: Android
- **QR Support**: ✅ Yes (some versions)
- **Features**:
  - Simple interface
  - Good quality
  - Free with ads

### **Streamlabs Mobile**
- **Platforms**: iOS, Android
- **QR Support**: ⚠️ Limited
- **Features**:
  - Alerts integration
  - Chat overlay
  - Free

## 🔧 Technical Details

### QR Code Specifications

- **Size**: 200x200 pixels
- **Format**: SVG (rendered), PNG (download)
- **Error Correction**: Level H (30% recovery)
- **Encoding**: UTF-8
- **Content**: Plain RTMP URL

### React Component

The feature uses:
- `qrcode.react` library for QR generation
- `lucide-react` for icons
- Responsive modal design
- Download functionality via Canvas API

### Browser Compatibility

✅ **Supported**:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

⚠️ **Partial**:
- Older browsers may not support SVG download

## 🐛 Troubleshooting

### QR Code Won't Scan

**Problem**: Phone app can't read QR code

**Solutions**:
1. Increase screen brightness to 100%
2. Disable night mode/flux
3. Try different angle (avoid glare)
4. Move phone closer/further
5. Use manual setup instead

### Wrong Server IP in QR Code

**Problem**: QR code shows `localhost` or wrong IP

**Solution**:
- The QR code uses `window.location.hostname`
- Access dashboard via your server's IP address
- Don't use `localhost` if connecting from phone

**Example**:
- ❌ `http://localhost` → QR shows localhost
- ✅ `http://192.168.2.34` → QR shows 192.168.2.34

### Download Doesn't Work

**Problem**: "Download QR Code" button doesn't work

**Solutions**:
1. Try a different browser
2. Check pop-up blocker settings
3. Take a screenshot instead (Cmd+Shift+4 on Mac)

### App Doesn't Support QR Codes

**Problem**: Your streaming app has no QR scanner

**Solution**:
Use manual setup from the modal:
1. Copy the Server URL
2. Copy the Stream Key
3. Enter manually in app settings

## 🎨 UI/UX Features

### Visual Indicators

- **Purple QR icon** in action buttons
- Hover effect shows "Show QR Code for Mobile Apps"
- Modal with large, centered QR code
- Color-coded app badges (green)

### Responsive Design

- Works on desktop and tablet
- Modal adapts to screen size
- Touch-friendly buttons
- Clear instructions

### Accessibility

- Keyboard navigation support
- Screen reader compatible
- High contrast QR codes
- Clear labeling

## 🚀 Future Enhancements

Potential improvements (not yet implemented):

- [ ] QR code for SRT protocol
- [ ] Multiple format support (JSON config)
- [ ] QR code history/favorites
- [ ] Bulk QR code generation
- [ ] Custom branding in QR code
- [ ] NFC support for Android

## 📚 Related Documentation

- **Main README**: General server setup
- **RTMP Connection Issue**: Troubleshooting RTMP
- **Testing Guide**: Complete testing scenarios
- **Configuration**: Server settings

## ✅ Summary

The QR code feature makes mobile streaming setup **incredibly easy**:

1. 🎯 Click QR button → Instant QR code
2. 📱 Scan with mobile app → Auto-configured
3. 🎬 Start streaming → Live in seconds!

**No more typing long URLs and stream keys!** Just scan and go! 🚀

---

## Quick Reference

### Access QR Code
1. Login: http://192.168.2.34
2. Streams page
3. Click purple QR icon (📱)

### Supported Apps
- ✅ Larix Broadcaster
- ✅ prism live studio
- ✅ CameraFi Live
- ⚠️ Streamlabs (manual setup)

### QR Contains
```
rtmp://192.168.2.34:1935/live/[stream_key]
```

**Perfect for**: Quick mobile setup, demos, sharing with team members!
