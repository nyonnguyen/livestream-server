require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const streamRoutes = require('./routes/streams');
const sessionRoutes = require('./routes/sessions');
const webhookRoutes = require('./routes/webhooks');
const configRoutes = require('./routes/config');
const networkRoutes = require('./routes/network');
const versionRoutes = require('./routes/version');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize database
require('./config/database');

// Create Express app
const app = express();

// Trust proxy (for proper IP detection behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow SRS iframe embedding if needed
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: (parseInt(process.env.API_RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 5,
  message: {
    success: false,
    error: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to auth routes
app.use('/api/auth/login', authLimiter);

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Public network endpoint (no auth required - needed for mobile page)
app.get('/api/network/server-ip', networkRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/hooks', webhookRoutes);
app.use('/api/config', configRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/version', versionRoutes);

// API root
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Livestream API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      streams: '/api/streams',
      sessions: '/api/sessions',
      config: '/api/config',
      network: '/api/network',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.API_PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   Livestream API Server                               ║
║   Running on port ${PORT}                                 ║
║   Environment: ${process.env.NODE_ENV || 'production'}                            ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  console.log('API Endpoints:');
  console.log(`  - Health: http://localhost:${PORT}/api/health`);
  console.log(`  - Auth:   http://localhost:${PORT}/api/auth`);
  console.log(`  - Streams: http://localhost:${PORT}/api/streams`);
  console.log(`  - Sessions: http://localhost:${PORT}/api/sessions`);
  console.log(`  - Config: http://localhost:${PORT}/api/config`);
  console.log(`  - Network: http://localhost:${PORT}/api/network`);
  console.log('');
  console.log('Ready to accept requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
