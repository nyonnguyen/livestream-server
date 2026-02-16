# Custom Stream Key Feature

## Overview

Users can now specify custom stream keys when creating or editing streams. If left blank, the system will auto-generate a secure random key.

## Features

### 1. Custom Stream Key on Creation

When adding a new stream, users can:
- **Specify a custom stream key** (e.g., `my-drone-stream`, `camera-1`, `event-livestream`)
- **Leave it blank** to auto-generate based on stream name + random string

### 2. Edit Existing Stream Keys

Users can change stream keys for existing streams through the Edit button:
- Click Edit (pencil icon) on any stream
- Modify the Stream Key field
- Save changes

**⚠️ Warning:** Changing a stream key will invalidate all existing URLs. Active streams will be disconnected.

### 3. Stream Key Validation

Stream keys must follow these rules:
- **Length:** 3-100 characters
- **Characters:** Only alphanumeric (a-z, A-Z, 0-9), underscores (_), and hyphens (-)
- **Uniqueness:** Each stream key must be unique across all streams
- **Pattern:** `^[a-zA-Z0-9_-]+$`

**Valid examples:**
- ✅ `drone-camera-1`
- ✅ `main_event_2024`
- ✅ `stream123`
- ✅ `BackyardCamera`

**Invalid examples:**
- ❌ `my stream` (contains space)
- ❌ `camera@home` (contains @)
- ❌ `stream.key` (contains dot)
- ❌ `ab` (too short, minimum 3 characters)

## UI Changes

### Add Stream Modal

```
┌──────────────────────────────────────┐
│ Add Stream                      [X]  │
├──────────────────────────────────────┤
│ Stream Name:                         │
│ [Drone Camera #1           ]         │
│                                      │
│ Stream Key (optional):               │
│ [drone-camera-1           ]          │
│ Custom stream key or leave blank    │
│ to auto-generate from name           │
│                                      │
│ Description (optional):              │
│ [Front yard camera         ]         │
│                                      │
│ Protocol: [RTMP ▼]                   │
│                                      │
│ Max Bitrate: [5000] kbps             │
│                                      │
│ [Cancel]          [Create]           │
└──────────────────────────────────────┘
```

### Edit Stream Modal

```
┌──────────────────────────────────────┐
│ Edit Stream                     [X]  │
├──────────────────────────────────────┤
│ Stream Name:                         │
│ [Drone Camera #1           ]         │
│                                      │
│ Stream Key (optional):               │
│ [drone_camera123456789     ]         │
│ ⚠️ Warning: existing URLs will      │
│ stop working if changed              │
│                                      │
│ Description (optional):              │
│ [Front yard camera         ]         │
│                                      │
│ [Cancel]          [Update]           │
└──────────────────────────────────────┘
```

## Auto-Generation Logic

When stream key is left blank, the system generates one using this pattern:

```
{clean_name}_{random_32_chars}
```

**Example:**
- Stream Name: "Drone Camera #1"
- Clean Name: `dronecamera1` (lowercase, spaces and special chars removed)
- Random: `a3f9b2c8d1e4f5g6h7i8j9k0l1m2n3o4`
- **Generated Key:** `dronecamera1_a3f9b2c8d1e4f5g6h7i8j9k0l1m2n3o4`

## API Changes

### Create Stream

**Endpoint:** `POST /api/streams`

**Request Body:**
```json
{
  "name": "My Stream",
  "stream_key": "my-custom-key",  // Optional - auto-generated if omitted
  "description": "Optional description",
  "protocol": "rtmp",
  "max_bitrate": 5000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "My Stream",
    "stream_key": "my-custom-key",
    "description": "Optional description",
    "protocol": "rtmp",
    "max_bitrate": 5000,
    "is_active": true,
    "created_at": "2024-02-14T12:00:00.000Z"
  },
  "message": "Stream created successfully"
}
```

**Error Cases:**
```json
{
  "success": false,
  "error": "Stream key already exists"
}
```

### Update Stream

**Endpoint:** `PUT /api/streams/:id`

**Request Body:**
```json
{
  "name": "Updated Stream Name",
  "stream_key": "new-custom-key",  // Optional - only if changing
  "description": "Updated description"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "msg": "Stream key must contain only alphanumeric characters, underscores, and hyphens",
      "param": "stream_key"
    }
  ]
}
```

## Use Cases

### 1. Easy-to-Remember Keys for Events

Instead of: `myevent_a3f9b2c8d1e4f5g6h7i8j9k0l1m2n3o4`
Use: `wedding-2024` or `conference-main-stage`

**Publishing URL:**
```
rtmp://server.com:1935/live/wedding-2024
```

### 2. Organized Camera Names

For multiple cameras:
- `parking-lot-cam`
- `entrance-cam`
- `hallway-cam-1`
- `hallway-cam-2`

### 3. Temporary Event Streams

Create short-lived streams with descriptive keys:
- `superbowl-party`
- `birthday-livestream`
- `product-launch`

Then delete when done - easy to identify and manage.

### 4. Integration with External Systems

If integrating with external systems that expect specific stream keys:
```python
# External system expects: "device-{device_id}"
stream_key = f"device-{device.id}"  # e.g., "device-12345"

# Create stream in your system with matching key
create_stream(name="Device 12345", stream_key=stream_key)
```

## Security Considerations

### 1. Stream Key Visibility

Stream keys are **hidden by default** in the UI:
- Shows: `••••••••••••••••••••••••••••••••`
- Click eye icon to reveal
- Click copy icon to copy to clipboard

### 2. Stream Key Strength

**Auto-generated keys** are cryptographically secure:
- 32 random hexadecimal characters
- Entropy: 128 bits
- Practically impossible to guess

**Custom keys** security depends on user choice:
- ✅ Good: `camera-north-a9f3b2c8`
- ⚠️ Weak: `stream1`, `test`, `camera`

### 3. Best Practices

**For public/internet streaming:**
- Use auto-generated keys (most secure)
- Or add random suffix: `mystream-a9f3b2c8`

**For local/private networks:**
- Descriptive keys are acceptable: `backyard-camera`
- Still avoid obvious keys: `test`, `stream`, `camera1`

**For production:**
- Never use: `test`, `demo`, `stream`, `camera`
- Always use unique keys per stream
- Rotate keys if leaked

## Testing

### Test 1: Create Stream with Custom Key

1. Go to Streams tab
2. Click "Add Stream"
3. Fill in:
   - Name: `Test Camera`
   - Stream Key: `test-cam-001`
   - Protocol: RTMP
4. Click "Create"
5. Verify stream is created with key `test-cam-001`

### Test 2: Create Stream with Auto-Generated Key

1. Click "Add Stream"
2. Fill in:
   - Name: `Auto Generated Stream`
   - Stream Key: *(leave blank)*
3. Click "Create"
4. Expand stream and show key
5. Verify key format: `autogeneratedstream_{32_random_chars}`

### Test 3: Edit Stream Key

1. Click Edit (pencil icon) on any stream
2. Change Stream Key to `new-key-name`
3. Click "Update"
4. Verify key is updated
5. Verify old URLs no longer work

### Test 4: Duplicate Key Prevention

1. Create stream with key: `duplicate-test`
2. Try to create another stream with same key: `duplicate-test`
3. Should see error: "Stream key already exists"

### Test 5: Invalid Key Format

1. Try to create stream with key: `invalid key with spaces`
2. Should see error: "Stream key must contain only alphanumeric..."

## Migration

Existing streams are **not affected**. They will keep their current auto-generated keys. Users can:
- Leave them as-is (recommended if URLs are already shared)
- Edit them to more memorable keys (will break existing URLs)

## Troubleshooting

### "Stream key already exists"

**Problem:** Trying to create/update with a key that's already in use.

**Solution:** Choose a different key or check existing streams.

### "Invalid characters in stream key"

**Problem:** Key contains spaces, dots, or special characters.

**Solution:** Use only letters, numbers, underscores, and hyphens.

### Stream URLs not working after key change

**Problem:** Changed stream key but still using old URLs.

**Solution:**
1. Expand stream in UI
2. Copy new URLs with updated key
3. Update OBS/streaming app with new URLs

### Can't see stream key in UI

**Problem:** Stream key field shows dots (••••).

**Solution:** Click the eye icon (👁️) to reveal the key.

## Limitations

1. **Stream key changes disconnect active streams**
   - Any live streams will be interrupted
   - Viewers will need to reconnect with new URLs

2. **Cannot reuse old stream keys**
   - If you delete a stream, its key is permanently deleted
   - You can create a new stream with the same key

3. **Key length limits**
   - Minimum: 3 characters
   - Maximum: 100 characters

## Future Enhancements

Potential future features:
- **Key expiration:** Temporary keys that auto-expire
- **Key rotation:** Scheduled automatic key changes
- **Multiple keys per stream:** Primary and backup keys
- **Key groups:** Shared keys for multiple streams
- **Key templates:** Predefined patterns like `cam-{location}-{date}`
