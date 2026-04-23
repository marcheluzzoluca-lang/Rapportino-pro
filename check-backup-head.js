import fs from 'fs';
const head = fs.readFileSync('storage/rapportini.db.bak', { encoding: 'utf8', length: 100 });
console.log(head.substring(0, 100));
