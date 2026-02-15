const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'livestream.db');
const db = new Database(dbPath);

console.log('Reading streams from database...');
const streams = db.prepare('SELECT * FROM streams').all();

console.log('\nCurrent streams:');
streams.forEach(stream => {
  console.log(`\nID: ${stream.id}`);
  console.log(`Name: ${stream.name}`);
  console.log(`Stream Key: ${stream.stream_key}`);
  console.log(`Description: ${stream.description}`);
  console.log(`Protocol: ${stream.protocol}`);
  console.log(`Max Bitrate: ${stream.max_bitrate}`);
  console.log(`Is Active: ${stream.is_active}`);
  console.log(`Created: ${stream.created_at}`);
  console.log(`Updated: ${stream.updated_at}`);
});

db.close();
