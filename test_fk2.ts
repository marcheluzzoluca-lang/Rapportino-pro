import Database from 'better-sqlite3';

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE reports (id INTEGER PRIMARY KEY);
  CREATE TABLE report_days (
    id INTEGER PRIMARY KEY,
    report_id INTEGER,
    FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
  );
`);

db.prepare("INSERT INTO reports (id) VALUES (1)").run();
try {
  db.prepare("UPDATE reports SET id = ? WHERE id = ?").run("1", 1);
  db.prepare("INSERT INTO report_days (report_id) VALUES (?)").run("1");
  console.log("String '1' inserted successfully");
} catch (e) {
  console.error("Error inserting string '1':", e.message);
}
