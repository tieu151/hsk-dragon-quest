import fs from 'node:fs';
import path from 'node:path';

for (let level = 1; level <= 5; level++) {
  const p = path.resolve(`data/hsk${level}.tsv`);
  const count = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).length : 0;
  console.log(`HSK ${level}: ${count} từ`);
}