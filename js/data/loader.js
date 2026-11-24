// Bộ phân tích tệp TSV từ vựng HSK 1-9: tách bạch từ loại (pos) và nghĩa tiếng Việt
const POS_TAG_PATTERN = /^[a-z]{1,4}(\/[a-z]{1,4})*$/i;
const PLACEHOLDER_MEANINGS = new Set([
  '',
  'chưa cập nhật nghĩa',
  'chưa có nghĩa tiếng việt',
  'n/a',
  'null',
  'undefined',
  '-'
]);

export function isPosTagOnly(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  return POS_TAG_PATTERN.test(s);
}

export function isValidVietnameseMeaning(meaning) {
  const s = String(meaning || '').trim();
  if (!s) return false;
  if (PLACEHOLDER_MEANINGS.has(s.toLowerCase())) return false;
  if (isPosTagOnly(s)) return false;
  return true;
}

function parseTsvLine(line) {
  return line.split('\t').map((s) => s.trim());
}

export function normalizeTsvRows(tsvText, fallbackLevel) {
  const lines = String(tsvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = parseTsvLine(lines[i]);
    const c0 = (cols[0] || '').toLowerCase();
    if (i === 0 && (c0 === 'hanzi' || c0 === 'word' || c0 === 'id' || c0 === 'simplified')) {
      continue;
    }

    const hanzi = cols[0] || '';
    if (!hanzi) continue;

    const pinyin = cols[1] || '';
    let meaning = '';
    let pos = '';
    let level = fallbackLevel;
    let exZh = '';
    let exPy = '';
    let exVi = '';

    const c2 = cols[2] || '';
    const c3 = cols[3] || '';
    const c4 = cols[4] || '';

    if (isPosTagOnly(c2)) {
      // Định dạng: hanzi \t pinyin \t pos \t meaning \t [level] \t [exZh] \t [exPy] \t [exVi]
      pos = c2;
      meaning = isValidVietnameseMeaning(c3) ? c3 : '';
      const lvlNum = Number(c4);
      if (Number.isInteger(lvlNum) && lvlNum >= 1 && lvlNum <= 9) level = lvlNum;
      exZh = cols[5] || '';
      exPy = cols[6] || '';
      exVi = cols[7] || '';
    } else {
      // Định dạng: hanzi \t pinyin \t meaning \t [pos] \t [level] \t [exZh] \t [exPy] \t [exVi]
      meaning = isValidVietnameseMeaning(c2) ? c2 : '';
      if (isPosTagOnly(c3)) {
        pos = c3;
      } else if (c3 && !/^\d+$/.test(c3) && !meaning && isValidVietnameseMeaning(c3)) {
        meaning = c3;
      }
      const lvlNum = Number(c4 || c3);
      if (Number.isInteger(lvlNum) && lvlNum >= 1 && lvlNum <= 9) level = lvlNum;
      exZh = cols[5] || '';
      exPy = cols[6] || '';
      exVi = cols[7] || '';
    }

    const validMeaning = isValidVietnameseMeaning(meaning);

    items.push({
      id: `${level}_${i}_${hanzi}`,
      level,
      hanzi,
      pinyin,
      meaning: validMeaning ? meaning : '',
      hasValidMeaning: validMeaning,
      pos: pos || 'Từ vựng',
      exZh,
      exPy,
      exVi
    });
  }
  return items;
}

class DataLoader {
  constructor() {
    this.words = [];
    this.loaded = false;
    this.lastError = '';
  }

  async init(forceReload = false) {
    if (this.loaded && !forceReload && this.words.length > 0) {
      return this.words;
    }

    this.lastError = '';
    const tsvSources = [
      { url: './data/hsk1.tsv', level: 1 },
      { url: './data/hsk2.tsv', level: 2 },
      { url: './data/hsk3.tsv', level: 3 },
      { url: './data/hsk4.tsv', level: 4 },
      { url: './data/hsk5.tsv', level: 5 },
      { url: './data/hsk6.tsv', level: 6 },
      { url: './data/hsk7.tsv', level: 7 }
    ];

    try {
      const results = await Promise.all(
        tsvSources.map(async (src) => {
          const res = await fetch(src.url, { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${src.url}`);
          const text = await res.text();
          return normalizeTsvRows(text, src.level);
        })
      );

      let merged = results.flat();

      // Phân bổ bổ sung HSK 8 và HSK 9 từ nhóm từ cấp cao nếu chưa có tệp riêng
      const hasLv8 = merged.some((w) => w.level === 8);
      const hasLv9 = merged.some((w) => w.level === 9);
      const lv7Pool = merged.filter((w) => w.level === 7);

      if (!hasLv8 && lv7Pool.length > 0) {
        const half = Math.ceil(lv7Pool.length / 2);
        merged = merged.concat(
          lv7Pool.slice(0, half).map((w, idx) => ({
            ...w,
            id: `8_${idx}_${w.hanzi}`,
            level: 8
          }))
        );
      }

      if (!hasLv9 && lv7Pool.length > 0) {
        const half = Math.floor(lv7Pool.length / 2);
        merged = merged.concat(
          lv7Pool.slice(half).map((w, idx) => ({
            ...w,
            id: `9_${idx}_${w.hanzi}`,
            level: 9
          }))
        );
      }

      const seen = new Set();
      this.words = merged.filter((w) => {
        const key = `${w.level}::${w.hanzi}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      this.loaded = true;
      return this.words;
    } catch (err) {
      this.lastError = err?.message || 'Không thể tải tệp dữ liệu từ vựng.';
      if (!this.words.length) {
        this.words = [
          {
            id: '1_0_你好',
            level: 1,
            hanzi: '你好',
            pinyin: 'nǐ hǎo',
            meaning: 'xin chào',
            hasValidMeaning: true,
            pos: 'Thán từ',
            exZh: '你好，很高兴认识你！',
            exPy: 'Nǐ hǎo, hěn gāoxìng rènshi nǐ!',
            exVi: 'Xin chào, rất vui được làm quen với bạn!'
          },
          {
            id: '1_1_谢谢',
            level: 1,
            hanzi: '谢谢',
            pinyin: 'xièxie',
            meaning: 'cảm ơn',
            hasValidMeaning: true,
            pos: 'Động từ',
            exZh: '谢谢你的帮助。',
            exPy: 'Xièxie nǐ de bāngzhù.',
            exVi: 'Cảm ơn sự giúp đỡ của bạn.'
          }
        ];
      }
      this.loaded = true;
      return this.words;
    }
  }

  async getAllLoadedWords() {
    if (!this.loaded) await this.init();
    return this.words;
  }
}

export const dataLoader = new DataLoader();