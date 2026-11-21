import { hanziToSyllables, parseSyllable, applyToneSandhi } from './pinyin-util.js';
import { store } from '../storage/db.js';

const PHONETIC_RULES = [
  {
    key: 'zh/ch/sh',
    test: (exp) => ['zh', 'ch', 'sh'].includes(exp.initial),
    title: 'Âm uốn lưỡi (zh / ch / sh)',
    tip: 'Cuộn đầu lưỡi cong lên chạm nhẹ vòm cứng phía sau lợi trên. Không bẹt môi như "tr/ch" tiếng Việt; "ch" cần bật hơi mạnh.',
    minimalPairs: '知道 (zhīdào) vs 迟到 (chídào) · 四 (sì) vs 十 (shí)',
    twister: '四是四，十是十，十四是十四，四十是四十。'
  },
  {
    key: 'z/c/s',
    test: (exp) => ['z', 'c', 's'].includes(exp.initial),
    title: 'Âm đầu lưỡi trước (z / c / s)',
    tip: 'Đặt đầu lưỡi thẳng, chạm mặt sau răng cửa dưới. "z" giống "d/tx" không bật hơi, "c" bật luồng hơi sắc qua khe răng.',
    minimalPairs: '早 (zǎo) vs 草 (cǎo) · 字 (zì) vs 次 (cì)',
    twister: '栽桑、采桑、晒桑，桑叶青青蚕儿壮。'
  },
  {
    key: 'j/q/x',
    test: (exp) => ['j', 'q', 'x'].includes(exp.initial),
    title: 'Âm mặt lưỡi (j / q / x)',
    tip: 'Mặt lưỡi nâng áp sát ngạc cứng, đầu lưỡi hạ thấp chạm răng dưới, khóe miệng kéo nhẹ như mỉm cười. "q" bật hơi mạnh.',
    minimalPairs: '七 (qī) vs 西 (xī) · 几 (jǐ) vs 起 (qǐ)',
    twister: '七加一，七减一，加完减完等于几？'
  },
  {
    key: 'ü',
    test: (exp) => exp.final.includes('ü') || (['j', 'q', 'x', 'y'].includes(exp.initial) && exp.final.startsWith('u')),
    title: 'Nguyên âm tròn môi ü',
    tip: 'Phát âm "i" tiếng Việt nhưng giữ nguyên lưỡi và chu tròn môi như đang huýt sáo.',
    minimalPairs: '去 (qù) vs 吃 (chī) · 女 (nǚ) vs 努 (nǔ)',
    twister: '稀奇稀奇真稀奇，麻雀踩死老母鸡。'
  },
  {
    key: 'r',
    test: (exp) => exp.initial === 'r',
    title: 'Phụ âm uốn lưỡi r',
    tip: 'Cuộn lưỡi lên như "sh" nhưng rung dây thanh quản, KHÔNG rung đầu lưỡi bần bật như chữ "r" miền Bắc/Trung Việt Nam.',
    minimalPairs: '人 (rén) vs 神 (shén) · 热 (rè) vs 社 (shè)',
    twister: '日头热，晒人肉，晒得心里直发愁。'
  },
  {
    key: '-n/-ng',
    test: (exp) => exp.final.endsWith('n') || exp.final.endsWith('ng'),
    title: 'Âm mũi cuối -n và -ng',
    tip: 'Với "-n", đầu lưỡi chạm lợi trên để khép âm; với "-ng", gốc lưỡi nâng về phía sau vòm mềm, miệng mở hơn.',
    minimalPairs: '汉 (hàn) vs 杭 (háng) · 民 (mín) vs 明 (míng)',
    twister: '扁担长，板凳宽，扁担没有板凳宽。'
  },
  {
    key: 'tone3',
    test: (exp) => exp.tone === 3,
    title: 'Thanh 3 (thanh hỏi-nặng trầm)',
    tip: 'Hạ giọng xuống mức thấp nhất (2-1-4), đừng đọc cao vút như dấu hỏi tiếng Việt khi đứng đầu cụm từ.',
    minimalPairs: '买 (mǎi - mua) vs 卖 (mài - bán) · 好 (hǎo) vs 号 (hào)',
    twister: '妈妈骑马，马慢，妈妈骂马。'
  }
];

export function gradePronunciation(targetHanzi, targetPinyin, recognizedTranscript, durationSec = 2) {
  const targetChars = [...targetHanzi].filter((c) => /[\u4e00-\u9fa5]/.test(c));
  const targetSylRaw = hanziToSyllables(targetHanzi, targetPinyin);
  const expected = applyToneSandhi(targetChars, targetSylRaw.map(parseSyllable));

  const spokenClean = (recognizedTranscript || '').replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '');
  const spokenChars = [...spokenClean].filter((c) => /[\u4e00-\u9fa5]/.test(c));
  const spokenSylRaw = spokenChars.length > 0 ? hanziToSyllables(spokenChars.join('')) : [];
  const actual = spokenSylRaw.map(parseSyllable);

  let phonePoints = 0;
  let tonePoints = 0;
  const charDetails = [];
  const triggeredRules = new Map();

  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i];
    const act = actual[i];
    const char = targetChars[i] || '';

    if (!act) {
      charDetails.push({
        char,
        expected: exp.raw,
        actual: '(thiếu)',
        status: 'bad',
        note: 'Thiếu âm tiết này'
      });
      recordErrorCategory('missing');
      continue;
    }

    const iniMatch = exp.initial === act.initial;
    const finMatch = exp.final === act.final;
    const toneMatch = exp.tone === act.tone;

    if (iniMatch && finMatch) phonePoints += 1;
    else if (iniMatch || finMatch) phonePoints += 0.5;

    if (toneMatch) tonePoints += 1;
    else if (Math.abs(exp.tone - act.tone) === 1) tonePoints += 0.3;

    let status = 'ok';
    const notes = [];
    if (!iniMatch || !finMatch) {
      status = 'bad';
      notes.push(`Đọc thành "${act.raw}" (sai ${!iniMatch ? 'thanh mẫu' : 'vận mẫu'})`);
    }
    if (!toneMatch) {
      if (status === 'ok') status = 'warn';
      notes.push(`Thanh ${act.tone} thay vì thanh ${exp.tone}`);
      if (exp.tone === 3) recordErrorCategory('tone3');
    }
    if (exp.sandhiNote) notes.push(exp.sandhiNote);

    if (status !== 'ok') {
      for (const rule of PHONETIC_RULES) {
        if (rule.test(exp)) {
          triggeredRules.set(rule.key, rule);
          recordErrorCategory(rule.key);
        }
      }
    }

    charDetails.push({
      char,
      expected: exp.raw,
      actual: act.raw,
      status,
      note: notes.join(' · ') || 'Chuẩn xác'
    });
  }

  const n = Math.max(1, expected.length);
  const accuracyScore = Math.round((phonePoints / n) * 100);
  const toneScore = Math.round((tonePoints / n) * 100);

  const diffCount = Math.abs(expected.length - actual.length);
  const completenessScore = Math.max(0, Math.round(((n - diffCount) / n) * 100));

  const sylPerSec = actual.length / Math.max(0.5, durationSec);
  const fluencyScore = actual.length === 0
    ? 0
    : sylPerSec >= 1.2 && sylPerSec <= 5.0
      ? Math.min(100, Math.round(80 + accuracyScore * 0.2))
      : 65;

  const totalScore = Math.round(
    accuracyScore * 0.4 + toneScore * 0.35 + completenessScore * 0.15 + fluencyScore * 0.1
  );

  const stars = totalScore >= 85 ? 3 : totalScore >= 65 ? 2 : totalScore >= 40 ? 1 : 0;

  return {
    totalScore,
    accuracyScore,
    toneScore,
    completenessScore,
    fluencyScore,
    stars,
    charDetails,
    expectedTones: expected.map((e) => e.tone),
    feedbackRules: Array.from(triggeredRules.values()),
    extraSyllables: actual.length > expected.length ? actual.length - expected.length : 0
  };
}

function recordErrorCategory(key) {
  const errs = store.state.phoneticErrors;
  errs[key] = (errs[key] || 0) + 1;
  store.save();
}