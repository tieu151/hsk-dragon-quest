function parseTsvLine(line) {
  return line.split('\t').map((s) => s.trim());
}

function normalizeTsvRows(tsvText, fallbackLevel) {
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

    let hanzi = '';
    let pinyin = '';
    let meaning = '';
    let pos = '';
    let exZh = '';
    let exPy = '';
    let exVi = '';
    let level = fallbackLevel;

    if (cols.length >= 3) {
      // Ho tro cac dinh dang TSV pho bien: hanzi, pinyin, meaning, [pos], [level], [exZh], [exPy], [exVi]
      hanzi = cols[0];
      pinyin = cols[1];
      meaning = cols[2];
      pos = cols[3] && !/^\d+$/.test(cols[3]) ? cols[3] : '';
      const lvlCandidate = Number(cols[4] || cols[3] || fallbackLevel);
      if (Number.isInteger(lvlCandidate) && lvlCandidate >= 1 && lvlCandidate <= 9) {
        level = lvlCandidate;
      }
      exZh = cols[5] || '';
      exPy = cols[6] || '';
      exVi = cols[7] || '';
    } else if (cols.length === 2) {
      hanzi = cols[0];
      meaning = cols[1];
    } else if (cols.length === 1 && cols[0]) {
      hanzi = cols[0];
      meaning = 'Chưa có nghĩa tiếng Việt';
    }

    if (!hanzi) continue;
    items.push({
      id: `${level}_${i}_${hanzi}`,
      level,
      hanzi,
      pinyin: pinyin || '',
      meaning: meaning || 'Chưa cập nhật nghĩa',
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

      // Phan bo bo sung cho HSK 8 va HSK 9 tu kho cap cao neu chua co file tsv rieng
      const hasLv8 = merged.some((w) => w.level === 8);
      const hasLv9 = merged.some((w) => w.level === 9);
      const lv7Pool = merged.filter((w) => w.level === 7);

      if (!hasLv8 && lv7Pool.length > 0) {
        const half = Math.ceil(lv7Pool.length / 2);
        const lv8Words = lv7Pool.slice(0, half).map((w, idx) => ({
          ...w,
          id: `8_${idx}_${w.hanzi}`,
          level: 8
        }));
        merged = merged.concat(lv8Words);
      }

      if (!hasLv9 && lv7Pool.length > 0) {
        const half = Math.floor(lv7Pool.length / 2);
        const lv9Words = lv7Pool.slice(half).map((w, idx) => ({
          ...w,
          id: `9_${idx}_${w.hanzi}`,
          level: 9
        }));
        merged = merged.concat(lv9Words);
      }

      // Khử trùng lặp theo (level, hanzi) giữ bản đầu tiên
      const seen = new Set();
      this.words = merged.filter((w) => {
        const key = `${w.level}::${w.hanzi}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      this.loaded = true;
      if (this.words.length === 0) {
        this.lastError = 'Dữ liệu từ vựng hiện đang rỗng.';
      }
      return this.words;
    } catch (err) {
      this.lastError = err?.message || 'Không thể tải tệp dữ liệu từ vựng.';
      // Dự phòng tối thiểu nếu mất toàn bộ file dữ liệu
      if (!this.words.length) {
        this.words = [
          { id: '1_0_你好', level: 1, hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'xin chào', pos: 'Thán từ', exZh: '你好！', exPy: 'Nǐ hǎo!', exVi: 'Xin chào!' },
          { id: '1_1_谢谢', level: 1, hanzi: '谢谢', pinyin: 'xièxie', meaning: 'cảm ơn', pos: 'Động từ', exZh: '谢谢你。', exPy: 'Xièxie nǐ.', exVi: 'Cảm ơn bạn.' },
          { id: '1_2_学习', level: 1, hanzi: '学习', pinyin: 'xuéxí', meaning: 'học tập', pos: 'Động từ', exZh: '我学习汉语。', exPy: 'Wǒ xuéxí Hànyǔ.', exVi: 'Tôi học tiếng Hán.' }
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
export { normalizeTsvRows };