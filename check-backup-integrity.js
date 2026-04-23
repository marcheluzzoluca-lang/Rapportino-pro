import Database from "better-sqlite3";
try {
  const db = new Database("storage/rapportini.db.bak");
  db.pragma("integrity_check");
} catch (e) {
  console.error(e);
}
