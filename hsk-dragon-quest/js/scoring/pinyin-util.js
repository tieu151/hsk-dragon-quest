const TONE_MAP = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4]
};

const INITIALS = [
  'zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
  'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'
];

export function stripToneMarks(py) {
  let out = '';
  for (const ch of py.toLowerCase()) {
    if (TONE_MAP[ch]) out += TONE_MAP[ch][0];
    else out += ch;
  }
  return out.replace(/v/g, 'ü');
}

export function detectToneNumber(syllable) {
  for (const ch of syllable.toLowerCase()) {
    if (TONE_MAP[ch]) return TONE_MAP[ch][1];
  }
  const numMatch = syllable.match(/[1-5]$/);
  if (numMatch) return Number(numMatch[0]);
  return 5;
}

export function parseSyllable(rawSyl) {
  const clean = rawSyl.trim().toLowerCase();
  const tone = detectToneNumber(clean);
  const base = stripToneMarks(clean).replace(/[1-5]/g, '');
  let initial = '';
  for (const ini of INITIALS) {
    if (base.startsWith(ini)) {
      initial = ini;
      break;
    }
  }
  const final = base.slice(initial.length);
  return { raw: rawSyl, base, initial, final, tone };
}

export function hanziToSyllables(hanzi, fallbackPinyin = '') {
  if (window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') {
    const arr = window.pinyinPro.pinyin(hanzi, { type: 'array', toneType: 'symbol' });
    return arr.filter((s) => /[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(s));
  }
  if (fallbackPinyin) {
    return fallbackPinyin
      .replace(/[.,!?，。！？]/g, ' ')
      .trim()
      .split(/\s+/);
  }
  return [...hanzi].map(() => 'a');
}

export function applyToneSandhi(chars, parsedSyllables) {
  const result = parsedSyllables.map((s) => ({ ...s }));
  for (let i = 0; i < result.length - 1; i++) {
    const curChar = chars[i];
    const cur = result[i];
    const next = result[i + 1];

    if (cur.tone === 3 && next.tone === 3) {
      cur.tone = 2;
      cur.sandhiNote = 'Biến điệu 3+3 → đọc thành thanh 2';
    }
    if (curChar === '不' && next.tone === 4) {
      cur.tone = 2;
      cur.sandhiNote = '不 đứng trước thanh 4 → đọc thành bú (thanh 2)';
    }
    if (curChar === '一') {
      if (next.tone === 4) {
        cur.tone = 2;
        cur.sandhiNote = '一 đứng trước thanh 4 → đọc thành yí (thanh 2)';
      } else if ([1, 2, 3].includes(next.tone)) {
        cur.tone = 4;
        cur.sandhiNote = '一 đứng trước thanh 1/2/3 → đọc thành yì (thanh 4)';
      }
    }
  }
  return result;
}