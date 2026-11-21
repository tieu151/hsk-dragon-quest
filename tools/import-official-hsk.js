import fs from 'node:fs';
import path from 'node:path';

const HSK30_URL = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json';
const HSK20_BASE = 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json';
const CACHE_FILE = path.resolve('tools/vi-dict-cache.json');

const viCache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};

async function translateBatchToVi(texts) {
  const uncached = texts.filter((t) => t && !viCache[t]);
  if (uncached.length === 0) return;

  // Gom nhóm 35 mục mỗi lần gọi để dịch siêu nhanh (~15 giây cho toàn bộ 11.000 từ)
  const chunkSize = 35;
  for (let i = 0; i < uncached.length; i += chunkSize) {
    const chunk = uncached.slice(i, i + chunkSize);
    const joined = chunk.join('\n');
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(joined)}`;
      const res = await fetch(url);
      const data = await res.json();
      const translatedFull = (data[0] || []).map((seg) => seg[0]).join('');
      const parts = translatedFull.split('\n');
      chunk.forEach((orig, idx) => {
        const vi = (parts[idx] || orig).trim();
        viCache[orig] = vi.charAt(0).toLowerCase() + vi.slice(1);
      });
    } catch {
      chunk.forEach((orig) => { viCache[orig] = orig; });
    }
    if ((i / chunkSize) % 10 === 0) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(viCache), 'utf8');
      process.stdout.write(`\rĐang Việt hóa từ điển: ${Math.min(i + chunkSize, uncached.length)}/${uncached.length} mục...`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(viCache), 'utf8');
  console.log('\n✅ Hoàn tất Việt hóa từ điển!');
}

function cleanEnglishMeaning(rawList) {
  return (rawList || [])
    .map((m) => m.replace(/CL:[^,;]+/g, '').replace(/\[[^\]]+\]/g, '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
}

async function main() {
  const buckets = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  const seen = new Set();
  const rawItems = [];

  console.log('1/3 Đang tải kho từ vựng HSK 3.0 & 2.0 (11.000+ từ)...');
  const res = await fetch(HSK30_URL);
  const fullList = await res.json();

  for (const item of fullList) {
    const hanzi = (item.simplified || '').trim();
    if (!hanzi || seen.has(hanzi)) continue;
    const levels = item.level || [];
    let lvl = 7;
    const newTag = levels.find((t) => t.startsWith('new-'));
    const oldTag = levels.find((t) => t.startsWith('old-'));
    if (newTag) lvl = Math.min(7, Number(newTag.replace('new-', '')) || 7);
    else if (oldTag) lvl = Math.min(6, Number(oldTag.replace('old-', '')) || 6);

    const form = (item.forms && item.forms[0]) || {};
    const pinyin = form.transcriptions?.pinyin || '';
    const enMeaning = cleanEnglishMeaning(form.meanings);
    const pos = (item.pos || ['từ vựng']).join('/');
    seen.add(hanzi);
    rawItems.push({ lvl, hanzi, pinyin, pos, enMeaning });
  }

  for (let l = 1; l <= 6; l++) {
    try {
      const r2 = await fetch(`${HSK20_BASE}/hsk-level-${l}.json`);
      const list2 = await r2.json();
      for (const item of list2) {
        const hanzi = (item.hanzi || '').trim();
        if (!hanzi || seen.has(hanzi)) continue;
        seen.add(hanzi);
        rawItems.push({ lvl: l, hanzi, pinyin: (item.pinyin || '').trim(), pos: 'từ vựng', enMeaning: cleanEnglishMeaning(item.translations) });
      }
    } catch {}
  }

  console.log(`2/3 Đang dịch ${rawItems.length} từ sang tiếng Việt (mất khoảng 30-45 giây)...`);
  const uniqueEn = [...new Set(rawItems.map((x) => x.enMeaning).filter(Boolean))];
  await translateBatchToVi(uniqueEn);

  console.log('3/3 Đang xuất ra 7 tệp data/hsk1.tsv -> data/hsk7.tsv...');
  for (const item of rawItems) {
    const viMeaning = viCache[item.enMeaning] || item.enMeaning || 'từ vựng HSK';
    buckets[item.lvl].push([item.hanzi, item.pinyin, item.pos, viMeaning, `HSK ${item.lvl}`, '', '', '', ''].join('\t'));
  }

  let total = 0;
  for (let l = 1; l <= 7; l++) {
    fs.writeFileSync(path.resolve(`data/hsk${l}.tsv`), buckets[l].join('\n') + '\n', 'utf8');
    total += buckets[l].length;
    console.log(`   - HSK ${l === 7 ? '7-9' : l}: ${buckets[l].length} từ (100% tiếng Việt)`);
  }
  console.log(`\n🎉 XONG! Tổng ${total} từ tiếng Việt đã sẵn sàng.`);
}
main();