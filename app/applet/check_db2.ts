import Database from 'better-sqlite3';
const db = new Database('/rapportini.db');
console.log(db.pragma('table_info(technicians)'));
