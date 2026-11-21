import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json';
async function main() {
  const seen = new Set();
  for (let level = 1; level <= 5; level++) {
    const existingMap = new Map();
    const outPath = path.resolve(`data/hsk${level}.tsv`);
    if (fs.existsSync(outPath)) {
      fs.readFileSync(outPath, 'utf8').split(/\r?\n/).forEach((l) => {
        const c = l.split('\t');
        if (c[0]) existingMap.set(c[0].trim(), c);
      });
    }
    const res = await fetch(`${BASE_URL}/hsk-level-${level}.json`);
    const list = await res.json();
    const rows = [];
    for (const item of list) {
      const hanzi = (item.hanzi || '').trim();
      if (!hanzi || seen.has(hanzi)) continue;
      seen.add(hanzi);
      if (existingMap.has(hanzi)) rows.push(existingMap.get(hanzi).join('\t'));
      else rows.push([hanzi, (item.pinyin || '').trim(), 'từ vựng', (item.translations || []).join(', '), `HSK ${level}`, '', '', '', ''].join('\t'));
    }
    fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf8');
    console.log(`HSK ${level}: ${rows.length} từ`);
  }
}
main();