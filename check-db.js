import Database from "better-sqlite3";
const db = new Database("storage/rapportini.db");
const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reports'").get().sql;
console.log(sql);

