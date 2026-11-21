import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const seenHanzi = new Set();

function hasVietnameseDiacritics(str) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str || '');
}

for (let lvl = 1; lvl <= 7; lvl++) {
  const file = path.join(dataDir, `hsk${lvl}.json`);
  if (!fs.existsSync(file)) continue;
  const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cleaned = [];

  arr.forEach((item, idx) => {
    const hz = String(item.hanzi || '').trim();
    if (!hz || seenHanzi.has(hz)) return;
    seenHanzi.add(hz);

    let assignedLevel = lvl;
    if (lvl === 7) {
      const third = Math.ceil(arr.length / 3);
      assignedLevel = idx < third ? 7 : idx < third * 2 ? 8 : 9;
    }

    const rawMeaning = String(item.meaning || '').trim();
    const isVi = hasVietnameseDiacritics(rawMeaning) || rawMeaning.includes('cần kiểm duyệt');
    const finalMeaning = isVi
      ? rawMeaning
      : `${rawMeaning} [cần kiểm duyệt]`;

    cleaned.push({
      id: item.id || (assignedLevel * 10000 + idx),
      level: assignedLevel,
      hanzi: hz,
      pinyin: String(item.pinyin || '').trim(),
      pos: String(item.pos || 'Từ vựng').trim(),
      meaning: finalMeaning,
      needsReview: !isVi,
      exZh: item.exZh || `请用“${hz}”造一个句子。`,
      exPy: item.exPy || `Qǐng yòng "${item.pinyin || hz}" zào yí gè jùzi.`,
      exVi: item.exVi || `Hãy đặt một câu với từ "${hz}".`
    });
  });

  fs.writeFileSync(file, JSON.stringify(cleaned), 'utf8');
  console.log(`Da chuan hoa & chong trung lap hsk${lvl}.json: ${cleaned.length} tu.`);
}