import Database from 'better-sqlite3';

const db = new Database('data.db');

console.log('Clients:', db.prepare('SELECT id FROM clients').all());
console.log('Technicians:', db.prepare('SELECT id FROM technicians').all());
console.log('Companies:', db.prepare('SELECT id FROM companies').all());
