import { store } from '../storage/db.js';

export const EXAM_CONFIGS = {
  1: { label: 'HSK 1', totalQ: 20, minutes: 25, maxScore: 200, passScore: 120, desc: 'Sơ cấp 1 · 500 từ · Nghe & Đọc cơ bản' },
  2: { label: 'HSK 2', totalQ: 25, minutes: 30, maxScore: 200, passScore: 120, desc: 'Sơ cấp 2 · 1.272 từ · Giao tiếp cơ bản' },
  3: { label: 'HSK 3', totalQ: 30, minutes: 40, maxScore: 300, passScore: 180, desc: 'Trung cấp 1 · 2.245 từ · Nghe - Đọc - Viết' },
  4: { label: 'HSK 4', totalQ: 35, minutes: 50, maxScore: 300, passScore: 180, desc: 'Trung cấp 2 · 3.245 từ · Thảo luận chủ đề rộng' },
  5: { label: 'HSK 5', totalQ: 40, minutes: 60, maxScore: 300, passScore: 180, desc: 'Cao cấp 1 · 4.316 từ · Đọc báo chí & diễn đạt' },
  6: { label: 'HSK 6', totalQ: 45, minutes: 70, maxScore: 300, passScore: 180, desc: 'Cao cấp 2 · 5.456 từ · Ngôn ngữ học thuật' },
  7: { label: 'HSK 7', totalQ: 45, minutes: 75, maxScore: 300, passScore: 180, isBand79: true, desc: 'Bậc 7 (Nhánh 1 HSK 7–9) · Văn bản chuyên sâu' },
  8: { label: 'HSK 8', totalQ: 50, minutes: 85, maxScore: 300, passScore: 180, isBand79: true, desc: 'Bậc 8 (Nhánh 2 HSK 7–9) · Học thuật & nghị luận' },
  9: { label: 'HSK 9', totalQ: 55, minutes: 95, maxScore: 300, passScore: 180, isBand79: true, desc: 'Bậc 9 (Nhánh 3 HSK 7–9) · Tinh thông bản ngữ' }
};

function buildExamData(level, allWords) {
  const pool = allWords.filter((w) => w.level === level);
  const src = pool.length >= 20 ? pool : allWords;
  const pick = (n) => [...src].sort(() => Math.random() - 0.5).slice(0, n);

  // 1. Dạng Cloze khung A-F (6 từ trong khung, 4 chỗ trống trong đoạn văn + giải thích tiếng Việt)
  const clozeWords = pick(6);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const bank = clozeWords.map((w, i) => ({ letter: letters[i], ...w }));
  const blanks = [0, 1, 2, 3].map((bIdx) => {
    const w = bank[bIdx];
    return {
      index: bIdx + 1,
      sentence: `在今天的汉语课上，老师要求我们用“（ ${bIdx + 1} ）”来表达“${w.meaning.replace('[cần kiểm duyệt]', '').trim()}”的意思。`,
      answerLetter: w.letter,
      explainVi: `Đáp án đúng là ${w.letter}. ${w.hanzi} (${w.pinyin}) — nghĩa là "${w.meaning}".`
    };
  });

  // 2. Dạng Đọc đoạn văn dài chia đôi (bật/tắt Pinyin, bấm từng chữ xem nghĩa, 5 câu hỏi)
  const readWords = pick(8);
  const passageSegments = readWords.map((w) => ({
    hanzi: w.hanzi,
    pinyin: w.pinyin,
    meaning: w.meaning
  }));
  const readingQuestions = readWords.slice(0, 5).map((target, idx) => {
    const dist = pick(10).filter((x) => x.hanzi !== target.hanzi).slice(0, 3);
    const opts = [target, ...dist].sort(() => Math.random() - 0.5);
    return {
      qNum: idx + 1,
      question: `Theo nội dung đoạn văn, từ "${target.hanzi}" mang ý nghĩa nào phù hợp nhất?`,
      options: opts.map((o) => o.meaning),
      correctIndex: opts.findIndex((o) => o.hanzi === target.hanzi),
      explainVi: `Trong bài đọc, "${target.hanzi}" (${target.pinyin}) có nghĩa là: ${target.meaning}.`
    };
  });

  // 3. Dạng Điền từ câu đơn & Trắc nghiệm nghe/từ vựng
  const singleQuestions = pick(8).map((target, idx) => {
    const dist = pick(10).filter((x) => x.hanzi !== target.hanzi).slice(0, 3);
    const opts = [target, ...dist].sort(() => Math.random() - 0.5);
    return {
      qNum: idx + 1,
      prompt: idx % 2 === 0
        ? `Chọn từ thích hợp điền vào chỗ trống: 我每天都认真练习（ ___ ）[Gợi ý: ${target.meaning}]。`
        : `Nghe và chọn nghĩa đúng của từ: ${target.hanzi}`,
      hanzi: target.hanzi,
      options: opts.map((o) => `${o.hanzi} (${o.pinyin}) — ${o.meaning}`),
      correctIndex: opts.findIndex((o) => o.hanzi === target.hanzi),
      explainVi: `Từ cần chọn là ${target.hanzi} (${target.pinyin}): ${target.meaning}.`
    };
  });

  return { bank, blanks, passageSegments, readingQuestions, singleQuestions };
}

export function launchExamUI(container, level, allWords, onExit, resumeState = null) {
  const cfg = EXAM_CONFIGS[level] || EXAM_CONFIGS[1];
  const examId = resumeState?.examId || `PANDA-HSK${level}-${Date.now().toString().slice(-5)}`;
  const data = resumeState?.data || buildExamData(level, allWords);
  let section = resumeState?.section || 'all'; // all | cloze | reading | single
  let answers = resumeState?.answers || { cloze: {}, reading: {}, single: {} };
  let remainingSec = resumeState?.remainingSec || cfg.minutes * 60;
  let showPinyin = true;
  let submitted = false;

  const timer = setInterval(() => {
    if (submitted) { clearInterval(timer); return; }
    remainingSec--;
    const el = document.getElementById('exam-timer');
    if (el) {
      const m = String(Math.floor(Math.max(0, remainingSec) / 60)).padStart(2, '0');
      const s = String(Math.max(0, remainingSec) % 60).padStart(2, '0');
      el.textContent = `⏱️ ${m}:${s}`;
    }
    if (remainingSec <= 0) {
      clearInterval(timer);
      gradeExam();
    }
  }, 1000);

  const saveDraft = () => {
    store.state.inProgressExam = {
      level, examId, data, section, answers, remainingSec,
      savedAt: new Date().toLocaleString('vi-VN')
    };
    store.save();
  };

  const gradeExam = () => {
    submitted = true;
    clearInterval(timer);
    store.state.inProgressExam = null;

    let correct = 0, total = 0;
    if (section === 'all' || section === 'cloze') {
      data.blanks.forEach((b) => {
        total++;
        if (answers.cloze[b.index] === b.answerLetter) correct++;
      });
    }
    if (section === 'all' || section === 'reading') {
      data.readingQuestions.forEach((q) => {
        total++;
        if (Number(answers.reading[q.qNum]) === q.correctIndex) correct++;
      });
    }
    if (section === 'all' || section === 'single') {
      data.singleQuestions.forEach((q) => {
        total++;
        if (Number(answers.single[q.qNum]) === q.correctIndex) correct++;
      });
    }

    const score = Math.round((correct / Math.max(1, total)) * cfg.maxScore);
    const passed = score >= cfg.passScore;

    store.state.examHistory.unshift({
      examId,
      level,
      score,
      maxScore: cfg.maxScore,
      passed,
      date: new Date().toLocaleDateString('vi-VN')
    });
    store.state.profile.xp += correct * 12;
    store.save();
    render();
  };

  const render = () => {
    const wordMap = Object.fromEntries(allWords.map((w) => [w.hanzi, w]));

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📋 Kỳ Thi ${cfg.label} · Mã đề <code>${examId}</code></h2>
            <div style="font-size:0.82rem;color:var(--text-muted)">${cfg.desc} · Ngưỡng đạt: <strong>${cfg.passScore}/${cfg.maxScore} điểm</strong></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span id="exam-timer" class="badge-pill" style="font-size:0.95rem">⏱️ ${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}</span>
            ${!submitted ? `<button class="btn btn-outline btn-sm" id="btn-save-draft">💾 Lưu bài làm dở</button>` : ''}
            <button class="btn btn-outline btn-sm" id="btn-exit-exam">✕ Thoát</button>
          </div>
        </div>

        ${cfg.isBand79 ? `
          <div style="padding:10px 14px;border-radius:10px;background:var(--surface-alt);border-left:4px solid var(--primary);font-size:0.84rem;margin-bottom:12px">
            <strong>Lưu ý chuẩn HSK 3.0:</strong> HSK 7–9 là một kỳ thi chung duy nhất; tại Panda HSK, hệ thống chia theo độ khó thành 3 cấp <strong>HSK 7, HSK 8, HSK 9</strong> để bạn luyện tập từng bước.
          </div>
        ` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <button class="btn ${section === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm" data-sec="all">📑 Thi thử toàn diện</button>
          <button class="btn ${section === 'cloze' ? 'btn-primary' : 'btn-outline'} btn-sm" data-sec="cloze">🧩 Luyện Cloze khung A–F</button>
          <button class="btn ${section === 'reading' ? 'btn-primary' : 'btn-outline'} btn-sm" data-sec="reading">📖 Luyện Đọc chia đôi</button>
          <button class="btn ${section === 'single' ? 'btn-primary' : 'btn-outline'} btn-sm" data-sec="single">✍️ Luyện Điền từ câu đơn</button>
        </div>

        ${(section === 'all' || section === 'cloze') ? `
          <div style="border:1.5px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
            <h3 class="card-title">Phần 1: Điền từ vào đoạn văn (Chọn từ trong khung A–F)</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;background:var(--surface-alt);padding:12px;border-radius:10px;margin:10px 0">
              ${data.bank.map((b) => `<div><strong>${b.letter}.</strong> ${b.hanzi} <span style="color:var(--primary)">(${b.pinyin})</span></div>`).join('')}
            </div>
            <div style="display:flex;flex-direction:column;gap:10px">
              ${data.blanks.map((b) => `
                <div style="padding:10px;border-radius:10px;background:var(--bg)">
                  <div style="margin-bottom:6px"><strong>Ô (${b.index}):</strong> ${b.sentence}</div>
                  <select data-cloze-idx="${b.index}" ${submitted ? 'disabled' : ''} style="max-width:220px">
                    <option value="">-- Chọn đáp án A–F --</option>
                    ${data.bank.map((opt) => `<option value="${opt.letter}" ${answers.cloze[b.index] === opt.letter ? 'selected' : ''}>${opt.letter}. ${opt.hanzi}</option>`).join('')}
                  </select>
                  ${submitted ? `<div style="margin-top:6px;font-size:0.84rem;color:${answers.cloze[b.index] === b.answerLetter ? 'var(--green)' : '#dc2626'}">${b.explainVi}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${(section === 'all' || section === 'reading') ? `
          <div style="border:1.5px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
            <div class="card-header">
              <h3 class="card-title">Phần 2: Đọc đoạn văn dài (Giao diện chia đôi · Bấm vào từ để xem nghĩa)</h3>
              <button class="btn btn-outline btn-sm" id="btn-toggle-pinyin">${showPinyin ? '🙈 Ẩn Pinyin' : '👁️ Hiện Pinyin'}</button>
            </div>
            <div id="word-popup-bar" style="min-height:32px;padding:6px 10px;border-radius:8px;background:var(--surface-alt);font-size:0.85rem;margin-bottom:10px;color:var(--primary)">
              💡 Bấm vào bất kỳ từ tiếng Trung nào trong đoạn văn bên trái để tra nghĩa nhanh.
            </div>
            <div class="two-col-grid">
              <div style="padding:14px;border-radius:12px;background:var(--bg);line-height:2.2;font-size:1.12rem">
                在现代社会中，学习汉语不仅能帮助我们了解中华文化，还能拓宽国际视野。我们可以通过阅读文章来掌握核心词汇：
                ${data.passageSegments.map((seg) => `
                  <span class="clickable-zh" data-lookup="${seg.hanzi}" style="cursor:pointer;padding:2px 4px;border-radius:6px;border-bottom:1px dashed var(--primary);margin:0 2px;display:inline-block">
                    ${showPinyin ? `<ruby>${seg.hanzi}<rt style="font-size:0.68rem;color:var(--primary)">${seg.pinyin}</rt></ruby>` : seg.hanzi}
                  </span>
                `).join('，')}。这些词语在高级汉语表达中非常关键。
              </div>
              <div style="display:flex;flex-direction:column;gap:10px">
                ${data.readingQuestions.map((q) => `
                  <div style="padding:10px;border-radius:10px;background:var(--bg)">
                    <div style="font-weight:700;margin-bottom:6px">Câu ${q.qNum}: ${q.question}</div>
                    ${q.options.map((opt, oIdx) => `
                      <label style="display:block;font-size:0.86rem;margin:4px 0;cursor:pointer">
                        <input type="radio" name="read_${q.qNum}" value="${oIdx}" ${Number(answers.reading[q.qNum]) === oIdx ? 'checked' : ''} ${submitted ? 'disabled' : ''} />
                        ${opt}
                      </label>
                    `).join('')}
                    ${submitted ? `<div style="margin-top:4px;font-size:0.82rem;color:var(--green)">${q.explainVi}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        ${(section === 'all' || section === 'single') ? `
          <div style="border:1.5px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
            <h3 class="card-title">Phần 3: Điền từ câu đơn & Nhận diện từ vựng</h3>
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
              ${data.singleQuestions.map((q) => `
                <div style="padding:10px;border-radius:10px;background:var(--bg)">
                  <div style="font-weight:700;margin-bottom:6px">Câu ${q.qNum}: ${q.prompt}</div>
                  ${q.options.map((opt, oIdx) => `
                    <label style="display:block;font-size:0.86rem;margin:4px 0;cursor:pointer">
                      <input type="radio" name="single_${q.qNum}" value="${oIdx}" ${Number(answers.single[q.qNum]) === oIdx ? 'checked' : ''} ${submitted ? 'disabled' : ''} />
                      ${opt}
                    </label>
                  `).join('')}
                  ${submitted ? `<div style="margin-top:4px;font-size:0.82rem;color:var(--green)">${q.explainVi}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${!submitted
          ? `<button class="btn btn-primary btn-block" id="btn-submit-exam">✅ Nộp bài & Xem giải thích chi tiết</button>`
          : `<button class="btn btn-green btn-block" id="btn-finish-exam">🏅 Hoàn tất & Quay lại danh sách đề thi</button>`}
      </div>
    `;

    document.getElementById('btn-exit-exam').onclick = () => { clearInterval(timer); onExit(); };
    if (document.getElementById('btn-save-draft')) {
      document.getElementById('btn-save-draft').onclick = () => {
        saveDraft();
        alert('Đã lưu bài làm dở vào tài khoản! Bạn có thể tiếp tục làm bất cứ lúc nào.');
      };
    }
    document.querySelectorAll('[data-sec]').forEach((b) => {
      b.onclick = () => { if (!submitted) { section = b.dataset.sec; render(); } };
    });
    if (document.getElementById('btn-toggle-pinyin')) {
      document.getElementById('btn-toggle-pinyin').onclick = () => { showPinyin = !showPinyin; render(); };
    }
    document.querySelectorAll('.clickable-zh').forEach((el) => {
      el.onclick = () => {
        const w = wordMap[el.dataset.lookup];
        const bar = document.getElementById('word-popup-bar');
        if (w && bar) {
          bar.innerHTML = `📖 <strong>${w.hanzi}</strong> (${w.pinyin}) [${w.pos || 'Từ vựng'}]: <strong>${w.meaning}</strong>`;
        }
      };
    });
    document.querySelectorAll('[data-cloze-idx]').forEach((sel) => {
      sel.onchange = () => { answers.cloze[sel.dataset.clozeIdx] = sel.value; saveDraft(); };
    });
    data.readingQuestions.forEach((q) => {
      document.querySelectorAll(`input[name="read_${q.qNum}"]`).forEach((r) => {
        r.onchange = () => { answers.reading[q.qNum] = Number(r.value); saveDraft(); };
      });
    });
    data.singleQuestions.forEach((q) => {
      document.querySelectorAll(`input[name="single_${q.qNum}"]`).forEach((r) => {
        r.onchange = () => { answers.single[q.qNum] = Number(r.value); saveDraft(); };
      });
    });
    if (document.getElementById('btn-submit-exam')) {
      document.getElementById('btn-submit-exam').onclick = gradeExam;
    }
    if (document.getElementById('btn-finish-exam')) {
      document.getElementById('btn-finish-exam').onclick = onExit;
    }
  };

  render();
}