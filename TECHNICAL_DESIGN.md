# Nyon Livestream Server - Technical Design Document

## Document Information

- **Project:** Nyon Livestream Server
- **Version:** 0.9.0-beta
- **Author:** Nyon (nyonnguyen@gmail.com)
- **Last Updated:** February 2026
- **Status:** Beta - Approaching 1.0.0 Release

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [System Components](#system-components)
4. [Data Flow](#data-flow)
5. [Database Design](#database-design)
6. [API Design](#api-design)
7. [Security Design](#security-design)
8. [Performance Optimization](#performance-optimization)
9. [Deployment Architecture](#deployment-architecture)
10. [Technology Stack](#technology-stack)
11. [Design Decisions](#design-decisions)
12. [Future Roadmap](#future-roadmap)

---

## Executive Summary

### Project Goals

Nyon Livestream Server is a lightweight, low-latency streaming platform designed for:

1. **Resource Efficiency:** Run on limited hardware (Raspberry Pi 3+)
2. **Low Latency:** Achieve sub-second glass-to-glass delay
3. **Ease of Use:** Simple web-based management interface
4. **Flexibility:** Support multiple streaming protocols and devices

### Key Features

- RTMP and SRT ingestion with HTTP-FLV distribution
- Sub-second latency (0.5-1.5s typical)
- Web-based dashboard with real-time monitoring
- Multi-stream management with authentication
- Docker-based deployment for easy installation
- Dual network support (LAN + Public IP)

### Target Use Cases

- Personal streaming projects (drone, webcam, security camera)
- Small events and conferences
- Educational streaming setups
- IoT and maker projects
- Development and testing of streaming applications

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Devices                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │   OBS   │  │  Drone  │  │ FFmpeg  │  │ Camera  │       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       │ RTMP/SRT   │            │            │             │
└───────┼────────────┼────────────┼────────────┼─────────────┘
        │            │            │            │
        │            ▼            ▼            ▼
        │    ┌──────────────────────────────────────┐
        │    │    Raspberry Pi / Server             │
        │    │                                      │
        │    │  ┌────────────────────────────────┐ │
        └────┼─►│        SRS (Port 1935/10080)   │ │
             │  │  - RTMP Ingestion              │ │
             │  │  - SRT Ingestion               │ │
             │  │  - HTTP-FLV Output (Port 8080) │ │
             │  │  - Webhooks to API             │ │
             │  └─────────┬──────────────────────┘ │
             │            │                         │
             │  ┌─────────▼──────────────────────┐ │
             │  │   Web API (Port 3000)          │ │
             │  │  - Express REST API            │ │
             │  │  - SQLite Database             │ │
             │  │  - JWT Authentication          │ │
             │  │  - Stream Management           │ │
             │  └─────────┬──────────────────────┘ │
             │            │                         │
             │  ┌─────────▼──────────────────────┐ │
             │  │   Nginx (Port 80/8888)         │ │
             │  │  - Reverse Proxy               │ │
             │  │  - Static File Serving         │ │
             │  │  - FLV Stream Proxy            │ │
             │  └─────────┬──────────────────────┘ │
             │            │                         │
             │  ┌─────────▼──────────────────────┐ │
             │  │   Web UI (Port 80)             │ │
             │  │  - React + Vite                │ │
             │  │  - FLV.js Player               │ │
             │  │  - Real-time Dashboard         │ │
             │  └────────────────────────────────┘ │
             └─────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Browser    │  │     VLC      │  │     OBS      │
│ (Dashboard)  │  │  (Playback)  │  │ (Restream)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Container Architecture

```
┌─────────────────────────────────────────────────────┐
│                Docker Host (Pi3/Pi4/Pi5)            │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  docker-compose.yml                          │  │
│  │                                              │  │
│  │  ┌────────────────┐  ┌──────────────────┐  │  │
│  │  │  SRS Container │  │  API Container   │  │  │
│  │  │  ossrs/srs:5   │  │  node:18-alpine  │  │  │
│  │  │  - RTMP (1935) │  │  - Express       │  │  │
│  │  │  - SRT (10080) │  │  - SQLite        │  │  │
│  │  │  - HTTP (8080) │  │  - Port 3000     │  │  │
│  │  │  256MB limit   │  │  128MB limit     │  │  │
│  │  └────────────────┘  └──────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────┐  ┌──────────────────┐  │  │
│  │  │   UI Container │  │ Nginx Container  │  │  │
│  │  │ nginx:alpine   │  │  nginx:alpine    │  │  │
│  │  │ - Static files │  │  - Reverse proxy │  │  │
│  │  │ - Port 80      │  │  - Port 8888     │  │  │
│  │  │ 64MB limit     │  │  32MB limit      │  │  │
│  │  └────────────────┘  └──────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │  Shared Volume: ./data                 │ │  │
│  │  │  - livestream.db (SQLite)              │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## System Components

### 1. SRS (Simple Realtime Server)

**Purpose:** Core streaming engine for ingestion and distribution

**Version:** SRS 5.x (latest stable)

**Configuration:**
- Low-latency mode enabled (`min_latency on`)
- GOP cache disabled for reduced latency
- HTTP-FLV remux for browser playback
- SRT server for ultra-low latency
- Webhook integration for authentication

**Key Configuration Parameters:**
```nginx
listen              1935;
max_connections     50;

vhost __defaultVhost__ {
    min_latency     on;
    tcp_nodelay     on;
    gop_cache       off;
    queue_length    3;

    http_hooks {
        enabled         on;
        on_publish      http://web-api:3000/api/hooks/on_publish;
        on_unpublish    http://web-api:3000/api/hooks/on_unpublish;
    }

    http_remux {
        enabled     on;
        mount       [vhost]/[app]/[stream].flv;
        fast_cache  2;
    }

    publish {
        mr          on;
        mr_latency  100;
    }
}

srt_server {
    enabled on;
    listen 10080;
    latency 0;
}
```

**Resource Usage:**
- Idle: ~20MB RAM, <1% CPU
- Per stream (relay): ~50MB RAM, 3-5% CPU
- No transcoding (relay-only mode)

**Protocols Supported:**
- **RTMP:** Industry standard, ~1-2s latency
- **SRT:** Modern protocol, ~0.5-0.8s latency
- **HTTP-FLV:** Browser playback, ~0.5-1s latency

### 2. Web API (Node.js + Express)

**Purpose:** Business logic, authentication, database management

**Framework:** Express.js 4.x

**Database:** SQLite3 (better-sqlite3 driver)

**Key Modules:**

#### Routes
- `/api/auth` - Authentication (login, logout, password change)
- `/api/streams` - Stream CRUD operations
- `/api/sessions` - Active session monitoring
- `/api/config` - System configuration
- `/api/network` - Network settings
- `/api/hooks` - SRS webhook handlers (internal)

#### Middleware
- `authenticate` - JWT token verification
- `validator` - Request validation (express-validator)
- `errorHandler` - Centralized error handling
- `asyncHandler` - Async/await error wrapper

#### Services
- `srsApi` - SRS HTTP API client
- `database` - SQLite connection and queries
- `auth` - Password hashing (bcrypt)

**Resource Usage:**
- Idle: ~40MB RAM, <5% CPU
- Active: ~60MB RAM, 5-10% CPU

**Key Dependencies:**
```json
{
  "express": "^4.18.0",
  "better-sqlite3": "^9.0.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.1.0",
  "express-validator": "^7.0.0",
  "cors": "^2.8.5",
  "axios": "^1.6.0"
}
```

### 3. Web UI (React + Vite)

**Purpose:** User interface for stream management and monitoring

**Framework:** React 18 + React Router 6

**Build Tool:** Vite 5.x

**Key Libraries:**
- `flv.js` - HTTP-FLV video playback
- `lucide-react` - Icon library
- `axios` - HTTP client
- `qrcode.react` - QR code generation

**Key Components:**

#### Pages
- `Dashboard` - System overview, active streams
- `Streams` - Stream management (CRUD)
- `Sessions` - Active session monitoring
- `Settings` - Configuration, password change
- `Help` - User guide
- `About` - Project information
- `MobileStream` - Public stream viewer (QR code)

#### Components
- `Layout` - Navigation sidebar
- `StreamModal` - Create/edit stream form
- `FlvPlayer` - Video player component
- `QRCodeModal` - QR code display
- `ChangePasswordModal` - Password change form

**State Management:**
- React Context API for authentication
- Local state with useState/useEffect
- No Redux (keeping it simple)

**Resource Usage:**
- Production build: ~500KB (gzipped)
- Runtime: Negligible (client-side)

**Build Configuration:**
```javascript
// vite.config.js
export default {
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          flv: ['flv.js']
        }
      }
    }
  }
}
```

### 4. Nginx

**Purpose:** Reverse proxy, static file serving, FLV stream proxy

**Configuration:**

```nginx
server {
    listen 80;
    server_name _;

    # Web UI (static files)
    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://web-api:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # HTTP-FLV proxy
    location /live/ {
        proxy_pass http://srs:8080/live/;
        proxy_http_version 1.1;
        proxy_buffering off;
        add_header Cache-Control no-cache;
        add_header Access-Control-Allow-Origin *;
    }
}
```

**Resource Usage:**
- Idle: ~10MB RAM, <1% CPU
- Active: ~20MB RAM, 2-5% CPU

---

## Data Flow

### Publishing Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Publisher (OBS/FFmpeg) connects to RTMP/SRT         │
│    rtmp://server-ip:1935/live/stream_key                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. SRS receives connection, triggers on_publish webhook │
│    POST http://web-api:3000/api/hooks/on_publish        │
│    Body: { stream_key, client_id, ip, protocol }        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. API validates stream_key against database            │
│    - Query: SELECT * FROM streams WHERE stream_key=?    │
│    - Check: is_active = 1                               │
│    - Return 200 OK if valid, 403 Forbidden if not       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. If valid, SRS accepts stream                         │
│    - Creates session record in database                 │
│    - Stream is now available for playback               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. SRS remuxes to HTTP-FLV                              │
│    Available at: http://server-ip:8080/live/key.flv     │
└─────────────────────────────────────────────────────────┘
```

### Playback Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. User clicks "Watch Live" in dashboard               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. FlvPlayer component loads                            │
│    URL: http://server-ip/live/stream_key.flv            │
│    (Proxied through Nginx to SRS)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. flv.js fetches FLV stream from SRS                   │
│    - Progressive download (HTTP chunked transfer)       │
│    - Parses FLV format in JavaScript                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Video rendered in HTML5 <video> element             │
│    Latency: 0.5-1.5s from source to display             │
└─────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. User submits login form                              │
│    POST /api/auth/login                                 │
│    Body: { username, password }                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. API validates credentials                            │
│    - Query user from database                           │
│    - bcrypt.compare(password, user.password_hash)       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Generate JWT token                                   │
│    jwt.sign({ userId, username }, JWT_SECRET, 24h)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Return token to client                               │
│    Response: { token, user: { id, username, email } }   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Client stores token in localStorage                  │
│    Includes in Authorization header for all requests    │
│    Authorization: Bearer <token>                        │
└─────────────────────────────────────────────────────────┘
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ username        │◄──┐
│ password_hash   │   │
│ email           │   │
│ created_at      │   │
└─────────────────┘   │
                      │
┌─────────────────┐   │
│    streams      │   │
├─────────────────┤   │
│ id (PK)         │   │
│ name            │   │
│ stream_key      │◄──┼──────┐
│ description     │   │      │
│ protocol        │   │      │
│ is_active       │   │      │
│ max_bitrate     │   │      │
│ created_at      │   │      │
│ updated_at      │   │      │
└────────┬────────┘   │      │
         │            │      │
         │ 1:N        │      │
         │            │      │
         ▼            │      │
┌─────────────────┐   │      │
│    sessions     │   │      │
├─────────────────┤   │      │
│ id (PK)         │   │      │
│ stream_id (FK)  │───┘      │
│ client_id       │          │
│ ip_address      │          │
│ protocol        │          │
│ started_at      │          │
│ ended_at        │          │
└─────────────────┘          │
                             │
┌─────────────────┐          │
│     config      │          │
├─────────────────┤          │
│ key (PK)        │          │
│ value           │          │
│ description     │          │
└─────────────────┘          │
                             │
        Auth/Management      │
                ┌────────────┘
                │
          Stream Auth
```

### Schema Definitions

#### users table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  must_change_password BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `username`

#### streams table
```sql
CREATE TABLE streams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  stream_key TEXT UNIQUE NOT NULL,
  description TEXT,
  protocol TEXT DEFAULT 'rtmp',
  is_active BOOLEAN DEFAULT 1,
  max_bitrate INTEGER DEFAULT 5000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `name`
- UNIQUE INDEX on `stream_key`
- INDEX on `is_active` (for filtering)

**Constraints:**
- `protocol` IN ('rtmp', 'srt', 'both')
- `max_bitrate` >= 100 AND <= 50000
- `stream_key` length >= 3

#### sessions table
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stream_id INTEGER NOT NULL,
  client_id TEXT NOT NULL,
  ip_address TEXT,
  protocol TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `stream_id`
- INDEX on `started_at, ended_at` (for active sessions query)

**Active Sessions Query:**
```sql
SELECT * FROM sessions
WHERE ended_at IS NULL
ORDER BY started_at DESC;
```

#### config table
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);
```

**Default Config Values:**
```sql
INSERT INTO config VALUES
  ('max_concurrent_streams', '3', 'Maximum simultaneous streams'),
  ('lan_ip', '192.168.1.100', 'LAN IP address'),
  ('public_ip', '', 'Public IP or domain'),
  ('rtmp_port', '1935', 'RTMP port'),
  ('srt_port', '10080', 'SRT port'),
  ('flv_port', '8080', 'HTTP-FLV port');
```

---

## API Design

### RESTful Endpoints

#### Authentication

```
POST /api/auth/login
Body: { username, password }
Response: { success, token, user: { id, username, email } }

POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { success, message }

PUT /api/auth/change-password
Headers: Authorization: Bearer <token>
Body: { current_password, new_password }
Response: { success, message }
```

#### Streams

```
GET /api/streams
Headers: Authorization: Bearer <token>
Query: ?is_active=true&protocol=rtmp
Response: { success, data: [...streams] }

GET /api/streams/:id
Headers: Authorization: Bearer <token>
Response: { success, data: { ...stream, active_sessions: [...] } }

POST /api/streams
Headers: Authorization: Bearer <token>
Body: { name, stream_key?, description?, protocol, max_bitrate }
Response: { success, data: {...stream}, message }

PUT /api/streams/:id
Headers: Authorization: Bearer <token>
Body: { name?, stream_key?, description?, protocol?, is_active?, max_bitrate? }
Response: { success, data: {...stream}, message }

DELETE /api/streams/:id
Headers: Authorization: Bearer <token>
Response: { success, message }

POST /api/streams/:id/regenerate-key
Headers: Authorization: Bearer <token>
Response: { success, data: { stream_key }, message }

POST /api/streams/:id/toggle
Headers: Authorization: Bearer <token>
Response: { success, data: {...stream}, message }
```

#### Sessions

```
GET /api/sessions
Headers: Authorization: Bearer <token>
Response: { success, data: [...sessions] }

GET /api/sessions/:id
Headers: Authorization: Bearer <token>
Response: { success, data: {...session} }

DELETE /api/sessions/:id
Headers: Authorization: Bearer <token>
Response: { success, message }
```

#### Configuration

```
GET /api/config
Headers: Authorization: Bearer <token>
Response: { success, data: { ...config } }

PUT /api/config
Headers: Authorization: Bearer <token>
Body: { max_concurrent_streams?, public_ip?, ... }
Response: { success, message }

GET /api/config/health
Headers: Authorization: Bearer <token>
Response: { success, data: { cpu, memory, uptime, active_streams } }

GET /api/config/stats
Headers: Authorization: Bearer <token>
Response: { success, data: { total_streams, active_streams, sessions_today } }
```

#### Network

```
GET /api/network/server-ip
Headers: Authorization: Bearer <token>
Response: { success, data: { lan_ip, public_ip } }

GET /api/network/config
Headers: Authorization: Bearer <token>
Response: { success, data: { lan_ip, public_ip, domain, ports } }

PUT /api/network/config
Headers: Authorization: Bearer <token>
Body: { public_ip?, domain? }
Response: { success, message }
```

#### Webhooks (Internal - No Auth Required)

```
POST /api/hooks/on_publish
Body: { app, stream, param, vhost, client_id, ip }
Response: { code: 0 } (SRS format)

POST /api/hooks/on_unpublish
Body: { app, stream, param, vhost, client_id, ip }
Response: { code: 0 } (SRS format)
```

### API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": [
    { "msg": "Field error", "param": "field_name" }
  ]
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (stream key invalid, disabled stream)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error

---

## Security Design

### Authentication

**JWT (JSON Web Tokens):**
- Algorithm: HS256 (HMAC-SHA256)
- Expiration: 24 hours
- Payload: `{ userId, username, iat, exp }`
- Secret: 32-byte random string (from `JWT_SECRET` env var)

**Password Storage:**
- Algorithm: bcrypt
- Cost factor: 10 rounds
- Salt: Automatically generated per password

**Initial Setup:**
- Default admin user created on first run
- Username: `admin`
- Password: From `DEFAULT_ADMIN_PASSWORD` (must change on first login)

### Stream Authentication

**Stream Key Validation:**
1. Publisher connects with stream key
2. SRS calls webhook: `POST /api/hooks/on_publish`
3. API validates stream key against database:
   - Check if stream exists
   - Check if `is_active = 1`
4. Return 200 (allow) or 403 (deny)

**Stream Key Format:**
- Custom: User-defined (alphanumeric, underscore, hyphen only)
- Auto-generated: `{clean_name}_{32_random_hex_chars}`
- Length: 3-100 characters
- Uniqueness: Enforced at database level

### Authorization

**Middleware Chain:**
```javascript
router.get('/api/streams',
  authenticate,           // Verify JWT token
  validateQuery,          // Validate query parameters
  asyncHandler(handler)   // Handle async errors
);
```

**Authenticate Middleware:**
```javascript
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Input Validation

Using `express-validator`:

```javascript
const validateCreateStream = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be 3-100 characters'),

  body('stream_key')
    .optional()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Stream key: alphanumeric, underscore, hyphen only'),

  body('max_bitrate')
    .isInt({ min: 100, max: 50000 })
    .withMessage('Bitrate must be 100-50000 kbps'),

  // ... more validators
];
```

### Security Headers

Nginx configuration:
```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

### Rate Limiting

**Planned for 1.0.0:**
- Login attempts: 5 per 15 minutes per IP
- API requests: 100 per minute per user
- Using `express-rate-limit`

### CORS Policy

```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

---

## Performance Optimization

### Streaming Latency Optimization

**SRS Configuration:**
```nginx
# Disable GOP cache (reduces latency by 1-2 seconds)
gop_cache off;

# Reduce queue length (less buffering)
queue_length 3;  # Default: 10

# Minimum latency mode
min_latency on;
mr on;
mr_latency 100;  # Milliseconds
mw_latency 100;

# HTTP-FLV fast cache
fast_cache 2;  # Seconds (minimum)

# TCP no-delay (disable Nagle's algorithm)
tcp_nodelay on;
```

**Client-Side (flv.js):**
```javascript
{
  enableStashBuffer: false,        // No extra buffering
  stashInitialSize: 64,            // Reduce initial buffer
  liveBufferLatencyChasing: true,  // Catch up if behind
  liveBufferLatencyMaxLatency: 1.0,// Max 1s delay
  liveSyncDuration: 0.3,           // Sync every 300ms
  liveSyncPlaybackRate: 1.2,       // Catch up at 1.2x speed
}
```

**Network Optimization:**
- Use wired Ethernet (avoid WiFi for streaming)
- Close physical proximity between publisher and server
- Use SRT for packet loss recovery (better than RTMP on poor networks)

### Resource Optimization

**Container Memory Limits:**
```yaml
services:
  srs:
    mem_limit: 256m      # Relay mode needs minimal memory
    cpus: 1.5

  web-api:
    mem_limit: 128m      # Node.js + SQLite
    cpus: 0.5

  web-ui:
    mem_limit: 64m       # Nginx serving static files
    cpus: 0.5
```

**Database Optimization:**
- Use indexes on frequently queried fields
- WAL mode for better concurrency: `PRAGMA journal_mode=WAL;`
- Vacuum periodically: `VACUUM;`

**API Caching:**
```javascript
// Cache config in memory (read-heavy, write-rarely)
let configCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

const getConfig = () => {
  if (configCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return configCache;
  }
  configCache = db.prepare('SELECT * FROM config').all();
  cacheTimestamp = Date.now();
  return configCache;
};
```

### Frontend Optimization

**Code Splitting:**
```javascript
// Split FLV player into separate chunk
const FlvPlayer = lazy(() => import('./components/FlvPlayer'));
```

**Production Build:**
```bash
# Minification with esbuild (faster than Terser)
npm run build
# Output: ~500KB (gzipped)
```

**Lazy Loading:**
- Images: Use loading="lazy"
- Components: React.lazy() for routes
- Icons: Tree-shaking with lucide-react

---

## Deployment Architecture

### Docker Compose Stack

```yaml
version: '3.8'

services:
  srs:
    image: ossrs/srs:5
    container_name: livestream-srs
    ports:
      - "1935:1935"     # RTMP
      - "10080:10080"   # SRT
      - "8080:8080"     # HTTP-FLV + API
      - "1985:1985"     # HTTP API
      - "8000:8000/udp" # WebRTC (future)
    volumes:
      - ./srs/srs.conf:/usr/local/srs/conf/srs.conf:ro
    command: ["./objs/srs", "-c", "conf/srs.conf"]
    restart: unless-stopped
    mem_limit: 256m
    cpus: 1.5

  web-api:
    build: ./web-api
    container_name: livestream-api
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD}
      - MAX_CONCURRENT_STREAMS=${MAX_CONCURRENT_STREAMS}
    depends_on:
      - srs
    restart: unless-stopped
    mem_limit: 128m
    cpus: 0.5
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web-ui:
    build: ./web-ui
    container_name: livestream-ui
    ports:
      - "80:80"
    depends_on:
      - web-api
    restart: unless-stopped
    mem_limit: 64m
    cpus: 0.5

  nginx:
    build: ./nginx
    container_name: livestream-nginx
    ports:
      - "8888:80"
    depends_on:
      - web-api
      - srs
    restart: unless-stopped
    mem_limit: 32m
    cpus: 0.25

volumes:
  data:
    driver: local
```

### Network Architecture

**Internal Docker Network:**
- Name: `livestream-server_default` (auto-created)
- Driver: bridge
- Subnet: 172.18.0.0/16 (example)

**Service DNS:**
- `srs` → 172.18.0.2
- `web-api` → 172.18.0.3
- `web-ui` → 172.18.0.4
- `nginx` → 172.18.0.5

### Port Mapping

| Service | Internal Port | External Port | Protocol | Purpose |
|---------|--------------|---------------|----------|---------|
| SRS | 1935 | 1935 | TCP | RTMP publishing |
| SRS | 10080 | 10080 | TCP | SRT publishing |
| SRS | 8080 | 8080 | TCP | HTTP-FLV + SRS API |
| SRS | 1985 | 1985 | TCP | HTTP API |
| SRS | 8000 | 8000 | UDP | WebRTC (future) |
| API | 3000 | 3000 | TCP | REST API (internal) |
| UI | 80 | 80 | TCP | Web interface |
| Nginx | 80 | 8888 | TCP | Reverse proxy |

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| SRS | 5.x | Streaming engine |
| Node.js | 18 LTS | Runtime |
| Express | 4.18+ | Web framework |
| SQLite | 3.x | Database |
| better-sqlite3 | 9.x | SQLite driver (sync, faster) |
| jsonwebtoken | 9.x | JWT auth |
| bcrypt | 5.x | Password hashing |
| express-validator | 7.x | Input validation |
| axios | 1.6+ | HTTP client |
| cors | 2.8+ | CORS middleware |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| React Router | 6.x | Client-side routing |
| Vite | 5.x | Build tool |
| flv.js | 1.6+ | FLV video player |
| lucide-react | Latest | Icons |
| TailwindCSS | 3.x | CSS framework |
| axios | 1.6+ | HTTP client |
| qrcode.react | 3.x | QR code generation |

### Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24.x | Containerization |
| Docker Compose | 2.x | Multi-container orchestration |
| Nginx | Alpine | Reverse proxy, static files |
| Raspberry Pi OS | Lite 64-bit | Operating system |

---

## Design Decisions

### Why SQLite Instead of PostgreSQL/MySQL?

**Reasons:**
1. **Zero configuration:** No separate database server needed
2. **Low resource usage:** Perfect for Raspberry Pi 3
3. **Single file:** Easy backup (just copy the file)
4. **Sufficient for use case:** Low write concurrency, < 1000 records
5. **Embedded:** No network overhead, faster queries

**Trade-offs:**
- No concurrent writes (mitigated by low write frequency)
- No advanced features (not needed for this use case)

### Why SRS Instead of Nginx-RTMP?

**Reasons:**
1. **Active development:** SRS is actively maintained
2. **Better ARM support:** Optimized for ARM64
3. **Built-in SRT:** Native SRT support (Nginx-RTMP needs patches)
4. **HTTP API:** Easy integration for stream queries
5. **Webhooks:** Native authentication hooks
6. **Better documentation:** Comprehensive English docs

**Trade-offs:**
- Slightly higher resource usage than Nginx-RTMP (negligible difference)

### Why React Instead of Vue/Svelte?

**Reasons:**
1. **Mature ecosystem:** More libraries and resources
2. **Developer familiarity:** Most developers know React
3. **Component libraries:** Rich ecosystem (though we use Tailwind + Lucide)
4. **Vite support:** Excellent Vite integration

**Trade-offs:**
- Slightly larger bundle size than Svelte (not significant after gzipping)

### Why Docker Instead of Native Installation?

**Reasons:**
1. **Reproducibility:** Consistent environment across devices
2. **Isolation:** No conflicts with system packages
3. **Easy updates:** `docker compose pull && docker compose up -d`
4. **Rollback:** Easy to revert to previous versions
5. **Multi-platform:** Works on Pi3, Pi4, Pi5, x86_64

**Trade-offs:**
- Slight overhead (< 50MB RAM, negligible CPU)
- Requires Docker knowledge (mitigated by good docs)

### Why HTTP-FLV Instead of HLS?

**Reasons:**
1. **Lower latency:** HTTP-FLV: 0.5-1s, HLS: 6-30s
2. **No segmentation:** Continuous stream, no manifest updates
3. **Better browser support:** Works with flv.js in all modern browsers
4. **Simpler:** No complex segment management

**Trade-offs:**
- Less widely supported than HLS (but flv.js solves this)
- Requires JavaScript player (acceptable for our use case)

### Why Relay-Only (No Transcoding)?

**Reasons:**
1. **Resource efficiency:** Transcoding requires 10-50x more CPU
2. **Target hardware:** Raspberry Pi 3 can't handle H.264 encoding at scale
3. **Use case:** Most sources already encode properly (OBS, FFmpeg)
4. **Quality:** Direct relay maintains source quality

**Trade-offs:**
- No adaptive bitrate (can be added for Pi4/Pi5)
- Publisher must encode properly (documented in Help page)

---

## Future Roadmap

### Version 1.0.0 (Stable Release)

- [ ] Complete testing on all Raspberry Pi models
- [ ] Security audit
- [ ] Performance benchmarking
- [ ] Comprehensive documentation
- [ ] User feedback integration
- [ ] Bug fixes and stability improvements

### Version 1.1.0

- [ ] Recording/DVR functionality
- [ ] Playback of recorded streams
- [ ] Stream thumbnails
- [ ] Email notifications for stream events

### Version 1.2.0

- [ ] WebRTC playback (ultra-low latency < 500ms)
- [ ] Multi-bitrate support (for Pi4/Pi5)
- [ ] Advanced analytics (bandwidth graphs, viewer counts)

### Version 2.0.0

- [ ] Multi-user support (multiple admin accounts)
- [ ] Role-based access control
- [ ] Stream scheduling
- [ ] API keys for third-party integrations
- [ ] Plugin system for extensibility

### Experimental Features

- WHIP/WHEP support (WebRTC ingest/playback)
- GPU acceleration (Pi4/Pi5 with h264_omx)
- Multi-server clustering
- CDN integration
- Mobile apps (iOS/Android)

---

## Appendix

### File Structure

```
livestream-server/
├── docker-compose.yml
├── .env.example
├── .env
├── README.md
├── DEPLOYMENT.md
├── TECHNICAL_DESIGN.md
│
├── srs/
│   └── srs.conf
│
├── web-api/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validator.js
│   │   │   └── errorHandler.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Stream.js
│   │   │   └── Session.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── streams.js
│   │   │   ├── sessions.js
│   │   │   ├── config.js
│   │   │   └── network.js
│   │   └── services/
│   │       └── srsApi.js
│   └── scripts/
│       └── init-db.js
│
├── web-ui/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   ├── icon.svg
│   │   └── logo.svg
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── Login.jsx
│       │   ├── StreamModal.jsx
│       │   ├── FlvPlayer.jsx
│       │   ├── QRCodeModal.jsx
│       │   └── ChangePasswordModal.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Streams.jsx
│       │   ├── Sessions.jsx
│       │   ├── Settings.jsx
│       │   ├── MobileStream.jsx
│       │   ├── Help.jsx
│       │   └── About.jsx
│       ├── contexts/
│       │   └── AuthContext.jsx
│       └── services/
│           └── api.js
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
│
└── data/
    └── livestream.db
```

### Performance Benchmarks

**Raspberry Pi 3 Model B+ (1GB RAM):**
- Idle: 80MB RAM used, 5% CPU
- 1 stream: 180MB RAM, 12% CPU
- 2 streams: 250MB RAM, 20% CPU
- 3 streams: 320MB RAM, 28% CPU
- Latency: 0.8-1.5s (RTMP → HTTP-FLV)

**Raspberry Pi 4 Model B (4GB RAM):**
- Idle: 90MB RAM used, 3% CPU
- 5 streams: 400MB RAM, 18% CPU
- 10 streams: 700MB RAM, 35% CPU
- Latency: 0.6-1.0s (SRT → HTTP-FLV)

### References

- SRS Documentation: https://ossrs.net/lts/en-us/docs/v5/doc/introduction
- flv.js GitHub: https://github.com/bilibili/flv.js
- RTMP Specification: https://www.adobe.com/devnet/rtmp.html
- SRT Protocol: https://github.com/Haivision/srt
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/

---

**Document Version:** 1.0
**Last Updated:** February 2026
**Author:** Nyon (nyonnguyen@gmail.com)
**License:** MIT
