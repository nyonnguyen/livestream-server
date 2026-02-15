#!/usr/bin/env node

/**
 * Password reset CLI tool
 * Usage: node scripts/reset-password.js <username> <new-password>
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../src/config/database');

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: node scripts/reset-password.js <username> <new-password>');
  console.error('Example: node scripts/reset-password.js admin newpassword123');
  process.exit(1);
}

const [username, newPassword] = args;

// Validate password strength
if (newPassword.length < 8) {
  console.error('Error: Password must be at least 8 characters long');
  process.exit(1);
}

try {
  // Check if user exists
  const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);

  if (!user) {
    console.error(`Error: User '${username}' not found`);
    process.exit(1);
  }

  // Hash new password
  const passwordHash = bcrypt.hashSync(newPassword, 10);

  // Update password and set must_change_password to false
  const update = db.prepare(`
    UPDATE users
    SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  update.run(passwordHash, user.id);

  console.log(`✓ Password reset successfully for user '${username}'`);
  console.log('  The user can now login with the new password.');

} catch (error) {
  console.error('Error resetting password:', error.message);
  process.exit(1);
}
