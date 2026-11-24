// Quét dữ liệu từ vựng HSK, đếm số từ thiếu nghĩa theo từng cấp và xuất file missing-meanings.csv
import fs from 'node:fs';
import path from 'node:path';
import { normalizeTsvRows } from '../js/data/loader.js';

const levels = [1, 2, 3, 4, 5, 6, 7];
const missingRows = [];
const statsByLevel = {};

for (const lv of levels) {
  const filePath = path.resolve(`data/hsk${lv}.tsv`);
  if (!fs.existsSync(filePath)) continue;
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows = normalizeTsvRows(raw, lv);
  const missing = rows.filter((w) => !w.hasValidMeaning);
  statsByLevel[`HSK ${lv}`] = {
    tongSoTu: rows.length,
    hopLe: rows.length - missing.length,
    thieuNghia: missing.length
  };
  for (const w of missing) {
    missingRows.push({ level: lv, hanzi: w.hanzi, pinyin: w.pinyin });
  }
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const csvLines = ['Cap_HSK,Chu_Han,Pinyin'];
for (const r of missingRows) {
  csvLines.push(`${r.level},${escapeCsv(r.hanzi)},${escapeCsv(r.pinyin)}`);
}

const outPath = path.resolve('missing-meanings.csv');
fs.writeFileSync(outPath, '\uFEFF' + csvLines.join('\n') + '\n', 'utf8');

console.log('=== THỐNG KÊ TỪ THIẾU NGHĨA THEO CẤP HSK ===');
console.table(statsByLevel);
console.log(`Tổng số từ thiếu nghĩa đã xuất ra missing-meanings.csv: ${missingRows.length} từ`);