// Hệ thống Luyện thi HSK 1–9: Chế độ thi tập trung & Chế độ xem lại chi tiết
import { store } from '../storage/db.js';
import { EXAM_CONFIGS } from './exam-config.js';
import { getPassagesForLevel } from './passages.js';
import { isValidVietnameseMeaning } from '../data/loader.js';

export { EXAM_CONFIGS };

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

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

// Chọn 3 đáp án nhiễu cùng cấp (±1), ưu tiên cùng từ loại, không trùng nghĩa/chữ Hán
function pickDistractors(targetWord, allValidWords, count = 3, strictSamePos = false) {
  const sameLevelSamePos = allValidWords.filter(
    (w) =>
      w.hanzi !== targetWord.hanzi &&
      w.level === targetWord.level &&
      w.pos === targetWord.pos &&
      !areMeaningsTooSimilar(w.meaning, targetWord.meaning)
  );
  const nearLevelSamePos = allValidWords.filter(
    (w) =>
      w.hanzi !== targetWord.hanzi &&
      Math.abs(w.level - targetWord.level) <= 1 &&
      w.pos === targetWord.pos &&
      !areMeaningsTooSimilar(w.meaning, targetWord.meaning)
  );
  const sameLevelAnyPos = allValidWords.filter(
    (w) =>
      w.hanzi !== targetWord.hanzi &&
      w.level === targetWord.level &&
      !areMeaningsTooSimilar(w.meaning, targetWord.meaning)
  );
  const nearLevelAnyPos = allValidWords.filter(
    (w) =>
      w.hanzi !== targetWord.hanzi &&
      Math.abs(w.level - targetWord.level) <= 1 &&
      !areMeaningsTooSimilar(w.meaning, targetWord.meaning)
  );
  const fallbackPool = allValidWords.filter(
    (w) =>
      w.hanzi !== targetWord.hanzi &&
      !areMeaningsTooSimilar(w.meaning, targetWord.meaning)
  );

  const pools = strictSamePos
    ? [shuffleArray(sameLevelSamePos), shuffleArray(nearLevelSamePos)]
    : [
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

// Sinh bộ đề thi theo mô hình dữ liệu chuẩn:
// { id, part, skill, stem, audio, passageId, wordId, options: [{id, letter, text, pinyin?}], correct: [optionId], explanation }
export function generateExamPaper(level, rawAllWords, customWordSubset = null) {
  const cfg = EXAM_CONFIGS[level] || EXAM_CONFIGS[1];

  const sourcePool = Array.isArray(customWordSubset) && customWordSubset.length > 0 ? customWordSubset : rawAllWords;
  const allValidWords = (Array.isArray(rawAllWords) ? rawAllWords : []).filter(
    (w) => w && w.hanzi && isValidVietnameseMeaning(w.meaning)
  );
  const validLevelWords = sourcePool.filter(
    (w) => w && w.hanzi && isValidVietnameseMeaning(w.meaning) && (customWordSubset ? true : w.level === level)
  );
  const candidatePool = validLevelWords.length >= 10 ? validLevelWords : allValidWords;

  const targetTotal = customWordSubset ? Math.min(cfg.totalQ, candidatePool.length) : cfg.totalQ;
  const usedHanzi = new Set();
  const usedSentences = new Set();
  const draftQuestions = [];

  const listeningQuota = Math.max(2, Math.round(targetTotal * 0.35));
  const fillQuota = Math.max(0, Math.round(targetTotal * 0.25));

  // Phần 1: Nghe hiểu (đề không chứa chữ Hán/pinyin; đáp án là nghĩa tiếng Việt)
  const listeningWords = shuffleArray(candidatePool).slice(0, listeningQuota);
  for (const w of listeningWords) {
    if (draftQuestions.length >= targetTotal) break;
    const distractors = pickDistractors(w, allValidWords, 3, false);
    if (distractors.length < 3) continue;
    usedHanzi.add(w.hanzi);
    draftQuestions.push({
      part: 'Phần 1: Nghe hiểu',
      skill: 'listening',
      stem: 'Nghe phát âm tiếng Trung và chọn nghĩa tiếng Việt đúng nhất:',
      audio: { text: w.hanzi, lang: 'zh-CN' },
      passageId: null,
      wordId: w.id,
      rawOptions: [
        { text: w.meaning, isCorrect: true },
        ...distractors.map((d) => ({ text: d.meaning, isCorrect: false }))
      ],
      explanation: `Từ được đọc là "${w.hanzi}" (${w.pinyin}) – từ loại [${w.pos}], nghĩa tiếng Việt: "${w.meaning}".`
    });
  }

  // Phần 2: Điền từ vào câu (chỉ từ có câu ví dụ riêng chứa đúng từ đó; đáp án nhiễu cùng từ loại)
  const fillEligible = shuffleArray(
    candidatePool.filter(
      (w) =>
        !usedHanzi.has(w.hanzi) &&
        w.exZh &&
        w.exZh.includes(w.hanzi) &&
        w.exZh.trim().length >= w.hanzi.length + 2
    )
  );

  for (const w of fillEligible) {
    if (draftQuestions.filter((q) => q.skill === 'fill').length >= fillQuota) break;
    if (draftQuestions.length >= targetTotal) break;
    const normEx = w.exZh.trim();
    if (usedSentences.has(normEx)) continue;

    const distractors = pickDistractors(w, allValidWords, 3, true);
    if (distractors.length < 3) continue;

    usedHanzi.add(w.hanzi);
    usedSentences.add(normEx);
    const blankedSentence = normEx.replace(w.hanzi, '（____）');

    draftQuestions.push({
      part: 'Phần 2: Điền từ vào câu',
      skill: 'fill',
      stem: `Chọn từ thích hợp nhất để điền vào chỗ trống:\n${blankedSentence}`,
      audio: null,
      passageId: null,
      wordId: w.id,
      rawOptions: [
        { text: w.hanzi, isCorrect: true },
        ...distractors.map((d) => ({ text: d.hanzi, isCorrect: false }))
      ],
      explanation: `Câu hoàn chỉnh: "${normEx}" (${w.exPy || w.pinyin}). Đáp án đúng: "${w.hanzi}" (${w.meaning}).`
    });
  }

  // Phần 3: Đọc hiểu đoạn văn thật (từ passages.js)
  const passages = customWordSubset ? [] : getPassagesForLevel(level);
  const passageMap = {};
  for (const p of passages) {
    passageMap[p.id] = p;
    for (const pq of p.questions) {
      if (draftQuestions.length >= targetTotal) break;
      const correctSet = new Set(pq.correctIndexes);
      draftQuestions.push({
        part: 'Phần 3: Đọc hiểu',
        skill: 'reading',
        stem: pq.stem,
        audio: null,
        passageId: p.id,
        wordId: null,
        rawOptions: pq.options.map((optText, idx) => ({
          text: optText,
          isCorrect: correctSet.has(idx)
        })),
        explanation: pq.explanation
      });
    }
  }

  // Bổ sung câu hỏi nghĩa từ vựng chuẩn để đạt đủ tổng số câu quy định
  const remainingWords = shuffleArray(candidatePool.filter((w) => !usedHanzi.has(w.hanzi)));
  for (const w of remainingWords) {
    if (draftQuestions.length >= targetTotal) break;
    const distractors = pickDistractors(w, allValidWords, 3, false);
    if (distractors.length < 3) continue;
    usedHanzi.add(w.hanzi);
    draftQuestions.push({
      part: 'Phần 3: Đọc hiểu & Từ vựng',
      skill: 'vocab',
      stem: `Từ "${w.hanzi}" mang nghĩa tiếng Việt nào phù hợp nhất?`,
      audio: null,
      passageId: null,
      wordId: w.id,
      rawOptions: [
        { text: w.meaning, isCorrect: true },
        ...distractors.map((d) => ({ text: d.meaning, isCorrect: false }))
      ],
      explanation: `"${w.hanzi}" (${w.pinyin}) – từ loại [${w.pos}], nghĩa tiếng Việt: "${w.meaning}".`
    });
  }

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
      number: qIdx + 1,
      part: q.part,
      skill: q.skill,
      stem: q.stem,
      audio: q.audio,
      passageId: q.passageId,
      wordId: q.wordId,
      options,
      correct,
      explanation: q.explanation
    };
  });

  return {
    examId: `HSK${level}-${Date.now().toString(36).toUpperCase()}`,
    level,
    title: `Luyện thi ${cfg.label}`,
    durationSec: questions.length * 45,
    maxAudioPlays: cfg.maxAudioPlays,
    passPercent: cfg.passPercent,
    allowPartialCredit: cfg.allowPartialCredit,
    passages: passageMap,
    questions
  };
}

// Chấm điểm bài thi (câu 1 đáp án & câu nhiều đáp án)
export function gradeExamPaper(paper, answersMap = {}, allowPartialCredit = false) {
  let earnedPoints = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  const partStats = {};

  const details = paper.questions.map((q) => {
    const selected = Array.isArray(answersMap[q.id]) ? answersMap[q.id] : [];
    const correctSet = new Set(q.correct);

    if (!partStats[q.part]) {
      partStats[q.part] = { earned: 0, total: 0 };
    }
    partStats[q.part].total += 1;

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

  return {
    score: score100,
    maxScore: 100,
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
          ${passage.needsReview ? '<span class="exam-review-tag" title="Đoạn văn biên soạn mới, cần duyệt trước khi dùng chính thức">[Cần duyệt]</span>' : ''}
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

export function launchExamUI(container, level, allWords, onExitExam, savedDraft = null, customWordSubset = null) {
  const cfg = EXAM_CONFIGS[level] || EXAM_CONFIGS[1];

  if (savedDraft && savedDraft.paper && !customWordSubset) {
    container.innerHTML = `
      <div class="card" style="max-width:540px;margin:24px auto;text-align:center">
        <h2 class="card-title">📝 Phát hiện bài thi ${cfg.label} đang làm dở</h2>
        <p style="color:var(--text-muted);font-size:0.9rem;margin:10px 0 18px">
          Mã đề: <code>${savedDraft.paper.examId}</code> · Đã trả lời <strong>${Object.keys(savedDraft.answers || {}).filter((k) => (savedDraft.answers[k] || []).length > 0).length}/${savedDraft.paper.questions.length}</strong> câu.
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button type="button" class="btn btn-primary" id="btn-draft-continue">▶️ Tiếp tục làm bài</button>
          <button type="button" class="btn btn-outline" id="btn-draft-fresh">🔄 Bắt đầu đề mới</button>
          <button type="button" class="btn btn-outline" id="btn-draft-cancel">Quay lại</button>
        </div>
      </div>
    `;
    document.getElementById('btn-draft-continue').onclick = () =>
      startExamSession(container, savedDraft.paper, allWords, onExitExam, savedDraft);
    document.getElementById('btn-draft-fresh').onclick = () => {
      store.state.inProgressExam = null;
      store.save();
      const freshPaper = generateExamPaper(level, allWords);
      startExamSession(container, freshPaper, allWords, onExitExam, null);
    };
    document.getElementById('btn-draft-cancel').onclick = () => onExitExam();
    return;
  }

  const paper = generateExamPaper(level, allWords, customWordSubset);
  startExamSession(container, paper, allWords, onExitExam, null);
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
    showPassagePinyin: false,
    passageCollapsed: false,
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

    store.state.inProgressExam = null;
    store.state.examHistory.unshift({
      level: paper.level,
      examId: paper.examId,
      score: result.score,
      maxScore: result.maxScore,
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

    const readingQuestions = paper.questions.filter((q) => q.passageId);
    const nonReadingQuestions = paper.questions.filter((q) => !q.passageId);
    const activePassage = Object.values(paper.passages || {})[0] || null;

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

        <div class="exam-workspace">
          <div class="exam-main-col">
            ${nonReadingQuestions
              .map((q, idx) => {
                const prevQ = idx > 0 ? nonReadingQuestions[idx - 1] : null;
                const showPartBanner = !prevQ || prevQ.part !== q.part;
                const selected = Array.isArray(examState.answers[q.id]) ? examState.answers[q.id] : [];
                const isMulti = q.correct.length > 1;
                const playsUsed = Number(examState.playCounts[q.id] || 0);
                const playsLeft = Math.max(0, paper.maxAudioPlays - playsUsed);
                const isFlagged = examState.flagged.has(q.id);

                return `
                  ${showPartBanner ? `<div class="exam-part-banner"><h3>${q.part}</h3></div>` : ''}
                  <article class="exam-q-card" id="exam-q-card-${q.number}" tabindex="-1">
                    <div class="exam-q-head">
                      <div class="exam-q-meta">
                        <span class="exam-q-badge">Câu ${q.number}</span>
                        <span class="badge-pill">${isMulti ? `Chọn ${q.correct.length} đáp án` : 'Chọn 1 đáp án'}</span>
                      </div>
                      <button type="button" class="btn btn-outline btn-sm ${isFlagged ? 'is-flagged' : ''}" data-flag-q="${q.id}">
                        ${isFlagged ? '🚩 Đã đánh dấu' : '🏳️ Đánh dấu xem lại'}
                      </button>
                    </div>

                    ${
                      q.audio
                        ? `<div class="exam-audio-box">
                            <button type="button" class="btn btn-primary btn-sm" data-play-audio="${q.id}" ${playsLeft <= 0 ? 'disabled' : ''}>
                              🔊 Nghe phát âm (còn ${playsLeft}/${paper.maxAudioPlays} lần)
                            </button>
                            <div id="audio-status-${q.id}" class="exam-audio-note"></div>
                          </div>`
                        : ''
                    }

                    <div class="exam-q-stem">${q.stem.replace(/\n/g, '<br>')}</div>

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
              })
              .join('')}

            ${
              readingQuestions.length > 0 && activePassage
                ? `
                  <div class="exam-part-banner"><h3>Phần 3: Đọc hiểu đoạn văn</h3></div>
                  <div class="exam-reading-split">
                    <div class="exam-reading-left">
                      ${renderPassageHtml(activePassage, examState.showPassagePinyin, examState.passageCollapsed, false, null)}
                    </div>
                    <div class="exam-reading-right">
                      ${readingQuestions
                        .map((q) => {
                          const selected = Array.isArray(examState.answers[q.id]) ? examState.answers[q.id] : [];
                          const isMulti = q.correct.length > 1;
                          const isFlagged = examState.flagged.has(q.id);
                          return `
                            <article class="exam-q-card" id="exam-q-card-${q.number}" tabindex="-1">
                              <div class="exam-q-head">
                                <div class="exam-q-meta">
                                  <span class="exam-q-badge">Câu ${q.number}</span>
                                  <span class="badge-pill">${isMulti ? `Chọn ${q.correct.length} đáp án` : 'Chọn 1 đáp án'}</span>
                                </div>
                                <button type="button" class="btn btn-outline btn-sm ${isFlagged ? 'is-flagged' : ''}" data-flag-q="${q.id}">
                                  ${isFlagged ? '🚩 Đã đánh dấu' : '🏳️ Đánh dấu xem lại'}
                                </button>
                              </div>
                              <div class="exam-q-stem">${q.stem}</div>
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
                                        </span>
                                      </label>
                                    `;
                                  })
                                  .join('')}
                              </div>
                              <div id="exam-warn-${q.id}" class="exam-inline-warn" role="alert"></div>
                            </article>
                          `;
                        })
                        .join('')}
                    </div>
                  </div>
                `
                : ''
            }
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
        examState.passageCollapsed = !examState.passageCollapsed;
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
              <button type="button" class="btn btn-outline btn-sm" data-skip-audio="${qId}" style="margin-left:6px">Bỏ qua câu này</button>
            `;
            const skipBtn = statusEl.querySelector(`[data-skip-audio="${qId}"]`);
            if (skipBtn) {
              skipBtn.onclick = () => {
                examState.skippedAudio.add(qId);
                persistDraft();
                jumpToQuestion(Math.min(paper.questions.length, q.number + 1));
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
          utter.rate = 0.92;
          utter.onerror = () => {
            if (statusEl) {
              statusEl.innerHTML = `<span style="color:#b91c1c">⚠️ Không phát được âm thanh trên trình duyệt này. Bạn có thể bỏ qua câu này.</span>`;
            }
          };
          window.speechSynthesis.speak(utter);
        } catch {}
      };
    });
  };

  // Bước 4: Màn hình kết quả & Xem lại chi tiết (tra từ qua wordId, mở lại tra nghĩa & Sư Phụ AI)
  const renderReviewScreen = () => {
    cleanupFocusMode();
    const res = examState.gradeResult;
    const wrongQuestions = res.details.filter((d) => d.status !== 'correct').map((d) => d.question);

    container.innerHTML = `
      <div class="exam-review-shell">
        <div class="card" style="text-align:center">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            <button type="button" class="btn btn-outline btn-sm" id="btn-review-back">← Quay lại danh sách đề thi</button>
            <span class="badge-pill">Mã đề: ${paper.examId}</span>
          </div>
          <h2 style="margin:6px 0;font-size:1.5rem">
            ${res.passed ? '🎉 Chúc mừng! Bạn đã ĐẠT bài thi' : '📘 Hoàn thành bài luyện thi'} (${paper.title})
          </h2>
          <div style="font-size:2.4rem;font-weight:900;color:${res.passed ? 'var(--green)' : 'var(--primary)'};margin:8px 0">
            ${res.score} / ${res.maxScore} điểm
          </div>
          <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;font-size:0.9rem;margin-bottom:14px">
            <span style="color:#16a34a">✅ Đúng: <strong>${res.correctCount}</strong></span>
            <span style="color:#dc2626">❌ Sai: <strong>${res.wrongCount}</strong></span>
            <span style="color:var(--text-muted)">⚪ Bỏ trống: <strong>${res.blankCount}</strong></span>
            <span>⏱️ Thời gian: <strong>${formatCountdown(examState.finishedElapsedSec)}</strong></span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:12px 0;text-align:left">
            ${Object.entries(res.partStats)
              .map(
                ([partName, st]) => `
                  <div style="padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg)">
                    <div style="font-size:0.8rem;color:var(--text-muted)">${partName}</div>
                    <div style="font-weight:800;font-size:1rem">${Number(st.earned.toFixed(1))} / ${st.total} câu</div>
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
            <button type="button" class="btn btn-outline" id="btn-new-exam">📝 Làm đề mới cùng cấp</button>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom:12px">🔍 Xem lại chi tiết từng câu (Bấm vào chữ Hán để tra nghĩa hoặc hỏi Sư Phụ AI)</h3>
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
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                      <strong>Câu ${q.number} · ${q.part}</strong>
                      ${statusBadge}
                    </div>
                    <div style="margin-bottom:10px;font-weight:600">${q.stem.replace(/\n/g, '<br>')}</div>
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
                              <strong>${opt.letter}.</strong> ${opt.text} ${optWord ? `(${optWord.pinyin} – ${optWord.meaning})` : ''}
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
    document.getElementById('btn-new-exam').onclick = () => {
      const fresh = generateExamPaper(paper.level, allWords);
      startExamSession(container, fresh, allWords, onExitExam, null);
    };

    const retryBtn = document.getElementById('btn-retry-wrong');
    if (retryBtn) {
      retryBtn.onclick = () => {
        const retryWords = wrongQuestions.map((q) => (q.wordId ? wordByIdMap.get(q.wordId) : null)).filter(Boolean);
        if (retryWords.length > 0) {
          const retryPaper = generateExamPaper(paper.level, allWords, retryWords);
          startExamSession(container, retryPaper, allWords, onExitExam, null);
        } else {
          const clonedPaper = {
            ...paper,
            examId: `${paper.examId}-RETRY`,
            durationSec: wrongQuestions.length * 45,
            questions: wrongQuestions.map((wq, i) => ({
              ...wq,
              id: `rq_${i + 1}`,
              number: i + 1
            }))
          };
          startExamSession(container, clonedPaper, allWords, onExitExam, null);
        }
      };
    }

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