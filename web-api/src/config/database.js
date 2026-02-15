const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/livestream.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
function initializeSchema() {
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      is_active BOOLEAN DEFAULT 1,
      must_change_password BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Streams table
    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      stream_key TEXT UNIQUE NOT NULL,
      description TEXT,
      protocol TEXT DEFAULT 'rtmp' CHECK(protocol IN ('rtmp', 'srt', 'both')),
      is_active BOOLEAN DEFAULT 1,
      max_bitrate INTEGER DEFAULT 5000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sessions table (active streams)
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id INTEGER NOT NULL,
      client_id TEXT,
      ip_address TEXT,
      protocol TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      bytes_received INTEGER DEFAULT 0,
      FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
    );

    -- Config table
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Activity log table
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_sessions_stream_id ON sessions(stream_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions(ended_at);
    CREATE INDEX IF NOT EXISTS idx_streams_stream_key ON streams(stream_key);
    CREATE INDEX IF NOT EXISTS idx_streams_is_active ON streams(is_active);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

    -- Create trigger to update updated_at timestamp
    CREATE TRIGGER IF NOT EXISTS update_users_timestamp
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_streams_timestamp
    AFTER UPDATE ON streams
    BEGIN
      UPDATE streams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_config_timestamp
    AFTER UPDATE ON config
    BEGIN
      UPDATE config SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
    END;
  `;

  // Execute schema
  db.exec(schema);
  console.log('Database schema initialized successfully');
}

/**
 * Check if database is initialized
 */
function isDatabaseInitialized() {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name IN ('users', 'streams', 'sessions', 'config')
  `).all();

  return tables.length === 4;
}

/**
 * Get database statistics
 */
function getDatabaseStats() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const streamCount = db.prepare('SELECT COUNT(*) as count FROM streams WHERE is_active = 1').get();
  const activeSessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE ended_at IS NULL').get();

  return {
    users: userCount.count,
    streams: streamCount.count,
    activeSessions: activeSessionCount.count
  };
}

// Initialize schema if needed
if (!isDatabaseInitialized()) {
  initializeSchema();
}

module.exports = {
  db,
  initializeSchema,
  isDatabaseInitialized,
  getDatabaseStats
};
