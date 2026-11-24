// Hệ thống Luyện thi HSK 1–9 Thực chiến:
// - Đầy đủ 3 kỹ năng chuẩn HSK cho từng cấp: Nghe hiểu (听力) · Đọc hiểu (阅读) · Viết & Ngữ pháp (书写)
// - Chống lặp câu hỏi giữa các đề (Cross-Exam Non-Repetition Ledger + 4 Bộ đề chuẩn tách biệt mỗi cấp)
// - Hỗ trợ đa đoạn văn đọc hiểu song song (Split-view), thẻ ghép câu (连词成句), chấm điểm thang 100 & thang HSK 300 điểm

import { store } from '../storage/db.js';
import { EXAM_CONFIGS, EXAM_SETS, SKILL_MODES } from './exam-config.js';
import { getPassagesForLevel } from './passages.js';
import {
  getListeningDialoguesForLevel,
  getWritingQuestionsForLevel,
  getContextualSentenceForWord,
  buildDynamicWritingOrder,
  buildDynamicWritingGrammar,
  buildDynamicListeningDialogue
} from './question-banks.js';
import { isValidVietnameseMeaning } from '../data/loader.js';

export { EXAM_CONFIGS, EXAM_SETS, SKILL_MODES };

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// Bộ nhớ chống lặp trong phiên (phòng trường hợp gọi generateExamPaper liên tiếp trong môi trường test Node)
const runtimeSeenByLevel = {};

function ensureSeenLedger(level) {
  const lv = Number(level) || 1;
  if (!runtimeSeenByLevel[lv]) {
    runtimeSeenByLevel[lv] = {
      passageIds: new Set(),
      dialogueIds: new Set(),
      writingIds: new Set(),
      wordHanzi: new Set(),
      completedSets: new Set(),
      generatedCount: 0
    };
  }
  const st = store?.state;
  if (st) {
    if (!st.examSeenByLevel || typeof st.examSeenByLevel !== 'object') {
      st.examSeenByLevel = {};
    }
    const persisted = st.examSeenByLevel[lv];
    if (persisted && typeof persisted === 'object') {
      (persisted.passageIds || []).forEach((id) => runtimeSeenByLevel[lv].passageIds.add(id));
      (persisted.dialogueIds || []).forEach((id) => runtimeSeenByLevel[lv].dialogueIds.add(id));
      (persisted.writingIds || []).forEach((id) => runtimeSeenByLevel[lv].writingIds.add(id));
      (persisted.wordHanzi || []).forEach((hz) => runtimeSeenByLevel[lv].wordHanzi.add(hz));
      (persisted.completedSets || []).forEach((s) => runtimeSeenByLevel[lv].completedSets.add(Number(s)));
    }
  }
  return runtimeSeenByLevel[lv];
}

function saveSeenLedger(level) {
  const lv = Number(level) || 1;
  const ledger = ensureSeenLedger(lv);
  const st = store?.state;
  if (!st) return;
  if (!st.examSeenByLevel || typeof st.examSeenByLevel !== 'object') {
    st.examSeenByLevel = {};
  }
  st.examSeenByLevel[lv] = {
    passageIds: Array.from(ledger.passageIds).slice(-120),
    dialogueIds: Array.from(ledger.dialogueIds).slice(-200),
    writingIds: Array.from(ledger.writingIds).slice(-200),
    wordHanzi: Array.from(ledger.wordHanzi).slice(-1500),
    completedSets: Array.from(ledger.completedSets)
  };
  try {
    store.save();
  } catch {}
}

export function getExamCoverageStats(level) {
  const ledger = ensureSeenLedger(level);
  return {
    seenPassages: ledger.passageIds.size,
    seenDialogues: ledger.dialogueIds.size,
    seenWriting: ledger.writingIds.size,
    seenWords: ledger.wordHanzi.size,
    totalSeenItems: ledger.passageIds.size + ledger.dialogueIds.size + ledger.writingIds.size + ledger.wordHanzi.size,
    completedSets: Array.from(ledger.completedSets).sort()
  };
}

export function resetExamSeenHistory(level = 0) {
  if (level) {
    delete runtimeSeenByLevel[level];
    if (store?.state?.examSeenByLevel) {
      delete store.state.examSeenByLevel[level];
      try { store.save(); } catch {}
    }
    return;
  }
  Object.keys(runtimeSeenByLevel).forEach((k) => delete runtimeSeenByLevel[k]);
  if (store?.state) {
    store.state.examSeenByLevel = {};
    try { store.save(); } catch {}
  }
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Phân bổ vị trí đáp án đúng (0..3) cân bằng để không vị trí nào vượt quá 40% trong một đề
function buildBalancedCorrectSlots(count) {
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(i % 4);
  }
  return shuffleArray(slots);
}

function areMeaningsTooSimilar(a, b) {
  const s1 = String(a || '').trim().toLowerCase();
  const s2 = String(b || '').trim().toLowerCase();
  if (!s1 || !s2) return true;
  if (s1 === s2) return true;
  if (s1.length >= 4 && s2.includes(s1)) return true;
  if (s2.length >= 4 && s1.includes(s2)) return true;
  return false;
}

function shortenMeaning(rawMeaning) {
  const s = String(rawMeaning || '').trim();
  if (s.length <= 75) return s;
  const parts = s.split(/[；;]/).map((x) => x.trim()).filter(Boolean);
  return parts.slice(0, 2).join('; ') || s.slice(0, 75);
}

// Chọn 3 đáp án nhiễu cùng cấp (±1), ưu tiên cùng từ loại và cùng độ dài chữ Hán
function pickDistractors(targetWord, allValidWords, count = 3, strictSamePos = false) {
  const targetLen = (targetWord.hanzi || '').length;
  const baseFilter = (w) =>
    w.hanzi !== targetWord.hanzi && !areMeaningsTooSimilar(w.meaning, targetWord.meaning);

  const sameLvSamePosSameLen = allValidWords.filter(
    (w) => baseFilter(w) && w.level === targetWord.level && w.pos === targetWord.pos && w.hanzi.length === targetLen
  );
  const sameLevelSamePos = allValidWords.filter(
    (w) => baseFilter(w) && w.level === targetWord.level && w.pos === targetWord.pos
  );
  const nearLevelSamePos = allValidWords.filter(
    (w) => baseFilter(w) && Math.abs(w.level - targetWord.level) <= 1 && w.pos === targetWord.pos
  );
  const sameLevelAnyPos = allValidWords.filter(
    (w) => baseFilter(w) && w.level === targetWord.level
  );
  const nearLevelAnyPos = allValidWords.filter(
    (w) => baseFilter(w) && Math.abs(w.level - targetWord.level) <= 1
  );
  const fallbackPool = allValidWords.filter(baseFilter);

  const pools = strictSamePos
    ? [
        shuffleArray(sameLvSamePosSameLen),
        shuffleArray(sameLevelSamePos),
        shuffleArray(nearLevelSamePos),
        shuffleArray(sameLevelAnyPos)
      ]
    : [
        shuffleArray(sameLvSamePosSameLen),
        shuffleArray(sameLevelSamePos),
        shuffleArray(nearLevelSamePos),
        shuffleArray(sameLevelAnyPos),
        shuffleArray(nearLevelAnyPos),
        shuffleArray(fallbackPool)
      ];

  const chosen = [];
  for (const pool of pools) {
    for (const candidate of pool) {
      if (chosen.length >= count) break;
      const dupHanzi = chosen.some((c) => c.hanzi === candidate.hanzi);
      const dupMeaning = chosen.some((c) => areMeaningsTooSimilar(c.meaning, candidate.meaning));
      if (!dupHanzi && !dupMeaning) {
        chosen.push(candidate);
      }
    }
    if (chosen.length >= count) break;
  }
  return chosen;
}

// Chọn danh sách từ vựng ưu tiên chưa từng xuất hiện ở các đề trước (hoặc phân mảnh theo bộ đề 1..4)
function selectNonRepeatingWords(candidatePool, ledger, setIndex = 0) {
  if (setIndex >= 1 && setIndex <= 4 && candidatePool.length >= 40) {
    const primarySlice = candidatePool.filter((_, idx) => (idx % 4) === (setIndex - 1));
    const unseenInSlice = shuffleArray(primarySlice.filter((w) => !ledger.wordHanzi.has(w.hanzi)));
    const seenInSlice = shuffleArray(primarySlice.filter((w) => ledger.wordHanzi.has(w.hanzi)));
    const restUnseen = shuffleArray(
      candidatePool.filter((w, idx) => (idx % 4) !== (setIndex - 1) && !ledger.wordHanzi.has(w.hanzi))
    );
    return [...unseenInSlice, ...seenInSlice, ...restUnseen];
  }

  let unseen = candidatePool.filter((w) => !ledger.wordHanzi.has(w.hanzi));
  // Nếu kho từ chưa làm còn quá ít (< 25 từ), tự động làm mới chu kỳ từ vựng để tiếp tục xoay vòng
  if (unseen.length < Math.min(25, candidatePool.length)) {
    ledger.wordHanzi.clear();
    unseen = [...candidatePool];
  }
  const seen = candidatePool.filter((w) => ledger.wordHanzi.has(w.hanzi));
  return [...shuffleArray(unseen), ...shuffleArray(seen)];
}

/**
 * Sinh bộ đề thi HSK 1–9 sát đề thi thực tế, đầy đủ 3 kỹ năng và không lặp lại giữa các đề.
 * @param {number} level - Cấp HSK (1..9)
 * @param {Array} rawAllWords - Toàn bộ kho từ vựng HSK 1–9
 * @param {Array|null} customWordSubset - Tập từ tùy chỉnh (khi ôn lại câu sai)
 * @param {Object} options - { setIndex: 0..4, skillMode: 'all'|'listening'|'reading'|'writing' }
 */
export function generateExamPaper(level, rawAllWords, customWordSubset = null, options = {}) {
  const lv = Number(level) || 1;
  const cfg = EXAM_CONFIGS[lv] || EXAM_CONFIGS[1];
  const setIndex = Number(options?.setIndex || 0);
  const skillMode = options?.skillMode || 'all';
  const ledger = ensureSeenLedger(lv);
  ledger.generatedCount += 1;

  const sourcePool = Array.isArray(customWordSubset) && customWordSubset.length > 0 ? customWordSubset : rawAllWords;
  const allValidWords = (Array.isArray(rawAllWords) ? rawAllWords : []).filter(
    (w) => w && w.hanzi && isValidVietnameseMeaning(w.meaning)
  );
  const validLevelWords = (Array.isArray(sourcePool) ? sourcePool : []).filter(
    (w) => w && w.hanzi && isValidVietnameseMeaning(w.meaning) && (customWordSubset ? true : w.level === lv)
  );
  const candidatePool = validLevelWords.length >= 10 ? validLevelWords : allValidWords;
  const orderedWords = selectNonRepeatingWords(candidatePool, ledger, setIndex);

  const usedHanzi = new Set();
  const usedQuestionSignatures = new Set();
  const draftQuestions = [];
  const passageMap = {};

  // Tính hạn ngạch từng phần theo chế độ thi (Tổng hợp 3 kỹ năng hoặc Luyện chuyên sâu 1 kỹ năng)
  const qCfg = cfg.quotas || {
    listeningDialogue: 5,
    listeningContext: 5,
    readingCloze: 6,
    readingPassageQ: 8,
    readingVocab: 0,
    writingOrder: 4,
    writingGrammar: 4
  };

  let quotas = { ...qCfg };
  if (customWordSubset) {
    const subLen = Math.min(cfg.totalQ, candidatePool.length);
    quotas = {
      listeningDialogue: 0,
      listeningContext: Math.max(1, Math.round(subLen * 0.4)),
      readingCloze: Math.max(1, Math.round(subLen * 0.35)),
      readingPassageQ: 0,
      readingVocab: Math.max(0, subLen - Math.round(subLen * 0.4) - Math.round(subLen * 0.35)),
      writingOrder: 0,
      writingGrammar: 0
    };
  } else if (skillMode === 'listening') {
    quotas = {
      listeningDialogue: 8,
      listeningContext: 12,
      readingCloze: 0,
      readingPassageQ: 0,
      readingVocab: 0,
      writingOrder: 0,
      writingGrammar: 0
    };
  } else if (skillMode === 'reading') {
    quotas = {
      listeningDialogue: 0,
      listeningContext: 0,
      readingCloze: 10,
      readingPassageQ: 8,
      readingVocab: 4,
      writingOrder: 0,
      writingGrammar: 0
    };
  } else if (skillMode === 'writing') {
    quotas = {
      listeningDialogue: 0,
      listeningContext: 0,
      readingCloze: 4,
      readingPassageQ: 0,
      readingVocab: 0,
      writingOrder: 6,
      writingGrammar: 6
    };
  }

  const targetTotal = customWordSubset
    ? Math.min(cfg.totalQ, candidatePool.length)
    : Object.values(quotas).reduce((a, b) => a + b, 0);

  // ============================================================================
  // PHẦN 1: NGHE HIỂU (听力 - LISTENING)
  // ============================================================================

  // 1A. Nghe hội thoại & bản tin thực tế (男/女/问) — sát đề thi HSK thật
  if (quotas.listeningDialogue > 0 && !customWordSubset) {
    const dialogues = getListeningDialoguesForLevel(lv, setIndex, ledger.dialogueIds);

    for (const d of dialogues) {
      if (draftQuestions.filter((q) => q.subSkill === 'listening-dialogue').length >= quotas.listeningDialogue) break;
      if (usedQuestionSignatures.has(d.id)) continue;
      usedQuestionSignatures.add(d.id);
      ledger.dialogueIds.add(d.id);

      draftQuestions.push({
        signatureId: d.id,
        part: 'Phần 1: Nghe hiểu (听力)',
        sectionTag: '1.1 Nghe hội thoại & Bản tin',
        skill: 'listening',
        subSkill: 'listening-dialogue',
        stem: `Nghe đoạn hội thoại / phát biểu và trả lời câu hỏi:\n❓ ${d.question}`,
        audio: {
          text: `${d.audioText} 问：${d.question}`,
          transcript: d.audioText,
          lang: 'zh-CN'
        },
        passageId: null,
        wordId: null,
        segments: null,
        rawOptions: d.options.map((optText, idx) => ({
          text: optText,
          isCorrect: idx === d.correctIndex
        })),
        explanation: d.explanation
      });
    }

    // Nếu các hội thoại cố định đã được làm ở các đề trước, sinh thêm hội thoại động từ kho từ vựng chưa dùng
    for (let i = 0; i < orderedWords.length; i++) {
      if (draftQuestions.filter((q) => q.subSkill === 'listening-dialogue').length >= quotas.listeningDialogue) break;
      const w = orderedWords[i];
      if (usedHanzi.has(w.hanzi)) continue;
      const distractors = pickDistractors(w, allValidWords, 3, false);
      if (distractors.length < 3) continue;
      const dynD = buildDynamicListeningDialogue(w, distractors, ledger.generatedCount + i);
      if (!dynD || usedQuestionSignatures.has(dynD.id)) continue;

      usedHanzi.add(w.hanzi);
      ledger.wordHanzi.add(w.hanzi);
      usedQuestionSignatures.add(dynD.id);
      ledger.dialogueIds.add(dynD.id);

      draftQuestions.push({
        signatureId: dynD.id,
        part: 'Phần 1: Nghe hiểu (听力)',
        sectionTag: '1.1 Nghe hội thoại & Bản tin',
        skill: 'listening',
        subSkill: 'listening-dialogue',
        stem: `Nghe đoạn hội thoại và trả lời câu hỏi:\n❓ ${dynD.question}`,
        audio: {
          text: `${dynD.audioText} 问：${dynD.question}`,
          transcript: dynD.audioText,
          lang: 'zh-CN'
        },
        passageId: null,
        wordId: w.id,
        segments: null,
        rawOptions: dynD.options.map((optText, idx) => ({
          text: shortenMeaning(optText),
          isCorrect: idx === dynD.correctIndex
        })),
        explanation: dynD.explanation
      });
    }
  }

  // 1B. Nghe câu / từ vựng trong ngữ cảnh thực tế (không lộ chữ Hán trong đề)
  if (quotas.listeningContext > 0) {
    let addedCtx = 0;
    for (let i = 0; i < orderedWords.length; i++) {
      if (addedCtx >= quotas.listeningContext) break;
      const w = orderedWords[i];
      if (usedHanzi.has(w.hanzi)) continue;
      const distractors = pickDistractors(w, allValidWords, 3, false);
      if (distractors.length < 3) continue;

      usedHanzi.add(w.hanzi);
      ledger.wordHanzi.add(w.hanzi);
      addedCtx += 1;

      const ctx = getContextualSentenceForWord(w, ledger.generatedCount + i);
      const spokenText = ctx ? `${w.hanzi}。 ${ctx.zh}` : w.hanzi;

      draftQuestions.push({
        signatureId: `lc_${w.id}`,
        part: 'Phần 1: Nghe hiểu (听力)',
        sectionTag: '1.2 Nghe từ & Câu ngữ cảnh',
        skill: 'listening',
        subSkill: 'listening-context',
        stem: 'Nghe từ vựng và câu ngữ cảnh tiếng Trung, sau đó chọn nghĩa tiếng Việt chính xác của từ trọng tâm:',
        audio: {
          text: spokenText,
          transcript: ctx ? `Từ trọng tâm: ${w.hanzi} (${w.pinyin}) · Câu: ${ctx.zh}` : `${w.hanzi} (${w.pinyin})`,
          lang: 'zh-CN'
        },
        passageId: null,
        wordId: w.id,
        segments: null,
        rawOptions: [
          { text: shortenMeaning(w.meaning), isCorrect: true },
          ...distractors.map((d) => ({ text: shortenMeaning(d.meaning), isCorrect: false }))
        ],
        explanation: `Từ trọng tâm được đọc là "${w.hanzi}" (${w.pinyin}) [${w.pos}] — nghĩa: "${w.meaning}".${ctx ? ` Câu ngữ cảnh: "${ctx.zh}"` : ''}`
      });
    }
  }

  // ============================================================================
  // PHẦN 2: ĐỌC HIỂU (阅读 - READING)
  // ============================================================================

  // 2A. Điền từ vào chỗ trống trong câu ngữ cảnh (选词填空 - Cloze)
  if (quotas.readingCloze > 0) {
    let addedFill = 0;
    for (let i = 0; i < orderedWords.length; i++) {
      if (addedFill >= quotas.readingCloze) break;
      const w = orderedWords[i];
      if (usedHanzi.has(w.hanzi)) continue;

      const ctx = getContextualSentenceForWord(w, ledger.generatedCount + i + 3);
      if (!ctx || !ctx.zh || !ctx.zh.includes(w.hanzi)) continue;

      const distractors = pickDistractors(w, allValidWords, 3, true);
      if (distractors.length < 3) continue;

      const blankedSentence = ctx.zh.replace(w.hanzi, '（____）');
      if (usedQuestionSignatures.has(blankedSentence)) continue;

      usedHanzi.add(w.hanzi);
      ledger.wordHanzi.add(w.hanzi);
      usedQuestionSignatures.add(blankedSentence);
      addedFill += 1;

      draftQuestions.push({
        signatureId: `fill_${w.id}`,
        part: 'Phần 2: Đọc hiểu (阅读)',
        sectionTag: '2.1 Điền từ vào ngữ cảnh (选词填空)',
        skill: 'fill',
        subSkill: 'reading-cloze',
        stem: `Chọn từ tiếng Trung thích hợp nhất để điền vào chỗ trống:\n${blankedSentence}`,
        audio: null,
        passageId: null,
        wordId: w.id,
        segments: null,
        rawOptions: [
          { text: w.hanzi, pinyin: w.pinyin, isCorrect: true },
          ...distractors.map((d) => ({ text: d.hanzi, pinyin: d.pinyin, isCorrect: false }))
        ],
        explanation: `Câu hoàn chỉnh: "${ctx.zh}". Từ cần điền là "${w.hanzi}" (${w.pinyin}) [${w.pos}] — nghĩa: "${w.meaning}".`
      });
    }
  }

  // 2B. Đọc hiểu từ vựng tình huống (词汇理解)
  if (quotas.readingVocab > 0) {
    let addedVocab = 0;
    for (let i = 0; i < orderedWords.length; i++) {
      if (addedVocab >= quotas.readingVocab) break;
      const w = orderedWords[i];
      if (usedHanzi.has(w.hanzi)) continue;
      const distractors = pickDistractors(w, allValidWords, 3, false);
      if (distractors.length < 3) continue;

      usedHanzi.add(w.hanzi);
      ledger.wordHanzi.add(w.hanzi);
      addedVocab += 1;

      draftQuestions.push({
        signatureId: `voc_${w.id}`,
        part: 'Phần 2: Đọc hiểu (阅读)',
        sectionTag: '2.2 Nhận diện từ vựng chuẩn HSK',
        skill: 'vocab',
        subSkill: 'reading-vocab',
        stem: `Trong hệ thống từ vựng ${cfg.label}, từ "${w.hanzi}" (${w.pos}) mang nghĩa tiếng Việt nào phù hợp nhất?`,
        audio: null,
        passageId: null,
        wordId: w.id,
        segments: null,
        rawOptions: [
          { text: shortenMeaning(w.meaning), isCorrect: true },
          ...distractors.map((d) => ({ text: shortenMeaning(d.meaning), isCorrect: false }))
        ],
        explanation: `"${w.hanzi}" (${w.pinyin}) – từ loại [${w.pos}], nghĩa tiếng Việt: "${w.meaning}".`
      });
    }
  }

  // 2C. Đọc hiểu đoạn văn (阅读理解 - Hỗ trợ 1 hoặc nhiều đoạn văn khác nhau trong cùng một đề)
  if (quotas.readingPassageQ > 0 && !customWordSubset) {
    let passages = getPassagesForLevel(lv, setIndex, ledger.passageIds);
    const neededPassages = Math.max(1, Math.ceil(quotas.readingPassageQ / 4));
    if (setIndex === 0 && passages.filter((p) => !ledger.passageIds.has(p.id)).length < neededPassages) {
      ledger.passageIds.clear();
      passages = getPassagesForLevel(lv, 0, ledger.passageIds);
    }

    let addedReadingQ = 0;
    for (const p of passages.slice(0, neededPassages)) {
      passageMap[p.id] = p;
      ledger.passageIds.add(p.id);
      for (const pq of p.questions) {
        if (addedReadingQ >= quotas.readingPassageQ) break;
        const correctSet = new Set(pq.correctIndexes);
        addedReadingQ += 1;
        draftQuestions.push({
          signatureId: `${p.id}_${addedReadingQ}`,
          part: 'Phần 2: Đọc hiểu (阅读)',
          sectionTag: `2.3 Đọc hiểu văn bản: ${p.title}`,
          skill: 'reading',
          subSkill: 'reading-passage',
          stem: pq.stem,
          audio: null,
          passageId: p.id,
          wordId: null,
          segments: null,
          rawOptions: pq.options.map((optText, idx) => ({
            text: optText,
            isCorrect: correctSet.has(idx)
          })),
          explanation: pq.explanation
        });
      }
    }
  }

  // ============================================================================
  // PHẦN 3: VIẾT & CẤU TRÚC NGỮ PHÁP (书写 - WRITING & GRAMMAR)
  // ============================================================================

  const totalWritingQuota = (quotas.writingOrder || 0) + (quotas.writingGrammar || 0);
  if (totalWritingQuota > 0 && !customWordSubset) {
    const writingPool = getWritingQuestionsForLevel(lv, setIndex, ledger.writingIds);
    const orderItems = writingPool.filter((w) => w.subSkill === 'order').slice(0, quotas.writingOrder);
    const grammarItems = writingPool.filter((w) => w.subSkill !== 'order').slice(0, quotas.writingGrammar);
    const pickedWriting = [...orderItems, ...grammarItems];

    // Bổ sung câu sắp xếp từ (连词成句) động từ kho từ vựng chưa dùng nếu ngân hàng cố định đã dùng ở đề trước
    let currentOrderCount = orderItems.length;
    for (let i = 0; i < orderedWords.length && currentOrderCount < quotas.writingOrder; i++) {
      const w = orderedWords[i];
      if (usedHanzi.has(w.hanzi)) continue;
      const dynOrder = buildDynamicWritingOrder(w, ledger.generatedCount + i);
      if (!dynOrder || usedQuestionSignatures.has(dynOrder.id)) continue;
      usedHanzi.add(w.hanzi);
      ledger.wordHanzi.add(w.hanzi);
      pickedWriting.push(dynOrder);
      currentOrderCount += 1;
    }

    // Bổ sung câu ngữ pháp & biểu đạt (语法与表达) động từ kho từ vựng chưa dùng
    let currentGrammarCount = grammarItems.length;
    for (let i = 0; i < orderedWords.length && currentGrammarCount < quotas.writingGrammar; i++) {
      const w = orderedWords[i];
      if (usedHanzi.has(w.hanzi)) continue;
      const distractors = pickDistractors(w, allValidWords, 3, true);
      if (distractors.length < 3) continue;
      const dynGram = buildDynamicWritingGrammar(w, distractors, ledger.generatedCount + i);
      if (!dynGram || usedQuestionSignatures.has(dynGram.id)) continue;
      usedHanzi.add(w.hanzi);
      ledger.wordHanzi.add(w.hanzi);
      pickedWriting.push(dynGram);
      currentGrammarCount += 1;
    }

    for (const wq of pickedWriting) {
      if (usedQuestionSignatures.has(wq.id)) continue;
      usedQuestionSignatures.add(wq.id);
      ledger.writingIds.add(wq.id);

      const isOrder = wq.subSkill === 'order' && Array.isArray(wq.segments);
      const shuffledSegments = isOrder ? shuffleArray(wq.segments) : null;

      draftQuestions.push({
        signatureId: wq.id,
        part: 'Phần 3: Viết & Ngữ pháp (书写)',
        sectionTag: isOrder ? '3.1 Sắp xếp từ thành câu (连词成句)' : '3.2 Ngữ pháp, Câu bệnh & Biên dịch',
        skill: 'writing',
        subSkill: isOrder ? 'writing-order' : 'writing-grammar',
        stem: wq.stem,
        audio: null,
        passageId: null,
        wordId: wq.wordId || null,
        segments: shuffledSegments,
        rawOptions: wq.options.map((optText, idx) => ({
          text: optText,
          isCorrect: idx === wq.correctIndex
        })),
        explanation: wq.explanation
      });
    }
  }

  // Nếu tổng câu chưa đủ targetTotal (ví dụ ở bộ từ tùy chỉnh), bổ sung câu điền từ/từ vựng không trùng
  for (let i = 0; i < orderedWords.length && draftQuestions.length < targetTotal; i++) {
    const w = orderedWords[i];
    if (usedHanzi.has(w.hanzi)) continue;
    const distractors = pickDistractors(w, allValidWords, 3, false);
    if (distractors.length < 3) continue;
    usedHanzi.add(w.hanzi);
    ledger.wordHanzi.add(w.hanzi);

    draftQuestions.push({
      signatureId: `extra_${w.id}`,
      part: 'Phần 2: Đọc hiểu (阅读)',
      sectionTag: '2.2 Từ vựng ngữ cảnh',
      skill: 'vocab',
      subSkill: 'reading-vocab',
      stem: `Từ "${w.hanzi}" mang nghĩa tiếng Việt nào phù hợp nhất?`,
      audio: null,
      passageId: null,
      wordId: w.id,
      segments: null,
      rawOptions: [
        { text: shortenMeaning(w.meaning), isCorrect: true },
        ...distractors.map((d) => ({ text: shortenMeaning(d.meaning), isCorrect: false }))
      ],
      explanation: `"${w.hanzi}" (${w.pinyin}) – từ loại [${w.pos}], nghĩa tiếng Việt: "${w.meaning}".`
    });
  }

  saveSeenLedger(lv);

  // Gán vị trí đáp án đúng cân bằng A/B/C/D cho các câu một đáp án
  const singleChoiceIndices = draftQuestions
    .map((q, idx) => (q.rawOptions.filter((o) => o.isCorrect).length === 1 ? idx : -1))
    .filter((idx) => idx >= 0);
  const balancedSlots = buildBalancedCorrectSlots(singleChoiceIndices.length);
  const slotByQuestionIdx = new Map();
  singleChoiceIndices.forEach((qIdx, i) => {
    slotByQuestionIdx.set(qIdx, balancedSlots[i]);
  });

  const questions = draftQuestions.map((q, qIdx) => {
    const corrects = q.rawOptions.filter((o) => o.isCorrect);
    const wrongs = shuffleArray(q.rawOptions.filter((o) => !o.isCorrect));
    let arranged = [];

    if (corrects.length === 1 && slotByQuestionIdx.has(qIdx)) {
      const targetSlot = slotByQuestionIdx.get(qIdx);
      let wrongPtr = 0;
      for (let s = 0; s < 4; s++) {
        if (s === targetSlot) {
          arranged.push(corrects[0]);
        } else if (wrongPtr < wrongs.length) {
          arranged.push(wrongs[wrongPtr++]);
        }
      }
    } else {
      arranged = shuffleArray(q.rawOptions);
    }

    const options = arranged.map((opt, optIdx) => {
      const item = {
        id: `q${qIdx + 1}_opt_${optIdx}`,
        letter: OPTION_LETTERS[optIdx] || String(optIdx + 1),
        text: opt.text
      };
      if (opt.pinyin) item.pinyin = opt.pinyin;
      return item;
    });

    const correct = arranged
      .map((opt, optIdx) => (opt.isCorrect ? options[optIdx].id : null))
      .filter(Boolean);

    return {
      id: `q_${qIdx + 1}`,
      signatureId: q.signatureId || `q_${qIdx + 1}`,
      number: qIdx + 1,
      part: q.part,
      sectionTag: q.sectionTag || q.part,
      skill: q.skill,
      subSkill: q.subSkill || q.skill,
      stem: q.stem,
      audio: q.audio,
      passageId: q.passageId,
      wordId: q.wordId,
      segments: q.segments || null,
      options,
      correct,
      explanation: q.explanation
    };
  });

  const setTag = setIndex >= 1 && setIndex <= 4 ? `SET0${setIndex}` : `RND${String(ledger.generatedCount).padStart(2, '0')}`;
  const modeLabel = SKILL_MODES.find((m) => m.id === skillMode)?.label || '';

  return {
    examId: `HSK${lv}-${setTag}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    level: lv,
    setIndex,
    skillMode,
    title: setIndex >= 1 && setIndex <= 4
      ? `Đề thi ${cfg.label} · Đề chuẩn số 0${setIndex}`
      : `Đề thi ${cfg.label}${skillMode !== 'all' ? ` (${modeLabel})` : ''}`,
    durationSec: skillMode === 'all' && !customWordSubset ? cfg.durationSec : questions.length * 45,
    maxAudioPlays: cfg.maxAudioPlays,
    passPercent: cfg.passPercent,
    officialMaxScore: cfg.officialMaxScore || 300,
    officialPassScore: cfg.officialPassScore || 180,
    allowPartialCredit: cfg.allowPartialCredit,
    passages: passageMap,
    questions
  };
}

// Chấm điểm bài thi: trả về cả thang điểm 100 lẫn thang điểm HSK Quốc tế 300 điểm (Nghe 100 + Đọc 100 + Viết 100)
export function gradeExamPaper(paper, answersMap = {}, allowPartialCredit = false) {
  let earnedPoints = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  const partStats = {};
  const skillBuckets = {
    listening: { label: '🎧 Nghe hiểu (听力)', earned: 0, total: 0 },
    reading: { label: '📖 Đọc hiểu (阅读)', earned: 0, total: 0 },
    writing: { label: '✍️ Viết & Ngữ pháp (书写)', earned: 0, total: 0 }
  };

  const details = paper.questions.map((q) => {
    const selected = Array.isArray(answersMap[q.id]) ? answersMap[q.id] : [];
    const correctSet = new Set(q.correct);

    if (!partStats[q.part]) {
      partStats[q.part] = { earned: 0, total: 0 };
    }
    partStats[q.part].total += 1;

    const bucketKey = q.skill === 'listening' ? 'listening' : q.skill === 'writing' ? 'writing' : 'reading';
    skillBuckets[bucketKey].total += 1;

    let qScore = 0;
    let status = 'blank';

    if (selected.length === 0) {
      blankCount += 1;
      status = 'blank';
    } else if (q.correct.length === 1) {
      if (selected.length === 1 && selected[0] === q.correct[0]) {
        qScore = 1;
        correctCount += 1;
        status = 'correct';
      } else {
        wrongCount += 1;
        status = 'wrong';
      }
    } else {
      const allCorrectPicked = q.correct.every((cid) => selected.includes(cid));
      const noWrongPicked = selected.every((sid) => correctSet.has(sid));
      if (allCorrectPicked && noWrongPicked && selected.length === q.correct.length) {
        qScore = 1;
        correctCount += 1;
        status = 'correct';
      } else if (allowPartialCredit && noWrongPicked && selected.length > 0) {
        qScore = selected.length / q.correct.length;
        wrongCount += 1;
        status = 'partial';
      } else {
        wrongCount += 1;
        status = 'wrong';
      }
    }

    earnedPoints += qScore;
    partStats[q.part].earned += qScore;
    skillBuckets[bucketKey].earned += qScore;

    return {
      question: q,
      selected,
      qScore,
      status
    };
  });

  const totalQ = Math.max(1, paper.questions.length);
  const score100 = Math.round((earnedPoints / totalQ) * 100);
  const passed = score100 >= (paper.passPercent || 60);

  // Tính điểm chuẩn HSK 300 điểm (mỗi kỹ năng có mặt tối đa 100 điểm, quy đổi lên tổng 300)
  const activeSkills = Object.values(skillBuckets).filter((b) => b.total > 0);
  const weightPerSkill = activeSkills.length > 0 ? 300 / activeSkills.length : 300;
  let hsk300Total = 0;
  const hskBreakdown = {};
  Object.entries(skillBuckets).forEach(([k, b]) => {
    const maxPts = b.total > 0 ? Math.round(weightPerSkill) : 0;
    const pts = b.total > 0 ? Math.round((b.earned / b.total) * weightPerSkill) : 0;
    hsk300Total += pts;
    hskBreakdown[k] = {
      label: b.label,
      earned: b.earned,
      total: b.total,
      score100: b.total > 0 ? Math.round((b.earned / b.total) * 100) : 0,
      hskScore: pts,
      hskMax: maxPts
    };
  });

  return {
    score: score100,
    maxScore: 100,
    hsk300Score: Math.min(300, hsk300Total),
    hsk300Max: 300,
    hskBreakdown,
    earnedPoints: Number(earnedPoints.toFixed(2)),
    totalQuestions: paper.questions.length,
    correctCount,
    wrongCount,
    blankCount,
    passed,
    partStats,
    details
  };
}

function formatCountdown(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function hasChineseSpeechVoice() {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return true;
    return voices.some((v) => /^zh|cmn/i.test(v.lang || ''));
  } catch {
    return false;
  }
}

function renderPassageHtml(passage, showPinyin, isCollapsed, interactiveReview, wordLookupMap) {
  if (!passage) return '';
  return `
    <div class="exam-passage-card ${isCollapsed ? 'is-collapsed' : ''}">
      <div class="exam-passage-header">
        <div>
          <strong>📖 ${passage.title}</strong>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" data-toggle-passage-py="${passage.id}">
            ${showPinyin ? '🙈 Ẩn Pinyin' : '👁️ Hiện Pinyin'}
          </button>
          <button type="button" class="btn btn-outline btn-sm exam-passage-collapse-btn" data-toggle-passage-collapse="${passage.id}">
            ${isCollapsed ? '▾ Mở đoạn văn' : '▴ Thu gọn'}
          </button>
        </div>
      </div>
      <div class="exam-passage-body ${showPinyin ? '' : 'hide-rt'} ${isCollapsed ? 'hidden' : ''}" lang="zh-CN">
        ${passage.paragraphs
          .map(
            (para) =>
              `<p class="exam-passage-para">${para
                .map((tok) => {
                  const hasWord = interactiveReview && wordLookupMap && wordLookupMap.has(tok.zh);
                  const clickableAttr = hasWord
                    ? `class="exam-review-word" data-lookup-zh="${tok.zh}" title="Bấm để xem nghĩa"`
                    : '';
                  if (!tok.py) {
                    return `<span ${clickableAttr}>${tok.zh}</span>`;
                  }
                  return `<ruby ${clickableAttr}><rb>${tok.zh}</rb><rt>${tok.py}</rt></ruby>`;
                })
                .join('')}</p>`
          )
          .join('')}
      </div>
    </div>
  `;
}

// Giao diện chọn Bộ đề (Đề 01..04 hoặc Đề sinh mới chống lặp) & Chế độ kỹ năng trước khi vào thi
export function launchExamUI(container, level, allWords, onExitExam, savedDraft = null, customWordSubset = null, directOptions = null) {
  const cfg = EXAM_CONFIGS[level] || EXAM_CONFIGS[1];

  if (savedDraft && savedDraft.paper && !customWordSubset && !directOptions) {
    container.innerHTML = `
      <div class="card" style="max-width:580px;margin:24px auto;text-align:center">
        <h2 class="card-title">📝 Phát hiện bài thi ${cfg.label} đang làm dở</h2>
        <p style="color:var(--text-muted);font-size:0.9rem;margin:10px 0 18px">
          Mã đề: <code>${savedDraft.paper.examId}</code> · Đã trả lời <strong>${Object.keys(savedDraft.answers || {}).filter((k) => (savedDraft.answers[k] || []).length > 0).length}/${savedDraft.paper.questions.length}</strong> câu.
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button type="button" class="btn btn-primary" id="btn-draft-continue">▶️ Tiếp tục làm bài</button>
          <button type="button" class="btn btn-outline" id="btn-draft-fresh">🔄 Chọn đề thi mới</button>
          <button type="button" class="btn btn-outline" id="btn-draft-cancel">Quay lại</button>
        </div>
      </div>
    `;
    document.getElementById('btn-draft-continue').onclick = () =>
      startExamSession(container, savedDraft.paper, allWords, onExitExam, savedDraft);
    document.getElementById('btn-draft-fresh').onclick = () => {
      store.state.inProgressExam = null;
      store.save();
      renderExamSetupScreen(container, level, allWords, onExitExam);
    };
    document.getElementById('btn-draft-cancel').onclick = () => onExitExam();
    return;
  }

  if (customWordSubset || directOptions) {
    const paper = generateExamPaper(level, allWords, customWordSubset, directOptions || {});
    startExamSession(container, paper, allWords, onExitExam, null);
    return;
  }

  renderExamSetupScreen(container, level, allWords, onExitExam);
}

function renderExamSetupScreen(container, level, allWords, onExitExam) {
  const cfg = EXAM_CONFIGS[level] || EXAM_CONFIGS[1];
  const stats = getExamCoverageStats(level);
  let selectedSetIndex = 0; // Mặc định: Đề sinh mới chống lặp, hoặc chọn Đề chuẩn 1..4
  for (let s = 1; s <= 4; s++) {
    if (!stats.completedSets.includes(s)) {
      selectedSetIndex = s;
      break;
    }
  }
  let selectedSkillMode = 'all';

  const renderSetup = () => {
    container.innerHTML = `
      <div class="card" style="max-width:760px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <button type="button" class="btn btn-outline btn-sm" id="btn-setup-back">← Quay lại Phòng thi</button>
          <span class="badge-pill">${cfg.standard || 'Chuẩn HSK'} · Thang điểm 300 (Đạt ≥ 180)</span>
        </div>

        <h2 class="card-title" style="font-size:1.35rem;margin-bottom:4px">📋 Cấu hình đề thi ${cfg.label}</h2>
        <p style="font-size:0.88rem;color:var(--text-muted);margin:0 0 14px">${cfg.desc}</p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          ${(cfg.skillsMeta || []).map((tag) => `<span class="badge-pill" style="background:var(--surface-alt);border:1px solid var(--border);font-weight:700">${tag}</span>`).join('')}
          <span class="badge-pill">⏱️ ${cfg.minutes} phút · ${cfg.totalQ} câu</span>
        </div>

        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong style="font-size:0.92rem">1. Chọn Bộ Đề Thi (Cam kết không lặp câu hỏi giữa các đề)</strong>
            <span style="font-size:0.78rem;color:var(--text-muted)">Đã luyện: <strong>${stats.totalSeenItems}</strong> mục không trùng</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px">
            ${EXAM_SETS.map((s) => {
              const isDone = s.id > 0 && stats.completedSets.includes(s.id);
              const isAct = selectedSetIndex === s.id;
              return `
                <button type="button" class="exam-setup-option ${isAct ? 'is-active' : ''}" data-pick-set="${s.id}" style="text-align:left;padding:11px 12px;border-radius:12px;border:1.5px solid ${isAct ? 'var(--primary)' : 'var(--border)'};background:${isAct ? 'var(--surface-alt)' : 'var(--bg)'};cursor:pointer">
                  <div style="display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:0.88rem;color:var(--text)">
                    <span>${s.label}</span>
                    ${isDone ? '<span class="badge-pill" style="background:#dcfce7;color:#15803d">✓ Đã làm</span>' : ''}
                  </div>
                  <div style="font-size:0.77rem;color:var(--text-muted);margin-top:4px;line-height:1.35">${s.desc}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div style="margin-bottom:18px">
          <strong style="font-size:0.92rem;display:block;margin-bottom:8px">2. Chọn Chế Độ Kỹ Năng</strong>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px">
            ${SKILL_MODES.map((m) => {
              const isAct = selectedSkillMode === m.id;
              return `
                <button type="button" class="exam-setup-option ${isAct ? 'is-active' : ''}" data-pick-mode="${m.id}" style="text-align:left;padding:11px 12px;border-radius:12px;border:1.5px solid ${isAct ? 'var(--primary)' : 'var(--border)'};background:${isAct ? 'var(--surface-alt)' : 'var(--bg)'};cursor:pointer">
                  <div style="font-weight:800;font-size:0.88rem;color:var(--text)">${m.label}</div>
                  <div style="font-size:0.77rem;color:var(--text-muted);margin-top:4px;line-height:1.35">${m.desc}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-top:12px;border-top:1px solid var(--border)">
          <button type="button" class="btn btn-outline btn-sm" id="btn-reset-seen" ${stats.totalSeenItems === 0 ? 'disabled' : ''}>
            ♻️ Làm mới lịch sử chống lặp (${stats.totalSeenItems} mục)
          </button>
          <button type="button" class="btn btn-primary" id="btn-launch-now" style="padding:12px 24px;font-size:0.98rem">
            🚀 Bắt đầu làm bài ${cfg.label}
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-setup-back').onclick = () => onExitExam();
    document.querySelectorAll('[data-pick-set]').forEach((b) => {
      b.onclick = () => {
        selectedSetIndex = Number(b.dataset.pickSet);
        renderSetup();
      };
    });
    document.querySelectorAll('[data-pick-mode]').forEach((b) => {
      b.onclick = () => {
        selectedSkillMode = b.dataset.pickMode;
        renderSetup();
      };
    });
    document.getElementById('btn-reset-seen').onclick = () => {
      resetExamSeenHistory(level);
      renderExamSetupScreen(container, level, allWords, onExitExam);
    };
    document.getElementById('btn-launch-now').onclick = () => {
      const paper = generateExamPaper(level, allWords, null, {
        setIndex: selectedSetIndex,
        skillMode: selectedSkillMode
      });
      startExamSession(container, paper, allWords, onExitExam, null);
    };
  };

  renderSetup();
}

function startExamSession(container, paper, allWords, onExitExam, resumeState = null) {
  document.body.classList.add('exam-focus-mode');

  const wordByIdMap = new Map();
  const wordByHanziMap = new Map();
  (allWords || []).forEach((w) => {
    if (!w) return;
    if (w.id) wordByIdMap.set(w.id, w);
    if (w.hanzi && !wordByHanziMap.has(w.hanzi)) wordByHanziMap.set(w.hanzi, w);
  });

  const examState = {
    phase: 'taking',
    paper,
    startedAt: resumeState?.startedAt || Date.now(),
    durationSec: resumeState?.durationSec || paper.durationSec,
    answers: resumeState?.answers ? { ...resumeState.answers } : {},
    flagged: new Set(Array.isArray(resumeState?.flagged) ? resumeState.flagged : []),
    playCounts: resumeState?.playCounts ? { ...resumeState.playCounts } : {},
    skippedAudio: new Set(Array.isArray(resumeState?.skippedAudio) ? resumeState.skippedAudio : []),
    activeQNumber: resumeState?.activeQNumber || 1,
    activePartFilter: 'ALL',
    audioRate: 0.92,
    showPassagePinyin: false,
    passageCollapsedMap: {},
    mobileDrawerOpen: false,
    gradeResult: null,
    finishedElapsedSec: 0
  };

  let timerInterval = null;
  let keydownHandler = null;
  let beforeUnloadHandler = null;

  const persistDraft = () => {
    if (examState.phase !== 'taking') return;
    store.state.inProgressExam = {
      level: paper.level,
      examId: paper.examId,
      startedAt: examState.startedAt,
      durationSec: examState.durationSec,
      paper: examState.paper,
      answers: examState.answers,
      flagged: Array.from(examState.flagged),
      playCounts: examState.playCounts,
      skippedAudio: Array.from(examState.skippedAudio),
      activeQNumber: examState.activeQNumber
    };
    store.save();
  };

  const cleanupFocusMode = () => {
    document.body.classList.remove('exam-focus-mode');
    if (timerInterval) clearInterval(timerInterval);
    if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
    if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler);
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {}
  };

  beforeUnloadHandler = (e) => {
    if (examState.phase === 'taking') {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  const getRemainingSec = () => {
    const elapsed = Math.floor((Date.now() - examState.startedAt) / 1000);
    return Math.max(0, examState.durationSec - elapsed);
  };

  const submitExamNow = (isAutoTimeout = false) => {
    if (examState.phase !== 'taking') return;
    examState.phase = 'review';
    examState.finishedElapsedSec = Math.min(
      examState.durationSec,
      Math.max(1, Math.floor((Date.now() - examState.startedAt) / 1000))
    );
    if (timerInterval) clearInterval(timerInterval);

    const result = gradeExamPaper(paper, examState.answers, paper.allowPartialCredit);
    examState.gradeResult = result;

    if (paper.setIndex >= 1 && paper.setIndex <= 4) {
      const ledger = ensureSeenLedger(paper.level);
      ledger.completedSets.add(paper.setIndex);
      saveSeenLedger(paper.level);
    }

    store.state.inProgressExam = null;
    store.state.examHistory.unshift({
      level: paper.level,
      examId: paper.examId,
      setIndex: paper.setIndex || 0,
      score: result.score,
      maxScore: result.maxScore,
      hsk300Score: result.hsk300Score,
      passed: result.passed,
      durationSeconds: examState.finishedElapsedSec,
      date: new Date().toLocaleDateString('vi-VN')
    });
    store.state.profile.xp += result.correctCount * 10 + (result.passed ? 50 : 10);
    store.state.profile.coins += result.correctCount * 2;
    store.save();

    if (isAutoTimeout) {
      alert('⏰ Đã hết thời gian làm bài! Hệ thống đã tự động nộp bài của bạn.');
    }
    renderExamScreen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openConfirmSubmitModal = () => {
    const unansweredNums = paper.questions
      .filter((q) => !(Array.isArray(examState.answers[q.id]) && examState.answers[q.id].length > 0))
      .map((q) => q.number);

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'exam-confirm-overlay';
    modalOverlay.innerHTML = `
      <div class="exam-confirm-box" role="dialog" aria-modal="true" aria-labelledby="confirm-sub-title">
        <h3 id="confirm-sub-title" style="margin:0 0 8px">📋 Xác nhận nộp bài thi</h3>
        <p style="font-size:0.9rem;color:var(--text-muted);margin:0 0 12px">
          ${
            unansweredNums.length === 0
              ? 'Bạn đã hoàn thành tất cả các câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ?'
              : `Bạn còn <strong>${unansweredNums.length} câu chưa làm</strong>. Bấm vào số câu bên dưới để quay lại kiểm tra:`
          }
        </p>
        ${
          unansweredNums.length > 0
            ? `<div class="exam-unanswered-chips">${unansweredNums
                .map((num) => `<button type="button" class="btn btn-outline btn-sm" data-jump-unanswered="${num}">Câu ${num}</button>`)
                .join('')}</div>`
            : ''
        }
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
          <button type="button" class="btn btn-outline" id="btn-cancel-submit">Tiếp tục làm bài</button>
          <button type="button" class="btn btn-primary" id="btn-do-submit">✅ Nộp bài ngay</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    modalOverlay.querySelectorAll('[data-jump-unanswered]').forEach((btn) => {
      btn.onclick = () => {
        const num = Number(btn.dataset.jumpUnanswered);
        modalOverlay.remove();
        jumpToQuestion(num);
      };
    });
    modalOverlay.querySelector('#btn-cancel-submit').onclick = () => modalOverlay.remove();
    modalOverlay.querySelector('#btn-do-submit').onclick = () => {
      modalOverlay.remove();
      submitExamNow(false);
    };
  };

  const jumpToQuestion = (qNumber) => {
    const q = paper.questions.find((item) => item.number === qNumber);
    if (q && examState.activePartFilter !== 'ALL' && examState.activePartFilter !== q.part) {
      examState.activePartFilter = 'ALL';
      renderTakingScreen();
    }
    examState.activeQNumber = qNumber;
    examState.mobileDrawerOpen = false;
    const drawer = document.getElementById('exam-nav-drawer');
    if (drawer) drawer.classList.remove('is-open');
    updateNavGridState();
    const targetEl = document.getElementById(`exam-q-card-${qNumber}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.focus({ preventScroll: true });
    }
  };

  const updateNavGridState = () => {
    const total = paper.questions.length;
    const answeredCount = paper.questions.filter(
      (q) => Array.isArray(examState.answers[q.id]) && examState.answers[q.id].length > 0
    ).length;
    const unansweredCount = total - answeredCount;
    const pct = Math.round((answeredCount / Math.max(1, total)) * 100);

    const summaryEl = document.getElementById('exam-nav-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `Đã làm <strong>${answeredCount}</strong> · Chưa làm <strong>${unansweredCount}</strong> · Tổng <strong>${total}</strong>`;
    }
    const barFillEl = document.getElementById('exam-nav-bar-fill');
    if (barFillEl) {
      barFillEl.style.width = `${pct}%`;
    }
    const pctLabelEl = document.getElementById('exam-nav-pct');
    if (pctLabelEl) {
      pctLabelEl.textContent = `${pct}%`;
    }

    paper.questions.forEach((q) => {
      const btn = document.getElementById(`exam-nav-btn-${q.number}`);
      if (!btn) return;
      const isAnswered = Array.isArray(examState.answers[q.id]) && examState.answers[q.id].length > 0;
      const isCurrent = examState.activeQNumber === q.number;
      const isFlagged = examState.flagged.has(q.id);
      btn.className = `exam-nav-num ${isAnswered ? 'is-answered' : 'is-unanswered'} ${isCurrent ? 'is-current' : ''}`;
      btn.innerHTML = `${q.number}${isFlagged ? '<span class="exam-flag-dot" aria-label="Đã đánh dấu xem lại">🚩</span>' : ''}`;
    });
  };

  const handleSelectOption = (q, optId) => {
    if (examState.phase !== 'taking') return;
    const warnEl = document.getElementById(`exam-warn-${q.id}`);
    if (warnEl) warnEl.textContent = '';

    const currentSelected = Array.isArray(examState.answers[q.id]) ? [...examState.answers[q.id]] : [];
    const maxAllowed = q.correct.length;

    if (maxAllowed === 1) {
      if (currentSelected.length === 1 && currentSelected[0] === optId) {
        examState.answers[q.id] = [];
      } else {
        examState.answers[q.id] = [optId];
      }
    } else {
      const idx = currentSelected.indexOf(optId);
      if (idx >= 0) {
        currentSelected.splice(idx, 1);
        examState.answers[q.id] = currentSelected;
      } else if (currentSelected.length >= maxAllowed) {
        if (warnEl) {
          warnEl.textContent = `⚠️ Câu này chỉ chọn tối đa ${maxAllowed} đáp án. Hãy bỏ chọn 1 đáp án trước.`;
        }
        const inp = document.querySelector(`input[data-q-id="${q.id}"][value="${optId}"]`);
        if (inp) inp.checked = false;
        return;
      } else {
        currentSelected.push(optId);
        examState.answers[q.id] = currentSelected;
      }
    }

    examState.activeQNumber = q.number;
    persistDraft();
    syncQuestionCardDom(q);
    updateNavGridState();
  };

  const syncQuestionCardDom = (q) => {
    const selected = Array.isArray(examState.answers[q.id]) ? examState.answers[q.id] : [];
    q.options.forEach((opt) => {
      const labelEl = document.getElementById(`lbl_${opt.id}`);
      const inputEl = document.getElementById(`inp_${opt.id}`);
      const isChecked = selected.includes(opt.id);
      if (labelEl) {
        labelEl.classList.toggle('is-selected', isChecked);
        labelEl.setAttribute('aria-checked', String(isChecked));
      }
      if (inputEl) {
        inputEl.checked = isChecked;
      }
    });
  };

  keydownHandler = (e) => {
    if (examState.phase !== 'taking') return;
    if (document.querySelector('.exam-confirm-overlay')) return;
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const currentQ = paper.questions.find((q) => q.number === examState.activeQNumber) || paper.questions[0];
    if (!currentQ) return;

    const key = e.key.toLowerCase();
    const keyToIdx = { a: 0, '1': 0, b: 1, '2': 1, c: 2, '3': 2, d: 3, '4': 3 };
    if (key in keyToIdx) {
      const opt = currentQ.options[keyToIdx[key]];
      if (opt) {
        e.preventDefault();
        handleSelectOption(currentQ, opt.id);
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      jumpToQuestion(Math.min(paper.questions.length, currentQ.number + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      jumpToQuestion(Math.max(1, currentQ.number - 1));
    }
  };
  document.addEventListener('keydown', keydownHandler);

  const renderSingleQuestionCardHtml = (q) => {
    const selected = Array.isArray(examState.answers[q.id]) ? examState.answers[q.id] : [];
    const isMulti = q.correct.length > 1;
    const playsUsed = Number(examState.playCounts[q.id] || 0);
    const playsLeft = Math.max(0, paper.maxAudioPlays - playsUsed);
    const isFlagged = examState.flagged.has(q.id);

    return `
      <article class="exam-q-card" id="exam-q-card-${q.number}" tabindex="-1">
        <div class="exam-q-head">
          <div class="exam-q-meta">
            <span class="exam-q-badge">Câu ${q.number}</span>
            <span class="badge-pill">${q.sectionTag || q.part}</span>
            <span class="badge-pill">${isMulti ? `Chọn ${q.correct.length} đáp án` : 'Chọn 1 đáp án'}</span>
          </div>
          <button type="button" class="btn btn-outline btn-sm ${isFlagged ? 'is-flagged' : ''}" data-flag-q="${q.id}">
            ${isFlagged ? '🚩 Đã đánh dấu' : '🏳️ Đánh dấu xem lại'}
          </button>
        </div>

        ${
          q.audio
            ? `<div class="exam-audio-box">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <button type="button" class="btn btn-primary btn-sm" data-play-audio="${q.id}" ${playsLeft <= 0 ? 'disabled' : ''}>
                    🔊 Nghe phát âm (còn ${playsLeft}/${paper.maxAudioPlays} lần)
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" data-toggle-audio-rate="${q.id}" title="Đổi tốc độ đọc">
                    🐢 Tốc độ: ${examState.audioRate < 0.85 ? '0.78x Chậm rõ' : '0.92x Chuẩn'}
                  </button>
                </div>
                <div id="audio-status-${q.id}" class="exam-audio-note"></div>
              </div>`
            : ''
        }

        <div class="exam-q-stem">${q.stem.replace(/\n/g, '<br>')}</div>

        ${
          Array.isArray(q.segments) && q.segments.length > 0
            ? `<div class="exam-segment-chips" aria-label="Các từ cần sắp xếp">
                ${q.segments.map((seg) => `<span class="exam-segment-chip">${seg}</span>`).join('')}
              </div>`
            : ''
        }

        <div class="exam-options-list" role="${isMulti ? 'group' : 'radiogroup'}" aria-label="Các lựa chọn cho câu ${q.number}">
          ${q.options
            .map((opt) => {
              const isChecked = selected.includes(opt.id);
              return `
                <label id="lbl_${opt.id}" class="exam-opt-row ${isChecked ? 'is-selected' : ''}" role="${isMulti ? 'checkbox' : 'radio'}" aria-checked="${isChecked}">
                  <input
                    id="inp_${opt.id}"
                    class="exam-opt-input"
                    type="${isMulti ? 'checkbox' : 'radio'}"
                    name="exam_group_${q.id}"
                    data-q-id="${q.id}"
                    value="${opt.id}"
                    ${isChecked ? 'checked' : ''}
                  />
                  <span class="exam-opt-circle" aria-hidden="true"></span>
                  <span class="exam-opt-letter">${opt.letter}.</span>
                  <span class="exam-opt-content">
                    <span class="exam-opt-text">${opt.text}</span>
                    ${opt.pinyin && examState.showPassagePinyin ? `<span class="exam-opt-py">${opt.pinyin}</span>` : ''}
                  </span>
                </label>
              `;
            })
            .join('')}
        </div>
        <div id="exam-warn-${q.id}" class="exam-inline-warn" role="alert"></div>
      </article>
    `;
  };

  const renderTakingScreen = () => {
    const remainingSec = getRemainingSec();
    const timerLevelClass = remainingSec <= 60 ? 'is-danger' : remainingSec <= 300 ? 'is-warning' : '';
    const timePct = Math.round((remainingSec / Math.max(1, examState.durationSec)) * 100);

    const partsOrder = [];
    const questionsByPart = {};
    paper.questions.forEach((q) => {
      if (!questionsByPart[q.part]) {
        questionsByPart[q.part] = [];
        partsOrder.push(q.part);
      }
      questionsByPart[q.part].push(q);
    });

    const visibleParts = examState.activePartFilter === 'ALL'
      ? partsOrder
      : partsOrder.filter((p) => p === examState.activePartFilter);

    container.innerHTML = `
      <div class="exam-shell">
        <header class="exam-sticky-bar">
          <div class="exam-sticky-left">
            <button type="button" class="btn btn-outline btn-sm" id="btn-exam-exit">← Thoát</button>
            <div>
              <div class="exam-sticky-title">${paper.title} · <code>${paper.examId}</code></div>
              <div class="exam-time-track"><div id="exam-time-bar" class="exam-time-fill ${timerLevelClass}" style="width:${timePct}%"></div></div>
            </div>
          </div>
          <div class="exam-sticky-right">
            <div id="exam-timer-box" class="exam-timer-pill ${timerLevelClass}" aria-live="off">
              ⏱️ <span id="exam-timer-text">${formatCountdown(remainingSec)}</span>
            </div>
            <button type="button" class="btn btn-primary" id="btn-exam-submit-top">Nộp bài</button>
          </div>
        </header>

        ${
          partsOrder.length > 1
            ? `<div class="exam-section-tabs" role="tablist" aria-label="Chuyển nhanh phần thi">
                <button type="button" class="btn ${examState.activePartFilter === 'ALL' ? 'btn-primary' : 'btn-outline'} btn-sm" data-filter-part="ALL">
                  📋 Tất cả (${paper.questions.length} câu)
                </button>
                ${partsOrder
                  .map(
                    (pName) => `
                    <button type="button" class="btn ${examState.activePartFilter === pName ? 'btn-primary' : 'btn-outline'} btn-sm" data-filter-part="${pName}">
                      ${pName} (${questionsByPart[pName].length})
                    </button>`
                  )
                  .join('')}
              </div>`
            : ''
        }

        <div class="exam-workspace">
          <div class="exam-main-col">
            ${visibleParts
              .map((partName) => {
                const partQs = questionsByPart[partName] || [];
                const nonPassageQs = partQs.filter((q) => !q.passageId);
                const passageGroups = [];
                const seenPIds = new Set();
                partQs.forEach((q) => {
                  if (q.passageId && !seenPIds.has(q.passageId)) {
                    seenPIds.add(q.passageId);
                    passageGroups.push({
                      passage: paper.passages?.[q.passageId],
                      questions: partQs.filter((item) => item.passageId === q.passageId)
                    });
                  }
                });

                return `
                  <div class="exam-part-banner"><h3>${partName}</h3></div>
                  ${nonPassageQs.map((q) => renderSingleQuestionCardHtml(q)).join('')}
                  ${passageGroups
                    .map(
                      (grp) => `
                        <div class="exam-reading-split" style="margin-bottom:16px">
                          <div class="exam-reading-left">
                            ${renderPassageHtml(
                              grp.passage,
                              examState.showPassagePinyin,
                              Boolean(examState.passageCollapsedMap[grp.passage?.id]),
                              false,
                              null
                            )}
                          </div>
                          <div class="exam-reading-right">
                            ${grp.questions.map((q) => renderSingleQuestionCardHtml(q)).join('')}
                          </div>
                        </div>
                      `
                    )
                    .join('')}
                `;
              })
              .join('')}
          </div>

          <aside class="exam-nav-col ${examState.mobileDrawerOpen ? 'is-open' : ''}" id="exam-nav-drawer">
            <button type="button" class="exam-mobile-drawer-toggle" id="btn-toggle-nav-drawer">
              📊 Bảng câu hỏi (<span id="exam-nav-pct">0%</span>) ▴
            </button>
            <div class="exam-nav-card">
              <div id="exam-nav-summary" class="exam-nav-summary"></div>
              <div class="exam-nav-bar-track">
                <div id="exam-nav-bar-fill" class="exam-nav-bar-fill" style="width:0%"></div>
              </div>
              <div class="exam-nav-groups">
                ${partsOrder
                  .map(
                    (partName) => `
                      <div class="exam-nav-group">
                        <div class="exam-nav-group-title">${partName}</div>
                        <div class="exam-nav-grid">
                          ${questionsByPart[partName]
                            .map(
                              (q) =>
                                `<button type="button" id="exam-nav-btn-${q.number}" class="exam-nav-num is-unanswered" data-jump-q="${q.number}">${q.number}</button>`
                            )
                            .join('')}
                        </div>
                      </div>
                    `
                  )
                  .join('')}
              </div>
              <button type="button" class="btn btn-primary btn-block" id="btn-exam-submit-side" style="margin-top:12px">✅ Nộp bài thi</button>
            </div>
          </aside>
        </div>
      </div>
    `;

    updateNavGridState();

    document.getElementById('btn-exam-exit').onclick = () => {
      if (confirm('Bạn đang làm bài thi. Tiến độ đã được lưu tạm — bạn có chắc muốn thoát ra ngoài không?')) {
        persistDraft();
        cleanupFocusMode();
        onExitExam();
      }
    };

    document.getElementById('btn-exam-submit-top').onclick = openConfirmSubmitModal;
    document.getElementById('btn-exam-submit-side').onclick = openConfirmSubmitModal;

    document.querySelectorAll('[data-filter-part]').forEach((btn) => {
      btn.onclick = () => {
        examState.activePartFilter = btn.dataset.filterPart;
        renderTakingScreen();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });

    const drawerToggle = document.getElementById('btn-toggle-nav-drawer');
    if (drawerToggle) {
      drawerToggle.onclick = () => {
        examState.mobileDrawerOpen = !examState.mobileDrawerOpen;
        document.getElementById('exam-nav-drawer').classList.toggle('is-open', examState.mobileDrawerOpen);
      };
    }

    document.querySelectorAll('[data-toggle-passage-py]').forEach((btn) => {
      btn.onclick = () => {
        examState.showPassagePinyin = !examState.showPassagePinyin;
        renderTakingScreen();
      };
    });

    document.querySelectorAll('[data-toggle-passage-collapse]').forEach((btn) => {
      btn.onclick = () => {
        const pid = btn.dataset.togglePassageCollapse;
        examState.passageCollapsedMap[pid] = !examState.passageCollapsedMap[pid];
        renderTakingScreen();
      };
    });

    document.querySelectorAll('[data-jump-q]').forEach((btn) => {
      btn.onclick = () => jumpToQuestion(Number(btn.dataset.jumpQ));
    });

    document.querySelectorAll('[data-flag-q]').forEach((btn) => {
      btn.onclick = () => {
        const qId = btn.dataset.flagQ;
        if (examState.flagged.has(qId)) examState.flagged.delete(qId);
        else examState.flagged.add(qId);
        persistDraft();
        btn.classList.toggle('is-flagged', examState.flagged.has(qId));
        btn.textContent = examState.flagged.has(qId) ? '🚩 Đã đánh dấu' : '🏳️ Đánh dấu xem lại';
        updateNavGridState();
      };
    });

    paper.questions.forEach((q) => {
      q.options.forEach((opt) => {
        const labelEl = document.getElementById(`lbl_${opt.id}`);
        if (!labelEl) return;
        labelEl.addEventListener('click', (e) => {
          e.preventDefault();
          handleSelectOption(q, opt.id);
        });
      });
    });

    document.querySelectorAll('[data-toggle-audio-rate]').forEach((btn) => {
      btn.onclick = () => {
        examState.audioRate = examState.audioRate < 0.85 ? 0.92 : 0.78;
        document.querySelectorAll('[data-toggle-audio-rate]').forEach((b) => {
          b.textContent = `🐢 Tốc độ: ${examState.audioRate < 0.85 ? '0.78x Chậm rõ' : '0.92x Chuẩn'}`;
        });
      };
    });

    document.querySelectorAll('[data-play-audio]').forEach((btn) => {
      btn.onclick = () => {
        const qId = btn.dataset.playAudio;
        const q = paper.questions.find((item) => item.id === qId);
        if (!q || !q.audio) return;

        const used = Number(examState.playCounts[qId] || 0);
        if (used >= paper.maxAudioPlays) return;

        const statusEl = document.getElementById(`audio-status-${qId}`);
        if (!('speechSynthesis' in window) || !hasChineseSpeechVoice()) {
          if (statusEl) {
            statusEl.innerHTML = `
              <span style="color:#b91c1c;font-weight:600">⚠️ Thiết bị không hỗ trợ giọng đọc tiếng Trung (zh-CN).</span>
              <button type="button" class="btn btn-outline btn-sm" data-show-transcript="${qId}" style="margin-left:6px">📜 Xem kịch bản nghe</button>
            `;
            const trBtn = statusEl.querySelector(`[data-show-transcript="${qId}"]`);
            if (trBtn) {
              trBtn.onclick = () => {
                statusEl.innerHTML = `<div style="padding:8px;border-radius:8px;background:var(--surface-alt);border:1px solid var(--border);margin-top:6px"><strong>📜 Nội dung băng ghi âm:</strong> ${q.audio.transcript || q.audio.text}</div>`;
              };
            }
          }
          return;
        }

        examState.playCounts[qId] = used + 1;
        persistDraft();
        const left = Math.max(0, paper.maxAudioPlays - examState.playCounts[qId]);
        btn.textContent = `🔊 Nghe phát âm (còn ${left}/${paper.maxAudioPlays} lần)`;
        if (left <= 0) btn.disabled = true;

        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(q.audio.text);
          utter.lang = 'zh-CN';
          utter.rate = examState.audioRate || 0.92;
          utter.onerror = () => {
            if (statusEl) {
              statusEl.innerHTML = `<span style="color:#b91c1c">⚠️ Không phát được âm thanh trên trình duyệt này. Nội dung: ${q.audio.transcript || q.audio.text}</span>`;
            }
          };
          window.speechSynthesis.speak(utter);
        } catch {}
      };
    });
  };

  // Màn hình kết quả & Xem lại chi tiết (Báo cáo điểm chuẩn HSK 300 & thang 100, kịch bản nghe, giải thích ngữ pháp)
  const renderReviewScreen = () => {
    cleanupFocusMode();
    const res = examState.gradeResult;
    const wrongQuestions = res.details.filter((d) => d.status !== 'correct').map((d) => d.question);

    container.innerHTML = `
      <div class="exam-review-shell">
        <div class="card" style="text-align:center">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            <button type="button" class="btn btn-outline btn-sm" id="btn-review-back">← Quay lại Phòng thi</button>
            <span class="badge-pill">Mã đề: ${paper.examId}</span>
          </div>
          <h2 style="margin:6px 0;font-size:1.45rem">
            ${res.passed ? '🎉 Chúc mừng! Bạn đã ĐẠT chuẩn HSK' : '📘 Kết quả bài luyện thi'} (${paper.title})
          </h2>
          <div style="display:flex;justify-content:center;align-items:baseline;gap:18px;flex-wrap:wrap;margin:10px 0">
            <div>
              <div style="font-size:0.78rem;color:var(--text-muted);font-weight:700">ĐIỂM QUY ĐỔI CHUẨN HSK</div>
              <div style="font-size:2.35rem;font-weight:900;color:${res.passed ? 'var(--green)' : 'var(--primary)'}">
                ${res.hsk300Score} / ${res.hsk300Max}
              </div>
            </div>
            <div style="padding-left:16px;border-left:1.5px solid var(--border)">
              <div style="font-size:0.78rem;color:var(--text-muted);font-weight:700">TỶ LỆ CHÍNH XÁC</div>
              <div style="font-size:1.75rem;font-weight:800;color:var(--text)">
                ${res.score}% (${res.correctCount}/${res.totalQuestions} câu)
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;font-size:0.9rem;margin-bottom:14px">
            <span style="color:#16a34a">✅ Đúng: <strong>${res.correctCount}</strong></span>
            <span style="color:#dc2626">❌ Sai: <strong>${res.wrongCount}</strong></span>
            <span style="color:var(--text-muted)">⚪ Bỏ trống: <strong>${res.blankCount}</strong></span>
            <span>⏱️ Thời gian: <strong>${formatCountdown(examState.finishedElapsedSec)}</strong></span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:14px 0;text-align:left">
            ${Object.values(res.hskBreakdown || {})
              .filter((b) => b.total > 0)
              .map(
                (b) => `
                  <div style="padding:12px;border:1.5px solid var(--border);border-radius:12px;background:var(--bg)">
                    <div style="font-size:0.82rem;font-weight:700;color:var(--text-muted)">${b.label}</div>
                    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:4px">
                      <span style="font-weight:900;font-size:1.15rem;color:var(--primary)">${b.hskScore}/${b.hskMax} đ</span>
                      <span style="font-size:0.82rem;color:var(--text-muted)">Đúng ${Number(b.earned.toFixed(1))}/${b.total} câu (${b.score100}%)</span>
                    </div>
                  </div>
                `
              )
              .join('')}
          </div>

          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px">
            ${
              wrongQuestions.length > 0
                ? `<button type="button" class="btn btn-primary" id="btn-retry-wrong">🔁 Làm lại các câu sai (${wrongQuestions.length} câu)</button>`
                : ''
            }
            <button type="button" class="btn btn-green" id="btn-next-set">🎲 Làm đề mới (Không trùng câu cũ)</button>
            <button type="button" class="btn btn-outline" id="btn-choose-set">🗂️ Chọn bộ đề khác</button>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom:12px">🔍 Đáp án, Kịch bản nghe & Giải thích chi tiết từng câu</h3>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${res.details
              .map(({ question: q, selected, status }) => {
                const selectedSet = new Set(selected);
                const correctSet = new Set(q.correct);
                const wm = q.wordId ? wordByIdMap.get(q.wordId) : null;
                const statusBadge =
                  status === 'correct'
                    ? '<span style="color:#16a34a;font-weight:700">✅ Đúng</span>'
                    : status === 'blank'
                    ? '<span style="color:#64748b;font-weight:700">⚪ Bỏ trống</span>'
                    : '<span style="color:#dc2626;font-weight:700">❌ Sai</span>';

                return `
                  <div class="exam-review-item ${status === 'correct' ? 'is-ok' : 'is-err'}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px">
                      <strong>Câu ${q.number} · ${q.sectionTag || q.part}</strong>
                      ${statusBadge}
                    </div>
                    ${
                      q.audio
                        ? `<div style="padding:8px 10px;border-radius:8px;background:var(--surface-alt);border:1px solid var(--border);font-size:0.84rem;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
                            <span>🎧 <strong>Kịch bản nghe:</strong> ${q.audio.transcript || q.audio.text}</span>
                            <button type="button" class="btn btn-outline btn-sm" data-replay-rev="${q.id}">🔊 Nghe lại</button>
                          </div>`
                        : ''
                    }
                    <div style="margin-bottom:10px;font-weight:600">${q.stem.replace(/\n/g, '<br>')}</div>
                    ${
                      Array.isArray(q.segments) && q.segments.length > 0
                        ? `<div class="exam-segment-chips" style="margin-bottom:10px">
                            ${q.segments.map((seg) => `<span class="exam-segment-chip">${seg}</span>`).join('')}
                          </div>`
                        : ''
                    }
                    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
                      ${q.options
                        .map((opt) => {
                          const isCor = correctSet.has(opt.id);
                          const isPick = selectedSet.has(opt.id);
                          const optWord = wordByHanziMap.get(opt.text);
                          let cls = 'exam-rev-opt';
                          if (isCor) cls += ' rev-correct';
                          else if (isPick && !isCor) cls += ' rev-wrong';
                          return `
                            <div class="${cls}">
                              <strong>${opt.letter}.</strong> ${opt.text} ${optWord ? `(${optWord.pinyin} – ${shortenMeaning(optWord.meaning)})` : ''}
                              ${isCor ? ' <strong>✓ Đáp án đúng</strong>' : ''}
                              ${isPick && !isCor ? ' <strong>✗ Bạn đã chọn</strong>' : ''}
                            </div>
                          `;
                        })
                        .join('')}
                    </div>
                    ${
                      wm
                        ? `<div class="exam-word-detail">
                            <div><strong>Từ vựng:</strong> <span class="exam-review-word" data-lookup-zh="${wm.hanzi}">${wm.hanzi}</span> (${wm.pinyin}) · Từ loại: <code>${wm.pos}</code> · Nghĩa: <strong>${wm.meaning}</strong></div>
                            ${wm.exZh ? `<div style="margin-top:4px;font-size:0.85rem"><strong>Ví dụ:</strong> ${wm.exZh} — <em>${wm.exPy || ''}</em> — ${wm.exVi || ''}</div>` : ''}
                          </div>`
                        : ''
                    }
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-top:6px">💡 ${q.explanation}</div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-review-back').onclick = () => onExitExam();
    document.getElementById('btn-next-set').onclick = () => {
      const nextSet = paper.setIndex >= 1 && paper.setIndex < 4 ? paper.setIndex + 1 : 0;
      const fresh = generateExamPaper(paper.level, allWords, null, {
        setIndex: nextSet,
        skillMode: paper.skillMode || 'all'
      });
      startExamSession(container, fresh, allWords, onExitExam, null);
    };
    document.getElementById('btn-choose-set').onclick = () => {
      renderExamSetupScreen(container, paper.level, allWords, onExitExam);
    };

    const retryBtn = document.getElementById('btn-retry-wrong');
    if (retryBtn) {
      retryBtn.onclick = () => {
        const clonedPaper = {
          ...paper,
          examId: `${paper.examId}-RETRY`,
          title: `Ôn lại câu sai · ${paper.title}`,
          durationSec: wrongQuestions.length * 45,
          questions: wrongQuestions.map((wq, i) => ({
            ...wq,
            id: `rq_${i + 1}`,
            number: i + 1
          }))
        };
        startExamSession(container, clonedPaper, allWords, onExitExam, null);
      };
    }

    container.querySelectorAll('[data-replay-rev]').forEach((btn) => {
      btn.onclick = () => {
        const q = paper.questions.find((item) => item.id === btn.dataset.replayRev);
        if (!q?.audio) return;
        try {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(q.audio.text);
            u.lang = 'zh-CN';
            u.rate = 0.9;
            window.speechSynthesis.speak(u);
          }
        } catch {}
      };
    });

    container.querySelectorAll('[data-lookup-zh]').forEach((el) => {
      el.onclick = () => {
        const hz = el.dataset.lookupZh;
        const found = wordByHanziMap.get(hz);
        if (found) {
          alert(`📖 ${found.hanzi} (${found.pinyin})\nTừ loại: ${found.pos}\nNghĩa: ${found.meaning}`);
        }
      };
    });
  };

  const renderExamScreen = () => {
    if (examState.phase === 'review') {
      renderReviewScreen();
    } else {
      renderTakingScreen();
    }
  };

  timerInterval = setInterval(() => {
    if (examState.phase !== 'taking') return;
    const rem = getRemainingSec();
    const textEl = document.getElementById('exam-timer-text');
    const boxEl = document.getElementById('exam-timer-box');
    const barEl = document.getElementById('exam-time-bar');

    if (textEl) textEl.textContent = formatCountdown(rem);
    const cls = rem <= 60 ? 'is-danger' : rem <= 300 ? 'is-warning' : '';
    if (boxEl) boxEl.className = `exam-timer-pill ${cls}`;
    if (barEl) {
      barEl.className = `exam-time-fill ${cls}`;
      barEl.style.width = `${Math.round((rem / Math.max(1, examState.durationSec)) * 100)}%`;
    }

    if (rem <= 0) {
      submitExamNow(true);
    }
  }, 500);

  renderExamScreen();
}
