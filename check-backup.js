import fs from 'fs';
const stats = fs.statSync('storage/rapportini.db.bak');
console.log('Backup size:', stats.size);
console.log('Backup mtime:', stats.mtime);
