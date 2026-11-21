import { dataLoader } from '../data/loader.js';
import { getDueWords, getNewWords, getWeakestWords, getTodayStr } from '../memory/srs.js';
import { SessionTracker, createSeededRandom, shuffle } from './engine.js';
import { tts } from '../audio/tts.js';
import { store } from '../storage/db.js';
import { stripToneMarks } from '../scoring/pinyin-util.js';
import { extractPitchContour, drawPitchComparison } from '../audio/pitch.js';
import { gradePronunciation } from '../scoring/speech-grader.js';

export async function startSmartSession(container, level, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const dueWords = getDueWords(allWords, Date.now(), 6);
  const newWords = getNewWords(allWords, level, 5);
  const fallbackPool = allWords.filter((w) => w.level === level).slice(0, 8);
  const challengePool = shuffle([...new Set([...dueWords, ...newWords, ...fallbackPool])]).slice(0, 8);

  const tracker = new SessionTracker(`Phiên Học Thông Minh HSK ${level}`);

  runQuizStage(container, {
    title: 'Chặng 1/3 · Ôn từ đến hạn',
    words: dueWords.length ? dueWords : fallbackPool.slice(0, 4),
    allWords,
    tracker,
    allowRepeatWrong: true,
    onStageDone: () => {
      runNewWordsIntro(container, newWords, () => {
        runQuizStage(container, {
          title: 'Chặng 3/3 · Thử thách tổng hợp',
          words: challengePool,
          allWords,
          tracker,
          allowRepeatWrong: true,
          onStageDone: () => onFinish(tracker.finish())
        });
      });
    }
  });
}

function runNewWordsIntro(container, newWords, onDone) {
  if (!newWords || newWords.length === 0) {
    onDone();
    return;
  }
  let idx = 0;

  function renderCard() {
    const w = newWords[idx];
    const chars = [...w.hanzi];
    const radMatches = chars
      .map((c) => dataLoader.radicals.find((r) => r.char === c || r.variant === c))
      .filter(Boolean);

    container.innerHTML = `
      <div class="game-hud">
        <span>Chặng 2/3 · Học từ mới (${idx + 1}/${newWords.length})</span>
        <span class="badge-pill">HSK ${w.level} · ${w.topic}</span>
      </div>
      <div class="flashcard-scene" id="fc-scene" tabindex="0" role="button" aria-label="Bấm để lật thẻ">
        <div class="flashcard-inner">
          <div class="flashcard-face">
            <span class="badge-pill">${w.pos}</span>
            <div class="hanzi-xl" style="margin:12px 0">${w.hanzi}</div>
            <div style="font-size:1.25rem;color:var(--primary);font-weight:700">${w.pinyin}</div>
            <button class="btn btn-outline btn-sm" id="btn-fc-audio" style="margin-top:12px">🔊 Nghe phát âm</button>
            <small style="color:var(--text-muted);margin-top:10px">Chạm thẻ hoặc nhấn Space để xem nghĩa & mẹo nhớ</small>
          </div>
          <div class="flashcard-face flashcard-back">
            <div>
              <div class="hanzi-lg">${w.hanzi} <span style="font-size:1rem;color:var(--primary)">(${w.pinyin})</span></div>
              <div style="font-size:1.2rem;font-weight:800;margin:6px 0">${w.meaning}</div>
            </div>
            ${w.exZh ? `
              <div style="background:var(--surface-alt);padding:8px 12px;border-radius:10px;width:100%;font-size:0.9rem">
                <div><strong>${w.exZh}</strong></div>
                <div style="color:var(--text-muted)">${w.exPy}</div>
                <div>${w.exVi}</div>
              </div>
            ` : ''}
            <div style="background:var(--gold-light);padding:8px 12px;border-radius:10px;width:100%;font-size:0.86rem;text-align:left">
              <strong>💡 Mẹo nhớ:</strong> ${w.mnemonic || 'Liên tưởng hình ảnh chữ Hán với ý nghĩa tiếng Việt.'}
              ${radMatches.length ? `<br/><strong>🧩 Bộ thủ:</strong> ${radMatches.map((r) => `${r.char} (${r.meaning})`).join(', ')}` : ''}
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline" id="btn-fc-flip" style="flex:1">🔄 Lật thẻ</button>
        <button class="btn btn-primary" id="btn-fc-next" style="flex:2">${idx + 1 < newWords.length ? 'Từ tiếp theo →' : 'Vào thử thách tổng hợp →'}</button>
      </div>
    `;

    tts.speak(w.hanzi);
    const scene = container.querySelector('#fc-scene');
    const toggleFlip = () => scene.classList.toggle('flipped');
    scene.addEventListener('click', (e) => {
      if (e.target.id !== 'btn-fc-audio') toggleFlip();
    });
    container.querySelector('#btn-fc-flip').onclick = toggleFlip;
    container.querySelector('#btn-fc-audio').onclick = (e) => {
      e.stopPropagation();
      tts.speak(w.hanzi);
    };
    container.querySelector('#btn-fc-next').onclick = () => {
      store.state.profile.dailyTasks.newLearned += 1;
      idx++;
      if (idx < newWords.length) renderCard();
      else onDone();
    };
  }
  renderCard();
}

export function runQuizStage(container, { title, words, allWords, tracker, allowRepeatWrong = true, isBoss = false, onStageDone }) {
  const queue = [...words];
  let qIndex = 0;
  let bossHp = words.length * 100;
  const maxBossHp = bossHp;
  let keyHandler = null;

  function cleanup() {
    if (keyHandler) window.removeEventListener('keydown', keyHandler);
  }

  function renderQuestion() {
    if (qIndex >= queue.length || (isBoss && bossHp <= 0)) {
      cleanup();
      onStageDone();
      return;
    }

    const target = queue[qIndex];
    const qType = qIndex % 3;
    const distractors = shuffle(allWords.filter((w) => w.hanzi !== target.hanzi)).slice(0, 3);
    const options = shuffle([target, ...distractors]);

    let promptHtml = '';
    if (qType === 0) {
      promptHtml = `<div class="hanzi-xl">${target.hanzi}</div><button class="btn btn-outline btn-sm" id="btn-q-tts">🔊 Nghe</button>`;
    } else if (qType === 1) {
      promptHtml = `<div style="font-size:1.3rem;font-weight:800">${target.meaning}</div><small style="color:var(--text-muted)">(${target.pos})</small>`;
    } else {
      promptHtml = `<div style="font-size:1.6rem;font-weight:800;color:var(--primary)">${target.pinyin}</div><button class="btn btn-outline btn-sm" id="btn-q-tts">🔊 Nghe</button>`;
    }

    container.innerHTML = `
      <div class="game-hud">
        <span>${title}</span>
        <span>Combo: <strong>x${tracker.getComboMultiplier()}</strong> (${qIndex + 1}/${queue.length})</span>
      </div>
      ${isBoss ? `
        <div class="boss-hp-wrap" title="Máu Boss">
          <div class="boss-hp-fill" style="width:${Math.max(0, (bossHp / maxBossHp) * 100)}%"></div>
        </div>
      ` : `
        <div class="progress-track"><div class="progress-fill" style="width:${(qIndex / queue.length) * 100}%"></div></div>
      `}
      <div class="card" style="text-align:center;padding:20px 14px">
        <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:6px">Hãy nhớ lại đáp án trước khi chọn:</div>
        ${promptHtml}
      </div>
      <div class="options-grid" id="options-box">
        ${options
          .map(
            (opt, i) => `
          <button class="option-btn" data-idx="${i}" data-correct="${opt.hanzi === target.hanzi}">
            <span class="key-hint">${i + 1}</span>
            <span>${qType === 0 ? `${opt.meaning} (${opt.pinyin})` : `<span class="hanzi-md">${opt.hanzi}</span>`}</span>
          </button>
        `
          )
          .join('')}
      </div>
      <div id="feedback-box"></div>
    `;

    if (qType !== 1) tts.speak(target.hanzi);
    const ttsBtn = container.querySelector('#btn-q-tts');
    if (ttsBtn) ttsBtn.onclick = () => tts.speak(target.hanzi);

    const startTime = performance.now();
    let answered = false;

    const handleChoice = (btn) => {
      if (answered) return;
      answered = true;
      const reactionMs = Math.round(performance.now() - startTime);
      const isCorrect = btn.dataset.correct === 'true';

      container.querySelectorAll('.option-btn').forEach((b) => {
        if (b.dataset.correct === 'true') b.classList.add('correct');
        else if (b === btn) b.classList.add('wrong');
      });

      const res = tracker.submitAnswer(target, isCorrect, reactionMs);
      if (isBoss && isCorrect) {
        const dmg = reactionMs <= 2500 ? 130 : 90;
        bossHp = Math.max(0, bossHp - dmg);
      }

      if (!isCorrect && allowRepeatWrong && queue.length < words.length + 5) {
        const insertAt = Math.min(queue.length, qIndex + 3);
        queue.splice(insertAt, 0, target);
      }

      const fb = container.querySelector('#feedback-box');
      fb.innerHTML = `
        <div class="card" style="border-color:${isCorrect ? 'var(--success)' : 'var(--danger)'}">
          <strong>${isCorrect ? `✅ Chính xác! (${(reactionMs / 1000).toFixed(2)}s · ${res.status})` : `❌ Chưa đúng! Đáp án: ${target.hanzi} (${target.pinyin}) — ${target.meaning}`}</strong>
          ${target.mnemonic ? `<p style="margin:6px 0 0;font-size:0.85rem">💡 ${target.mnemonic}</p>` : ''}
          <button class="btn btn-primary btn-block" id="btn-next-q" style="margin-top:10px">Tiếp tục (Enter)</button>
        </div>
      `;
      if (!isCorrect) fb.classList.add('shake');
      container.querySelector('#btn-next-q').onclick = () => {
        qIndex++;
        renderQuestion();
      };
    };

    container.querySelectorAll('.option-btn').forEach((btn) => {
      btn.onclick = () => handleChoice(btn);
    });

    cleanup();
    keyHandler = (e) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const btn = container.querySelectorAll('.option-btn')[idx];
        if (btn) handleChoice(btn);
      } else if ((e.key === 'Enter' || e.key === ' ') && answered) {
        e.preventDefault();
        qIndex++;
        renderQuestion();
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  renderQuestion();
}

export async function startMatchMode(container, level, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const pool = shuffle(allWords.filter((w) => w.level === level)).slice(0, 6);
  const tracker = new SessionTracker(`Ghép Nhanh HSK ${level}`);

  const tiles = [];
  pool.forEach((w, idx) => {
    tiles.push({ pairId: idx, word: w, text: w.hanzi, isHanzi: true });
    tiles.push({ pairId: idx, word: w, text: `${w.pinyin}\n${w.meaning}`, isHanzi: false });
  });
  const shuffledTiles = shuffle(tiles);

  let selectedTileEl = null;
  let selectedData = null;
  let matchedCount = 0;
  let lastActionTime = performance.now();
  let secondsLeft = 60;

  container.innerHTML = `
    <div class="game-hud">
      <span>⚡ Ghép Nhanh HSK ${level}</span>
      <span id="match-timer">⏱️ 60s</span>
      <span id="match-combo">Combo x1</span>
    </div>
    <div class="match-grid" id="match-grid">
      ${shuffledTiles
        .map(
          (t, i) => `
        <button class="match-tile ${t.isHanzi ? 'hanzi-md' : ''}" data-idx="${i}">
          ${t.text.replace('\n', '<br/><small style="font-weight:500">')}${t.isHanzi ? '' : '</small>'}
        </button>
      `
        )
        .join('')}
    </div>
  `;

  const timerId = setInterval(() => {
    secondsLeft--;
    const el = container.querySelector('#match-timer');
    if (el) el.textContent = `⏱️ ${secondsLeft}s`;
    if (secondsLeft <= 0) {
      clearInterval(timerId);
      onFinish(tracker.finish());
    }
  }, 1000);

  container.querySelectorAll('.match-tile').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.idx);
      const data = shuffledTiles[idx];
      if (btn.classList.contains('matched') || btn === selectedTileEl) return;

      if (data.isHanzi) tts.speak(data.text);

      if (!selectedTileEl) {
        selectedTileEl = btn;
        selectedData = data;
        btn.classList.add('selected');
        return;
      }

      const rt = Math.round(performance.now() - lastActionTime);
      lastActionTime = performance.now();

      if (selectedData.pairId === data.pairId) {
        btn.classList.add('matched');
        selectedTileEl.classList.add('matched');
        const res = tracker.submitAnswer(data.word, true, rt);
        container.querySelector('#match-combo').textContent = `Combo x${res.multiplier}`;
        matchedCount++;
        selectedTileEl = null;
        selectedData = null;

        if (matchedCount === pool.length) {
          clearInterval(timerId);
          setTimeout(() => onFinish(tracker.finish()), 300);
        }
      } else {
        tracker.submitAnswer(data.word, false, rt);
        container.querySelector('#match-combo').textContent = `Combo x1`;
        btn.classList.add('shake');
        selectedTileEl.classList.remove('selected');
        setTimeout(() => btn.classList.remove('shake'), 300);
        selectedTileEl = null;
        selectedData = null;
      }
    };
  });
}

export async function startFallingMode(container, level, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const pool = shuffle(allWords.filter((w) => w.level === level)).slice(0, 10);
  const tracker = new SessionTracker(`Từ Rơi HSK ${level}`);

  let idx = 0;
  let y = 0;
  let speed = 0.75;
  let animId = null;
  let startTime = performance.now();
  let stopped = false;

  container.innerHTML = `
    <div class="game-hud">
      <span>☄️ Từ Rơi HSK ${level}</span>
      <span id="fall-progress">1/${pool.length}</span>
      <span id="fall-combo">Combo x1</span>
    </div>
    <div class="falling-arena" id="falling-arena">
      <div class="falling-word" id="falling-word" style="top:0px"></div>
      <div class="danger-line"></div>
    </div>
    <div class="options-grid" id="fall-options"></div>
  `;

  const wordEl = container.querySelector('#falling-word');
  const optBox = container.querySelector('#fall-options');

  function spawnWord() {
    if (stopped) return;
    if (idx >= pool.length) {
      stopped = true;
      cancelAnimationFrame(animId);
      onFinish(tracker.finish());
      return;
    }
    const target = pool[idx];
    y = 0;
    startTime = performance.now();
    wordEl.textContent = target.hanzi;
    container.querySelector('#fall-progress').textContent = `${idx + 1}/${pool.length}`;
    tts.speak(target.hanzi);

    const opts = shuffle([target, ...shuffle(allWords.filter((w) => w.hanzi !== target.hanzi)).slice(0, 3)]);
    optBox.innerHTML = opts
      .map(
        (o, i) => `
      <button class="option-btn" data-ok="${o.hanzi === target.hanzi}">
        <span class="key-hint">${i + 1}</span>
        <span>${o.meaning} <small style="color:var(--text-muted)">(${o.pinyin})</small></span>
      </button>
    `
      )
      .join('');

    optBox.querySelectorAll('.option-btn').forEach((btn) => {
      btn.onclick = () => {
        const ok = btn.dataset.ok === 'true';
        const rt = Math.round(performance.now() - startTime);
        const res = tracker.submitAnswer(target, ok, rt);
        container.querySelector('#fall-combo').textContent = `Combo x${res.multiplier}`;
        if (ok) {
          speed += 0.08;
          idx++;
          spawnWord();
        } else {
          btn.classList.add('wrong');
        }
      };
    });
  }

  function loop() {
    if (stopped) return;
    y += speed;
    wordEl.style.top = `${y}px`;
    if (y >= 292) {
      const target = pool[idx];
      tracker.submitAnswer(target, false, 5000);
      idx++;
      spawnWord();
    }
    animId = requestAnimationFrame(loop);
  }

  spawnWord();
  animId = requestAnimationFrame(loop);
}

export async function startAudioHunterMode(container, level, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const words = shuffle(allWords.filter((w) => w.level === level)).slice(0, 8);
  const tracker = new SessionTracker(`Thợ Săn Âm Thanh HSK ${level}`);

  runQuizStage(container, {
    title: `🎧 Thợ Săn Âm Thanh HSK ${level}`,
    words,
    allWords,
    tracker,
    onStageDone: () => onFinish(tracker.finish())
  });
}

export async function startToneDojoMode(container, level, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const sandhiDrills = [
    { hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'Xin chào (biến điệu 3+3 → 2+3)', toneAns: '2-3', explain: 'Hai thanh 3 đi liền nhau: nǐ biến thành thanh 2 (ní hǎo).' },
    { hanzi: '不是', pinyin: 'bù shì', meaning: 'Không phải (biến điệu 不 trước thanh 4)', toneAns: '2-4', explain: '不 (bù) đứng trước thanh 4 (shì) đổi thành thanh 2: bú shì.' },
    { hanzi: '一个', pinyin: 'yī gè', meaning: 'Một cái (biến điệu 一 trước thanh 4)', toneAns: '2-4', explain: '一 (yī) đứng trước thanh 4 (gè) đổi thành thanh 2: yí gè.' },
    { hanzi: '一天', pinyin: 'yī tiān', meaning: 'Một ngày (biến điệu 一 trước thanh 1)', toneAns: '4-1', explain: '一 (yī) đứng trước thanh 1/2/3 đổi thành thanh 4: yì tiān.' },
    { hanzi: '妈妈', pinyin: 'māma', meaning: 'Mẹ (thanh 1 + thanh nhẹ)', toneAns: '1-5', explain: 'Âm tiết lặp lại thứ hai đọc thành thanh nhẹ (thanh 5).' },
    { hanzi: '中国', pinyin: 'Zhōngguó', meaning: 'Trung Quốc (thanh 1 + thanh 2)', toneAns: '1-2', explain: 'Zhōng (thanh 1 ngang cao) + guó (thanh 2 đi lên).' },
    { hanzi: '再见', pinyin: 'zàijiàn', meaning: 'Tạm biệt (thanh 4 + thanh 4)', toneAns: '4-4', explain: 'Hai thanh 4 rơi mạnh liên tiếp.' },
    { hanzi: '喜欢', pinyin: 'xǐhuan', meaning: 'Thích (thanh 3 + thanh nhẹ)', toneAns: '3-5', explain: 'xǐ (thanh 3 trầm) + huan (thanh nhẹ).' }
  ];

  const tracker = new SessionTracker(`Đạo Trường Thanh Điệu`);
  let idx = 0;

  function render() {
    if (idx >= sandhiDrills.length) {
      onFinish(tracker.finish());
      return;
    }
    const item = sandhiDrills[idx];
    const choices = shuffle([item.toneAns, '1-1', '2-4', '3-3', '4-2'].filter((v, i, a) => a.indexOf(v) === i)).slice(0, 4);

    container.innerHTML = `
      <div class="game-hud">
        <span>🎵 Đạo Trường Thanh Điệu (${idx + 1}/${sandhiDrills.length})</span>
        <span>Combo x${tracker.getComboMultiplier()}</span>
      </div>
      <div class="card" style="text-align:center">
        <p style="margin:0;color:var(--text-muted)">Nghe kỹ biến điệu thực tế và chọn tổ hợp thanh điệu đúng (5 = thanh nhẹ):</p>
        <div class="hanzi-xl" style="margin:12px 0">${item.hanzi}</div>
        <button class="btn btn-gold" id="btn-tone-play">🔊 Nghe phát âm mẫu</button>
      </div>
      <div class="options-grid">
        ${choices.map((c, i) => `<button class="option-btn" data-val="${c}"><span class="key-hint">${i + 1}</span><span>Thanh <strong>${c}</strong></span></button>`).join('')}
      </div>
      <div id="tone-fb"></div>
    `;

    tts.speak(item.hanzi);
    container.querySelector('#btn-tone-play').onclick = () => tts.speak(item.hanzi);
    const startTime = performance.now();
    let done = false;

    container.querySelectorAll('.option-btn').forEach((btn) => {
      btn.onclick = () => {
        if (done) return;
        done = true;
        const ok = btn.dataset.val === item.toneAns;
        const rt = Math.round(performance.now() - startTime);
        const dummyWord = allWords.find((w) => w.hanzi === item.hanzi) || { hanzi: item.hanzi };
        tracker.submitAnswer(dummyWord, ok, rt);

        btn.classList.add(ok ? 'correct' : 'wrong');
        container.querySelector('#tone-fb').innerHTML = `
          <div class="card">
            <strong>${ok ? '✅ Chuẩn xác!' : `❌ Đáp án đúng: Thanh ${item.toneAns}`}</strong>
            <p style="margin:6px 0">${item.explain}</p>
            <button class="btn btn-primary btn-block" id="btn-tone-next">Câu tiếp theo →</button>
          </div>
        `;
        container.querySelector('#btn-tone-next').onclick = () => {
          idx++;
          render();
        };
      };
    });
  }

  render();
}

export async function startHanziBuilderMode(container, level, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const singleChars = shuffle(allWords.filter((w) => w.level === level && [...w.hanzi].length === 1)).slice(0, 6);
  const pool = singleChars.length >= 4 ? singleChars : allWords.filter((w) => [...w.hanzi].length === 1).slice(0, 6);
  const tracker = new SessionTracker(`Xếp Chữ & Luyện Nét HSK ${level}`);

  let idx = 0;

  function render() {
    if (idx >= pool.length) {
      onFinish(tracker.finish());
      return;
    }
    const w = pool[idx];
    const startTime = performance.now();

    container.innerHTML = `
      <div class="game-hud">
        <span>🖌️ Luyện Nét & Bộ Thủ (${idx + 1}/${pool.length})</span>
        <span>${w.pinyin} — ${w.meaning}</span>
      </div>
      <div class="card" style="text-align:center">
        <p style="margin:0 0 8px;font-size:0.9rem">Tô đúng thứ tự nét chữ <strong>${w.meaning}</strong> (${w.pinyin}):</p>
        <div id="hanzi-writer-target" style="width:200px;height:200px;margin:0 auto;border:2px dashed var(--gold);border-radius:12px;background:#fff"></div>
        <div style="margin-top:10px;display:flex;gap:8px;justify-content:center">
          <button class="btn btn-outline btn-sm" id="btn-hw-hint">👁️ Xem nét mẫu</button>
          <button class="btn btn-outline btn-sm" id="btn-hw-audio">🔊 Nghe</button>
        </div>
        <p style="margin:10px 0 0;font-size:0.85rem;color:var(--text-muted)">💡 ${w.mnemonic}</p>
      </div>
      <button class="btn btn-primary btn-block" id="btn-hw-skip">Hoàn thành / Chữ tiếp theo →</button>
    `;

    tts.speak(w.hanzi);
    container.querySelector('#btn-hw-audio').onclick = () => tts.speak(w.hanzi);

    const targetBox = container.querySelector('#hanzi-writer-target');
    if (window.HanziWriter) {
      const writer = window.HanziWriter.create(targetBox, w.hanzi, {
        width: 196,
        height: 196,
        padding: 10,
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 200,
        strokeColor: '#b91c1c',
        radicalColor: '#d97706'
      });
      writer.quiz({
        onComplete: () => {
          const rt = Math.round(performance.now() - startTime);
          tracker.submitAnswer(w, true, Math.min(rt, 2400));
          setTimeout(() => {
            idx++;
            render();
          }, 600);
        }
      });
      container.querySelector('#btn-hw-hint').onclick = () => writer.animateCharacter();
    } else {
      targetBox.innerHTML = `<div class="hanzi-xl" style="line-height:196px;color:#b91c1c">${w.hanzi}</div>`;
    }

    container.querySelector('#btn-hw-skip').onclick = () => {
      tracker.submitAnswer(w, true, 2500);
      idx++;
      render();
    };
  }

  render();
}

export async function startSentenceOrderMode(container, level, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const withExamples = shuffle(allWords.filter((w) => w.level === level && w.hasExample)).slice(0, 6);
  const tracker = new SessionTracker(`Xếp Câu HSK ${level}`);
  let idx = 0;

  function render() {
    if (idx >= withExamples.length) {
      onFinish(tracker.finish());
      return;
    }
    const w = withExamples[idx];
    const cleanSentence = w.exZh.replace(/[。！？，、,.!?]/g, '');
    const tokens = [...cleanSentence];
    const scrambled = shuffle(tokens);
    const chosen = [];
    const startTime = performance.now();

    function draw() {
      container.innerHTML = `
        <div class="game-hud">
          <span>🧱 Xếp Câu (${idx + 1}/${withExamples.length})</span>
          <span>Combo x${tracker.getComboMultiplier()}</span>
        </div>
        <div class="card">
          <div style="font-size:0.85rem;color:var(--text-muted)">Dịch nghĩa tiếng Việt:</div>
          <div style="font-weight:700;font-size:1.05rem;margin:4px 0 12px">"${w.exVi}"</div>
          <div style="min-height:54px;padding:10px;border:2px dashed var(--primary);border-radius:12px;display:flex;flex-wrap:wrap;gap:6px;background:var(--surface-alt)">
            ${chosen.map((t, i) => `<button class="btn btn-primary btn-sm" data-chosen="${i}">${t.char}</button>`).join('')}
          </div>
          <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
            ${scrambled
              .map((ch, i) => {
                const used = chosen.some((c) => c.srcIdx === i);
                return `<button class="btn btn-outline btn-sm" data-src="${i}" ${used ? 'disabled' : ''}>${ch}</button>`;
              })
              .join('')}
          </div>
        </div>
        <button class="btn btn-success btn-block" id="btn-check-sent" ${chosen.length !== tokens.length ? 'disabled' : ''}>Kiểm tra câu</button>
      `;

      container.querySelectorAll('[data-src]').forEach((b) => {
        b.onclick = () => {
          const srcIdx = Number(b.dataset.src);
          chosen.push({ srcIdx, char: scrambled[srcIdx] });
          draw();
        };
      });
      container.querySelectorAll('[data-chosen]').forEach((b) => {
        b.onclick = () => {
          chosen.splice(Number(b.dataset.chosen), 1);
          draw();
        };
      });
      container.querySelector('#btn-check-sent').onclick = () => {
        const built = chosen.map((c) => c.char).join('');
        const ok = built === cleanSentence;
        const rt = Math.round(performance.now() - startTime);
        tracker.submitAnswer(w, ok, rt);
        tts.speak(w.exZh);
        alert(ok ? `✅ Chính xác! ${w.exZh}` : `❌ Chưa đúng! Đáp án đúng: ${w.exZh}`);
        idx++;
        render();
      };
    }
    draw();
  }

  render();
}

export async function startBossBattleMode(container, level, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const weak = getWeakestWords(allWords.filter((w) => w.level <= level), 8);
  const tracker = new SessionTracker(`Đấu Boss Thế Giới ${level}`);

  runQuizStage(container, {
    title: `🐉 BOSS HSK ${level}`,
    words: weak,
    allWords,
    tracker,
    isBoss: true,
    onStageDone: () => onFinish(tracker.finish({ bossWorld: level }))
  });
}

export async function startDailyChallengeMode(container, onFinish) {
  const allWords = await dataLoader.getAllLoadedWords();
  const today = getTodayStr();
  const rng = createSeededRandom(`LONGMON_${today}`);
  const dailyWords = shuffle(allWords, rng).slice(0, 10);
  const tracker = new SessionTracker(`Thử Thách Ngày ${today}`);

  runQuizStage(container, {
    title: `📅 Thử Thách Hằng Ngày (${today})`,
    words: dailyWords,
    allWords,
    tracker,
    allowRepeatWrong: false,
    onStageDone: () => {
      const summary = tracker.finish();
      store.state.profile.dailyChallengeDate = today;
      store.state.profile.dailyChallengeScore = summary.xpEarned;
      store.save();
      onFinish(summary);
    }
  });
}

export async function startPronunciationArena(container, level, customSentence = null, onBack = null) {
  const allWords = await dataLoader.getAllLoadedWords();
  const items = customSentence
    ? [customSentence]
    : shuffle(allWords.filter((w) => w.level === level)).slice(0, 6);

  let idx = 0;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordedUrl = null;
  let recordedBuffer = null;
  let recordStartTime = 0;

  function render() {
    const item = items[idx];
    const targetZh = item.exZh || item.hanzi;
    const targetPy = item.exPy || item.pinyin;
    const targetVi = item.exVi || item.meaning;

    const topErrors = Object.entries(store.state.phoneticErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    container.innerHTML = `
      <div class="game-hud">
        <span>🎙️ Đấu Trường Phát Âm (${idx + 1}/${items.length})</span>
        ${onBack ? `<button class="btn btn-outline btn-sm" id="btn-pron-back">← Quay lại</button>` : ''}
      </div>

      ${!tts.hasChineseVoice() ? tts.getInstallGuideHTML() : ''}

      <div class="card" style="text-align:center">
        <div id="pron-hanzi-display" class="hanzi-lg" style="margin:8px 0">${targetZh}</div>
        <div style="color:var(--primary);font-weight:700">${targetPy}</div>
        <div style="color:var(--text-muted);font-size:0.9rem;margin-bottom:12px">${targetVi}</div>

        <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" data-rate="0.5">🐢 0.5x</button>
          <button class="btn btn-outline btn-sm" data-rate="0.75">🚶 0.75x</button>
          <button class="btn btn-outline btn-sm" data-rate="1.0">🔊 1.0x</button>
          <button class="btn btn-outline btn-sm" id="btn-slow-syl">🔤 Từng âm tiết</button>
        </div>
      </div>

      <div class="card" style="text-align:center">
        <button class="btn btn-primary btn-block" id="btn-rec-toggle">🎙️ Bấm để Thu Âm & Chấm Điểm</button>
        <div id="rec-status" style="margin-top:8px;font-size:0.88rem;color:var(--text-muted)">
          Nhấn nút trên và đọc to câu tiếng Trung (yêu cầu HTTPS hoặc localhost).
        </div>
        <div id="playback-box" class="hidden" style="margin-top:10px">
          <audio id="user-audio-player" controls style="width:100%;height:36px"></audio>
        </div>
      </div>

      <div id="grade-result-box"></div>

      ${topErrors.length ? `
        <div class="card" style="font-size:0.85rem">
          <strong>📉 Lỗi phát âm hay gặp của bạn:</strong>
          ${topErrors.map(([k, v]) => `<span class="badge-pill">${k}: ${v} lần</span>`).join(' ')}
        </div>
      ` : ''}

      <div style="font-size:0.75rem;color:var(--text-muted);padding:0 4px">
        ℹ️ <strong>Lưu ý & Quyền riêng tư:</strong> Điểm số chỉ mang tính tham khảo luyện tập, không thay thế chứng chỉ thi HSKK. Tính năng nhận dạng giọng nói của trình duyệt (Chrome/Edge) có thể gửi luồng âm thanh tới máy chủ nhận dạng của nhà cung cấp trình duyệt để chuyển đổi văn bản.
      </div>
    `;

    if (onBack) container.querySelector('#btn-pron-back').onclick = onBack;

    container.querySelectorAll('[data-rate]').forEach((b) => {
      b.onclick = () => tts.speak(targetZh, Number(b.dataset.rate));
    });

    container.querySelector('#btn-slow-syl').onclick = () => {
      const chars = [...targetZh].filter((c) => /[\u4e00-\u9fa5]/.test(c));
      const disp = container.querySelector('#pron-hanzi-display');
      tts.speakSyllableBySyllable(targetZh, (activeIdx) => {
        disp.innerHTML = chars
          .map((c, i) => `<span style="${i === activeIdx ? 'background:#fde047;border-radius:6px;padding:0 4px' : ''}">${c}</span>`)
          .join('');
      });
    };

    const recBtn = container.querySelector('#btn-rec-toggle');
    const statusEl = container.querySelector('#rec-status');
    let isRecording = false;
    let recognition = null;
    let recognizedText = '';

    recBtn.onclick = async () => {
      if (isRecording) {
        isRecording = false;
        recBtn.textContent = '⏳ Đang phân tích...';
        recBtn.disabled = true;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        if (recognition) {
          try { recognition.stop(); } catch {}
        }
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusEl.innerHTML = `<span style="color:var(--danger)">❌ Trình duyệt này không hỗ trợ ghi âm micro hoặc trang chưa chạy trên HTTPS / localhost.</span>`;
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        recognizedText = '';
        recordStartTime = performance.now();

        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const durationSec = (performance.now() - recordStartTime) / 1000;
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          recordedUrl = URL.createObjectURL(blob);

          const pb = container.querySelector('#playback-box');
          const player = container.querySelector('#user-audio-player');
          pb.classList.remove('hidden');
          player.src = recordedUrl;

          let contour = [];
          try {
            const arrayBuf = await blob.arrayBuffer();
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            recordedBuffer = await audioCtx.decodeAudioData(arrayBuf);
            contour = extractPitchContour(recordedBuffer);
          } catch {}

          setTimeout(() => {
            recBtn.disabled = false;
            recBtn.textContent = '🎙️ Thu Âm Lại';
            showGradingResult(targetZh, targetPy, recognizedText, durationSec, contour);
          }, 350);
        };

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
          recognition = new SpeechRec();
          recognition.lang = 'zh-CN';
          recognition.maxAlternatives = 5;
          recognition.interimResults = false;
          recognition.onresult = (event) => {
            const results = event.results[0];
            let best = results[0].transcript;
            for (let i = 0; i < results.length; i++) {
              if (results[i].transcript.includes(targetZh)) {
                best = results[i].transcript;
                break;
              }
            }
            recognizedText = best;
          };
          recognition.onerror = (ev) => {
            if (ev.error === 'network') {
              statusEl.innerHTML = `<span style="color:var(--warning)">⚠️ Mất kết nối mạng cho nhận dạng giọng nói; hệ thống vẫn phân tích đường cao độ thanh điệu cục bộ.</span>`;
            } else if (ev.error === 'no-speech') {
              statusEl.innerHTML = `<span style="color:var(--warning)">⚠️ Không nghe thấy tiếng nói. Hãy đưa micro lại gần và đọc to hơn.</span>`;
            }
          };
          recognition.start();
        } else {
          statusEl.innerHTML = `<span style="color:var(--warning)">ℹ️ Trình duyệt chưa hỗ trợ Web Speech API; đang chấm đường cao độ thanh điệu cục bộ.</span>`;
        }

        mediaRecorder.start();
        isRecording = true;
        recBtn.textContent = '⏹️ Dừng & Chấm Điểm';
        recBtn.classList.replace('btn-primary', 'btn-danger');
        statusEl.textContent = '🔴 Đang thu âm... Hãy đọc rõ ràng từng âm tiết!';
      } catch (err) {
        recBtn.disabled = false;
        recBtn.textContent = '🎙️ Bấm để Thu Âm & Chấm Điểm';
        const msg =
          err.name === 'NotAllowedError'
            ? 'Bạn đã từ chối quyền truy cập Micro. Vui lòng bật lại quyền Micro trên thanh địa chỉ trình duyệt.'
            : `Không thể mở Micro (${err.message}).`;
        statusEl.innerHTML = `<span style="color:var(--danger)">❌ ${msg}</span>`;
      }
    };
  }

  function showGradingResult(targetZh, targetPy, transcript, durationSec, contour) {
    const res = gradePronunciation(targetZh, targetPy, transcript, durationSec);
    if (res.stars >= 2) {
      store.state.profile.xp += res.stars * 15;
      store.state.profile.coins += res.stars * 5;
      store.save();
    }

    const box = container.querySelector('#grade-result-box');
    box.innerHTML = `
      <div class="card" style="border-color:var(--gold)">
        <div class="card-header">
          <h3 class="card-title">Kết quả: ${res.totalScore}/100 điểm (${'⭐'.repeat(res.stars) || 'Cố lên!'})</h3>
          <span class="badge-pill">Nhận diện: ${transcript || '(Chỉ phân tích cao độ)'}</span>
        </div>

        <div style="font-size:1.8rem;text-align:center;margin:8px 0">
          ${res.charDetails
            .map(
              (c) => `<span class="syl-${c.status}" title="${c.note}">${c.char}<sub style="font-size:0.7rem">${c.expected}</sub></span>`
            )
            .join(' ')}
        </div>

        <div class="grid-2" style="font-size:0.85rem;margin:10px 0">
          <div>🎯 Chính xác âm: <strong>${res.accuracyScore}%</strong></div>
          <div>🎵 Thanh điệu: <strong>${res.toneScore}%</strong></div>
          <div>📏 Đầy đủ: <strong>${res.completenessScore}%</strong></div>
          <div>⚡ Trôi chảy: <strong>${res.fluencyScore}%</strong></div>
        </div>

        <div style="margin:10px 0">
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">
            Đường cao độ (Pitch): <span style="color:#b91c1c">━━ Bạn đọc</span> · <span style="color:#d97706">┅┅ Chuẩn thanh điệu</span>
          </div>
          <canvas id="pitch-canvas" width="320" height="110" style="width:100%;height:110px;background:var(--surface-alt);border-radius:10px"></canvas>
        </div>

        ${res.feedbackRules
          .map(
            (r) => `
          <div style="background:var(--gold-light);padding:8px 10px;border-radius:10px;margin-top:8px;font-size:0.84rem">
            <strong>🔧 Sửa lỗi ${r.title}:</strong> ${r.tip}<br/>
            <span>📌 Cặp tối thiểu: ${r.minimalPairs}</span><br/>
            <span>🗣️ Luyện vè: <em>${r.twister}</em></span>
          </div>
        `
          )
          .join('')}

        ${!customSentence ? `<button class="btn btn-primary btn-block" id="btn-pron-next" style="margin-top:12px">Câu tiếp theo →</button>` : ''}
      </div>
    `;

    drawPitchComparison(box.querySelector('#pitch-canvas'), contour, res.expectedTones);
    const nextBtn = box.querySelector('#btn-pron-next');
    if (nextBtn) {
      nextBtn.onclick = () => {
        idx = (idx + 1) % items.length;
        render();
      };
    }
  }

  render();
}

export function renderStoryReader(container, story, onBack, onOpenPopup) {
  const check = dataLoader.checkStoryVocabulary(story);
  let showPinyin = true;
  let showVi = false;
  let answeredQuiz = false;

  function render() {
    container.innerHTML = `
      <div class="game-hud">
        <button class="btn btn-outline btn-sm" id="btn-story-back">← Danh sách truyện</button>
        <span class="badge-pill">HSK ${story.level} · Từ trong cấp: ${check.ratio}%</span>
      </div>

      <div class="card">
        <h2 class="card-title" style="font-size:1.25rem">${story.title}</h2>
        <div style="color:var(--text-muted);font-size:0.9rem;margin-bottom:10px">${story.titleVi}</div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn btn-outline btn-sm" id="tog-py">${showPinyin ? '👁️ Ẩn Pinyin' : '👁️ Hiện Pinyin'}</button>
          <button class="btn btn-outline btn-sm" id="tog-vi">${showVi ? '🇻🇳 Ẩn dịch' : '🇻🇳 Hiện dịch'}</button>
          <button class="btn btn-primary btn-sm" id="btn-read-all">🔊 Nghe toàn bài</button>
        </div>

        <div id="story-body" style="display:flex;flex-direction:column;gap:12px">
          ${story.sentences
            .map((s, sIdx) => {
              const chars = [...s.zh];
              const wordHtml = chars
                .map((ch) => {
                  if (!/[\u4e00-\u9fa5]/.test(ch)) return ch;
                  const out = !check.allowedChars.has(ch);
                  return `<span class="story-word ${out ? 'out-of-level' : ''}" data-char="${ch}">${ch}</span>`;
                })
                .join('');
              return `
                <div class="story-sent-box" data-sidx="${sIdx}" style="padding:8px;border-radius:10px;background:var(--surface-alt)">
                  ${showPinyin ? `<div style="font-size:0.82rem;color:var(--primary)">${s.py}</div>` : ''}
                  <div class="hanzi-md" style="line-height:1.6">${wordHtml}</div>
                  ${showVi ? `<div style="font-size:0.86rem;color:var(--text-muted);margin-top:4px">${s.vi}</div>` : ''}
                  <div style="margin-top:6px;display:flex;gap:6px">
                    <button class="btn btn-outline btn-sm" data-speak-sent="${sIdx}">🔊 Nghe câu</button>
                    <button class="btn btn-outline btn-sm" data-read-aloud="${sIdx}">🎙️ Bạn đọc to</button>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">📝 Câu hỏi đọc hiểu</h3>
        ${story.questions
          .map(
            (q, qi) => `
          <div style="margin-top:12px">
            <div style="font-weight:700;margin-bottom:6px">${qi + 1}. ${q.q}</div>
            <div class="grid-2">
              ${q.options
                .map(
                  (opt, oi) => `
                <label class="option-btn" style="cursor:pointer">
                  <input type="radio" name="sq_${qi}" value="${oi}" /> <span>${opt}</span>
                </label>
              `
                )
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
        <button class="btn btn-success btn-block" id="btn-submit-story" style="margin-top:14px">Nộp bài & Nhận +40 XP</button>
        <div id="story-quiz-res"></div>
      </div>
    `;

    container.querySelector('#btn-story-back').onclick = onBack;
    container.querySelector('#tog-py').onclick = () => { showPinyin = !showPinyin; render(); };
    container.querySelector('#tog-vi').onclick = () => { showVi = !showVi; render(); };

    container.querySelector('#btn-read-all').onclick = async () => {
      const boxes = container.querySelectorAll('.story-sent-box');
      for (let i = 0; i < story.sentences.length; i++) {
        boxes.forEach((b) => (b.style.outline = 'none'));
        boxes[i].style.outline = '2px solid var(--gold)';
        await new Promise((r) => tts.speak(story.sentences[i].zh, null, null, r));
      }
      boxes.forEach((b) => (b.style.outline = 'none'));
    };

    container.querySelectorAll('[data-speak-sent]').forEach((b) => {
      b.onclick = () => tts.speak(story.sentences[Number(b.dataset.speakSent)].zh);
    });

    container.querySelectorAll('[data-read-aloud]').forEach((b) => {
      b.onclick = () => {
        const s = story.sentences[Number(b.dataset.readAloud)];
        startPronunciationArena(container, story.level, { exZh: s.zh, exPy: s.py, exVi: s.vi }, () => render());
      };
    });

    container.querySelectorAll('.story-word').forEach((el) => {
      el.onclick = () => {
        const ch = el.dataset.char;
        const found = dataLoader.allWordsMap.get(ch) || {
          hanzi: ch,
          pinyin: stripToneMarks(ch),
          meaning: 'Chữ đơn trong câu (bấm nghe phát âm)',
          pos: 'Chữ Hán',
          level: story.level
        };
        onOpenPopup(found);
      };
    });

    container.querySelector('#btn-submit-story').onclick = () => {
      if (answeredQuiz) return;
      let score = 0;
      story.questions.forEach((q, qi) => {
        const checked = container.querySelector(`input[name="sq_${qi}"]:checked`);
        if (checked && Number(checked.value) === q.answer) score++;
      });
      answeredQuiz = true;
      const xp = score === story.questions.length ? 40 : score * 10;
      store.state.profile.xp += xp;
      store.state.profile.coins += score * 5;
      store.save();
      container.querySelector('#story-quiz-res').innerHTML = `
        <div style="margin-top:10px;font-weight:700;color:var(--success)">
          🎉 Bạn trả lời đúng ${score}/${story.questions.length} câu! Nhận +${xp} XP.
        </div>
      `;
    };
  }

  render();
}