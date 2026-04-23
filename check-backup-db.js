import Database from "better-sqlite3";
const db = new Database("storage/rapportini.db.bak");
console.log("Reports count:", db.prepare("SELECT COUNT(*) as count FROM reports").get().count);
console.log("Report days count:", db.prepare("SELECT COUNT(*) as count FROM report_days").get().count);
console.log("Report items count:", db.prepare("SELECT COUNT(*) as count FROM report_items").get().count);
