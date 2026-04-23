import fs from 'fs';
const dbFile = fs.readFileSync('storage/rapportini.db.bak');
const strings = dbFile.toString('utf8').match(/[A-Za-z0-9_]{10,}/g);
console.log(strings?.slice(0, 50));

