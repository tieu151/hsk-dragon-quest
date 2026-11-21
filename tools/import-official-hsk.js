import fs from 'node:fs';
import path from 'node:path';

// Kho dữ liệu chuẩn HSK 3.0 đầy đủ (>11.000 từ) + kho HSK 2.0
const HSK30_URL = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json';
const HSK20_BASE = 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json';

async function main() {
  const existingMap = new Map();
  for (let l = 1; l <= 7; l++) {
    const p = path.resolve(`data/hsk${l}.tsv`);
    if (fs.existsSync(p)) {
      fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((line) => {
        const cols = line.split('\t');
        if (cols[0]) existingMap.set(cols[0].trim(), cols);
      });
    }
  }

  const buckets = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  const seen = new Set();

  console.log('Đang tải kho từ vựng khổng lồ HSK 3.0 (11.000+ từ)...');
  const res = await fetch(HSK30_URL);
  if (!res.ok) throw new Error('Không thể kết nối tới kho từ vựng GitHub.');
  const fullList = await res.json();

  for (const item of fullList) {
    const hanzi = (item.simplified || '').trim();
    if (!hanzi || seen.has(hanzi)) continue;

    // Xác định cấp độ từ thẻ level (new-1..new-7 hoặc old-1..old-6)
    const levels = item.level || [];
    let lvl = 7;
    const newTag = levels.find((t) => t.startsWith('new-'));
    const oldTag = levels.find((t) => t.startsWith('old-'));
    if (newTag) lvl = Math.min(7, Number(newTag.replace('new-', '')) || 7);
    else if (oldTag) lvl = Math.min(6, Number(oldTag.replace('old-', '')) || 6);

    const form = (item.forms && item.forms[0]) || {};
    const pinyin = form.transcriptions?.pinyin || '';
    const meanings = (form.meanings || []).slice(0, 4).join(', ');
    const pos = (item.pos || ['từ vựng']).join('/');

    seen.add(hanzi);
    if (existingMap.has(hanzi)) {
      buckets[lvl].push(existingMap.get(hanzi).join('\t'));
    } else {
      buckets[lvl].push([hanzi, pinyin, pos, meanings, `HSK ${lvl}`, '', '', '', ''].join('\t'));
    }
  }

  // Bổ sung thêm các từ từ bộ HSK 2.0 nếu chưa có trong danh sách
  for (let l = 1; l <= 6; l++) {
    try {
      const r2 = await fetch(`${HSK20_BASE}/hsk-level-${l}.json`);
      const list2 = await r2.json();
      for (const item of list2) {
        const hanzi = (item.hanzi || '').trim();
        if (!hanzi || seen.has(hanzi)) continue;
        seen.add(hanzi);
        buckets[l].push([hanzi, (item.pinyin || '').trim(), 'từ vựng', (item.translations || []).join(', '), `HSK ${l}`, '', '', '', ''].join('\t'));
      }
    } catch {}
  }

  let total = 0;
  for (let l = 1; l <= 7; l++) {
    const outPath = path.resolve(`data/hsk${l}.tsv`);
    fs.writeFileSync(outPath, buckets[l].join('\n') + '\n', 'utf8');
    total += buckets[l].length;
    console.log(`✅ HSK ${l === 7 ? '7-9' : l}: ${buckets[l].length} từ`);
  }
  console.log(`\n🎉 TỔNG CỘNG: ${total} từ vựng đã được nạp vào hệ thống!`);
}
main();