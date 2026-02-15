#!/usr/bin/env node

/**
 * Database initialization script
 * Creates default admin user and initial stream configurations
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db, initializeSchema } = require('../src/config/database');

/**
 * Generate random stream key
 */
function generateStreamKey(prefix) {
  const random = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${random}`;
}

/**
 * Initialize database with default data
 */
function initializeDefaultData() {
  console.log('Initializing database with default data...');

  // Check if admin user already exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

  if (existingAdmin) {
    console.log('Admin user already exists, skipping user creation');
  } else {
    // Create default admin user
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, email, must_change_password)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('admin', passwordHash, 'admin@localhost', 1);
    console.log('✓ Created admin user (username: admin, password: ' + defaultPassword + ')');
    console.log('  ⚠️  Please change the password after first login!');
  }

  // Check if streams already exist
  const existingStreams = db.prepare('SELECT COUNT(*) as count FROM streams').get();

  if (existingStreams.count > 0) {
    console.log('Streams already exist, skipping stream creation');
  } else {
    // Create default streams
    const streamKey1 = process.env.DEFAULT_STREAM_KEY_1 || generateStreamKey('drone001');
    const streamKey2 = process.env.DEFAULT_STREAM_KEY_2 || generateStreamKey('phone001');
    const streamKey3 = process.env.DEFAULT_STREAM_KEY_3 || generateStreamKey('camera001');

    const insertStream = db.prepare(`
      INSERT INTO streams (name, stream_key, description, protocol, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertStream.run('Drone Stream 1', streamKey1, 'Primary drone camera', 'rtmp', 1);
    insertStream.run('Phone Stream 1', streamKey2, 'Mobile phone camera', 'rtmp', 1);
    insertStream.run('Camera Stream 1', streamKey3, 'Fixed position camera', 'rtmp', 1);

    console.log('✓ Created default streams:');
    console.log('  1. Drone Stream 1');
    console.log('     Stream Key: ' + streamKey1);
    console.log('     RTMP URL: rtmp://<SERVER_IP>:1935/live/' + streamKey1);
    console.log('  2. Phone Stream 1');
    console.log('     Stream Key: ' + streamKey2);
    console.log('     RTMP URL: rtmp://<SERVER_IP>:1935/live/' + streamKey2);
    console.log('  3. Camera Stream 1');
    console.log('     Stream Key: ' + streamKey3);
    console.log('     RTMP URL: rtmp://<SERVER_IP>:1935/live/' + streamKey3);
  }

  // Initialize config table
  const existingConfig = db.prepare('SELECT COUNT(*) as count FROM config').get();

  if (existingConfig.count === 0) {
    const insertConfig = db.prepare(`
      INSERT INTO config (key, value, description)
      VALUES (?, ?, ?)
    `);

    const maxStreams = process.env.MAX_CONCURRENT_STREAMS || '3';

    insertConfig.run('max_concurrent_streams', maxStreams, 'Maximum number of concurrent streams allowed');
    insertConfig.run('require_authentication', 'true', 'Require authentication for stream publishing');
    insertConfig.run('allow_recording', 'false', 'Allow DVR recording of streams');
    insertConfig.run('default_protocol', 'rtmp', 'Default streaming protocol (rtmp, srt)');
    insertConfig.run('session_timeout', '300', 'Session timeout in seconds for inactive streams');

    console.log('✓ Created default configuration');
    console.log('  - Max concurrent streams: ' + maxStreams);
  } else {
    console.log('Configuration already exists, skipping config creation');
  }

  console.log('\n✓ Database initialization completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Start the server: docker-compose up -d');
  console.log('2. Access web UI: http://<SERVER_IP>:80');
  console.log('3. Login with username: admin, password: ' + (process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'));
  console.log('4. Change your password immediately!');
}

// Run initialization
try {
  initializeSchema();
  initializeDefaultData();
  process.exit(0);
} catch (error) {
  console.error('Error initializing database:', error);
  process.exit(1);
}
