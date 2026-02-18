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
      role_id INTEGER,
      deleted_at DATETIME,
      deleted_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (deleted_by) REFERENCES users(id)
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
      deleted_at DATETIME,
      deleted_by INTEGER,
      deletion_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deleted_by) REFERENCES users(id)
    );

    -- Sessions table (active streaming sessions)
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

    -- User login sessions table (v2.0)
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Stream change history table (v2.0)
    CREATE TABLE IF NOT EXISTS stream_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      changed_by INTEGER,
      changes TEXT,
      snapshot TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Roles table (v2.0)
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      permissions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User-role assignments table (v2.0)
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      granted_by INTEGER,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Public IP change history table (v2.0)
    CREATE TABLE IF NOT EXISTS public_ip_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_ip TEXT,
      new_ip TEXT NOT NULL,
      detection_method TEXT,
      auto_applied BOOLEAN DEFAULT 0,
      applied_at DATETIME,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_stream_history_stream_id ON stream_history(stream_id);
    CREATE INDEX IF NOT EXISTS idx_stream_history_created_at ON stream_history(created_at);

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

/**
 * Initialize default data (admin user, streams, config)
 */
function initializeDefaultData() {
  const bcrypt = require('bcryptjs');
  const crypto = require('crypto');

  // Check if admin user already exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

  if (!existingAdmin) {
    // Create default admin user
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    db.prepare(`
      INSERT INTO users (username, password_hash, email, must_change_password)
      VALUES (?, ?, ?, ?)
    `).run('admin', passwordHash, 'admin@localhost', 1);

    console.log('✓ Created admin user (username: admin, password: ' + defaultPassword + ')');
  }

  // Check if streams already exist
  const existingStreams = db.prepare('SELECT COUNT(*) as count FROM streams').get();

  if (existingStreams.count === 0) {
    // Create default streams
    const generateStreamKey = (prefix) => {
      const envKey = process.env[`DEFAULT_STREAM_KEY_${prefix.toUpperCase()}`];
      return envKey || `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
    };

    const streams = [
      { name: 'Drone Stream 1', key: generateStreamKey('dronestream1'), desc: 'Default drone stream', protocol: 'rtmp' },
      { name: 'Phone Stream 1', key: generateStreamKey('phonestream1'), desc: 'Default phone stream', protocol: 'rtmp' },
      { name: 'Camera Stream 1', key: generateStreamKey('camerastream1'), desc: 'Default camera stream', protocol: 'rtmp' }
    ];

    const insertStream = db.prepare(`
      INSERT INTO streams (name, stream_key, description, protocol, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    streams.forEach(stream => {
      insertStream.run(stream.name, stream.key, stream.desc, stream.protocol);
    });

    console.log('✓ Created default streams');
  }

  // Check if config already exists
  const existingConfig = db.prepare('SELECT COUNT(*) as count FROM config').get();

  if (existingConfig.count === 0) {
    // Create default configuration
    const maxConcurrentStreams = process.env.MAX_CONCURRENT_STREAMS || '3';

    const configStmt = db.prepare(`
      INSERT INTO config (key, value, description)
      VALUES (?, ?, ?)
    `);

    // Add all default config values
    configStmt.run('max_concurrent_streams', maxConcurrentStreams, 'Maximum number of concurrent streams allowed');
    configStmt.run('require_authentication', 'true', 'Require authentication for publishing streams');
    configStmt.run('allow_recording', 'false', 'Allow recording of streams');
    configStmt.run('default_protocol', 'rtmp', 'Default streaming protocol (rtmp or srt)');
    configStmt.run('session_timeout', '300', 'Session timeout in seconds');

    console.log('✓ Created default configuration');
  }
}

// Initialize schema if needed
if (!isDatabaseInitialized()) {
  initializeSchema();
}

// Migrate missing config entries (for existing databases)
function migrateConfigEntries() {
  const requiredConfigs = [
    { key: 'require_authentication', value: 'true', description: 'Require authentication for publishing streams' },
    { key: 'allow_recording', value: 'false', description: 'Allow recording of streams' },
    { key: 'default_protocol', value: 'rtmp', description: 'Default streaming protocol (rtmp or srt)' },
    { key: 'session_timeout', value: '300', description: 'Session timeout in seconds' },
    // v2.0 configs
    { key: 'setup_wizard_completed', value: 'false', description: 'Setup wizard completion status' },
    { key: 'public_ip_monitor_enabled', value: 'false', description: 'Enable automatic public IP monitoring' },
    { key: 'public_ip_monitor_interval', value: '300', description: 'Public IP check interval in seconds' },
    { key: 'stream_retention_days', value: '30', description: 'Days to retain deleted streams before permanent deletion' },
    { key: 'session_max_per_user', value: '5', description: 'Maximum concurrent login sessions per user' },
    { key: 'audit_retention_days', value: '90', description: 'Days to retain audit logs' },
    { key: 'app_version', value: '2.0.0', description: 'Application version' }
  ];

  const configStmt = db.prepare(`
    INSERT OR IGNORE INTO config (key, value, description)
    VALUES (?, ?, ?)
  `);

  let added = 0;
  requiredConfigs.forEach(config => {
    const result = configStmt.run(config.key, config.value, config.description);
    if (result.changes > 0) {
      added++;
    }
  });

  if (added > 0) {
    console.log(`✓ Migrated ${added} missing config entries`);
  }
}

/**
 * Migrate existing database to v2.0 schema (add columns to existing tables)
 */
function migrateToV2() {
  try {
    // Check if migration is needed
    const versionConfig = db.prepare('SELECT value FROM config WHERE key = ?').get('app_version');

    // Add columns to users table if they don't exist
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    const hasRoleId = userColumns.some(col => col.name === 'role_id');
    const hasDeletedAt = userColumns.some(col => col.name === 'deleted_at');

    if (!hasRoleId) {
      db.exec('ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id)');
      console.log('✓ Added role_id column to users table');
    }

    if (!hasDeletedAt) {
      db.exec('ALTER TABLE users ADD COLUMN deleted_at DATETIME');
      db.exec('ALTER TABLE users ADD COLUMN deleted_by INTEGER REFERENCES users(id)');
      console.log('✓ Added soft delete columns to users table');
    }

    // Add columns to streams table if they don't exist
    const streamColumns = db.prepare("PRAGMA table_info(streams)").all();
    const hasStreamDeletedAt = streamColumns.some(col => col.name === 'deleted_at');

    if (!hasStreamDeletedAt) {
      db.exec('ALTER TABLE streams ADD COLUMN deleted_at DATETIME');
      db.exec('ALTER TABLE streams ADD COLUMN deleted_by INTEGER REFERENCES users(id)');
      db.exec('ALTER TABLE streams ADD COLUMN deletion_reason TEXT');
      console.log('✓ Added soft delete columns to streams table');
    }

    // Initialize default roles
    initializeDefaultRoles();

    console.log('✓ Database migration to v2.0 completed');
  } catch (error) {
    console.error('Migration error:', error.message);
    // Don't throw - allow app to continue
  }
}

/**
 * Initialize default roles for RBAC
 */
function initializeDefaultRoles() {
  const existingRoles = db.prepare('SELECT COUNT(*) as count FROM roles').get();

  if (existingRoles.count === 0) {
    const roles = [
      {
        name: 'admin',
        display_name: 'Administrator',
        permissions: JSON.stringify(['all'])
      },
      {
        name: 'editor',
        display_name: 'Editor',
        permissions: JSON.stringify(['streams:read', 'streams:write', 'streams:delete', 'sessions:read'])
      },
      {
        name: 'viewer',
        display_name: 'Viewer',
        permissions: JSON.stringify(['streams:read', 'sessions:read'])
      }
    ];

    const insertRole = db.prepare(`
      INSERT INTO roles (name, display_name, permissions)
      VALUES (?, ?, ?)
    `);

    roles.forEach(role => {
      insertRole.run(role.name, role.display_name, role.permissions);
    });

    console.log('✓ Created default roles (admin, editor, viewer)');

    // Assign admin role to all existing users
    const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('admin');
    if (adminRole) {
      const users = db.prepare('SELECT id FROM users WHERE role_id IS NULL').all();
      const updateUser = db.prepare('UPDATE users SET role_id = ? WHERE id = ?');

      users.forEach(user => {
        updateUser.run(adminRole.id, user.id);
      });

      if (users.length > 0) {
        console.log(`✓ Assigned admin role to ${users.length} existing users`);
      }
    }
  }
}

// Initialize default data on first run
try {
  initializeDefaultData();
  migrateConfigEntries();
  migrateToV2(); // Migrate existing databases to v2.0
} catch (error) {
  console.error('Error initializing default data:', error.message);
}

module.exports = {
  db,
  initializeSchema,
  isDatabaseInitialized,
  getDatabaseStats
};
