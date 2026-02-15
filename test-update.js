const Database = require('better-sqlite3');
const db = new Database('./data/livestream.db');

console.log('\n=== BEFORE UPDATE ===');
let stream = db.prepare('SELECT * FROM streams WHERE id = 1').get();
console.log(JSON.stringify(stream, null, 2));

console.log('\n=== PERFORMING UPDATE ===');
const updateStmt = db.prepare(`
  UPDATE streams
  SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const result = updateStmt.run('Test Updated Name', 'Test updated description', 1);
console.log('Update result:', result);

console.log('\n=== AFTER UPDATE ===');
stream = db.prepare('SELECT * FROM streams WHERE id = 1').get();
console.log(JSON.stringify(stream, null, 2));

db.close();
