import { launchExamUI } from './exam/exam-engine.js';
import { store } from './storage/db.js';
import { dataLoader } from './data/loader.js';
import { getDueWords, getNewWords, recordReview, getWordStatus, getTodayStr } from './memory/srs.js';
import { tts } from './audio/tts.js';

const LEVELS = [1, 2, 3, 4, 5, 6, 7];
const levelLabel = (l) => (l === 7 ? 'HSK 7-9' : `HSK ${l}`);

let aiEnabled = false;
let currentTab = 'home';

async function checkAIBackend() {
  try {
    const res = await fetch('./api/chat', { method: 'GET' });
    const data = await res.json();
    aiEnabled = Boolean(data.enabled);
    const btn = document.getElementById('btn-ai-tutor');
    if (btn) btn.classList.toggle('hidden', !aiEnabled);
  } catch { aiEnabled = false; }
}

function updateTopbar() {
  const p = store.state.profile;
  const lvl = Math.floor(p.xp / 100) + 1;
  document.getElementById('ui-level').textContent = `Cấp ${lvl} · ${levelLabel(p.activeWorld)}`;
  document.getElementById('ui-streak').textContent = `🔥 ${p.streak}`;
  document.getElementById('ui-coins').textContent = `🪙 ${p.coins}`;
  document.documentElement.setAttribute('data-theme', store.state.settings.theme);
}

function openModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function openAITutorModal() {
  openModal(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:40px;height:40px;border-radius:12px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem">🧙‍♂️</div>
      <div>
        <h3 class="card-title" style="margin:0">Sư Phụ AI Tiếng Trung Toàn Diện</h3>
        <div style="font-size:0.78rem;color:var(--text-muted)">Từ vựng · Ngữ pháp · Giao tiếp · Dịch thuật · HSK 1–9</div>
      </div>
    </div>
    <div id="ai-chat-box" class="chat-stream">
      <div class="chat-msg ai">
        <strong>Sư phụ AI:</strong> 你好！(Nǐ hǎo!) Ta có thể giải đáp mọi vấn đề về tiếng Trung — từ giao tiếp thực tế, ngữ pháp, chiết tự chữ Hán, dịch thuật đến luyện thi mọi cấp độ.<br><br>
        <strong>Bạn muốn hỏi tôi cái gì?</strong>
      </div>
    </div>
    <div class="quick-chips">
      <button class="chip-btn" data-prompt="Phân biệt cách dùng 刚 và 刚才 kèm ví dụ">⚖️ Phân biệt từ</button>
      <button class="chip-btn" data-prompt="Chiết tự và mẹo nhớ chữ 赢 (thắng)">🀄 Chiết tự chữ Hán</button>
      <button class="chip-btn" data-prompt="Dịch sang tiếng Trung tự nhiên: Tiến độ đơn hàng hôm nay đã hoàn thành.">🔄 Dịch Việt - Trung</button>
      <button class="chip-btn" data-prompt="Giải thích một thành ngữ tiếng Trung hay dùng trong cuộc sống">📜 Thành ngữ hay</button>
    </div>
    <div style="display:flex;gap:8px">
      <input type="text" id="ai-input" placeholder="Bạn muốn hỏi tôi cái gì về tiếng Trung?..." maxlength="600" />
      <button class="btn btn-primary" id="ai-send">Gửi</button>
    </div>
  `);
  const send = async (customText = null) => {
    const inp = document.getElementById('ai-input');
    const box = document.getElementById('ai-chat-box');
    const msg = (customText || inp.value).trim();
    if (!msg) return;
    inp.value = '';
    box.innerHTML += `<div class="chat-msg user">${msg}</div>`;
    const loadingId = 'ai-load-' + Date.now();
    box.innerHTML += `<div id="${loadingId}" class="chat-msg ai" style="color:var(--text-muted)">⏳ Sư phụ đang phân tích...</div>`;
    box.scrollTop = box.scrollHeight;
    try {
      const res = await fetch('./api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      const formatted = (data.reply || data.error || '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      document.getElementById(loadingId).innerHTML = formatted;
    } catch {
      document.getElementById(loadingId).textContent = 'Lỗi kết nối máy chủ AI.';
    }
    box.scrollTop = box.scrollHeight;
  };
  document.getElementById('ai-send').onclick = () => send();
  document.getElementById('ai-input').onkeydown = (e) => { if (e.key === 'Enter') send(); };
  document.querySelectorAll('.chip-btn').forEach((chip) => {
    chip.onclick = () => send(chip.dataset.prompt);
  });
}

function openCreateDeckModal(onDone) {
  openModal(`
    <h3 class="card-title">➕ Tạo Bộ Thẻ Từ Vựng Mới</h3>
    <p style="font-size:0.85rem;color:var(--text-muted)">Tự tạo bộ flashcard theo chủ đề công việc, giao tiếp hoặc từ khó của riêng bạn.</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <input type="text" id="deck-title-inp" placeholder="Tên bộ thẻ (VD: Từ vựng công xưởng, Giao tiếp hàng ngày...)" />
      <textarea id="deck-words-inp" rows="5" placeholder="Nhập mỗi từ 1 dòng theo dạng: Chữ Hán | Pinyin | Nghĩa Việt&#10;Ví dụ:&#10;仓库 | cāngkù | nhà kho&#10;进度 | jìndù | tiến độ"></textarea>
      <button class="btn btn-primary btn-block" id="btn-save-deck">💾 Lưu Bộ Thẻ</button>
    </div>
  `);
  document.getElementById('btn-save-deck').onclick = () => {
    const title = document.getElementById('deck-title-inp').value.trim();
    const raw = document.getElementById('deck-words-inp').value.trim();
    if (!title || !raw) return alert('Vui lòng nhập tên bộ thẻ và ít nhất 1 từ vựng!');
    const words = raw.split(/\r?\n/).map((line, i) => {
      const [hanzi = '', pinyin = '', meaning = ''] = line.split('|').map((s) => s.trim());
      return hanzi ? { id: `custom_${Date.now()}_${i}`, level: 1, hanzi, pinyin, meaning: meaning || 'Từ tự thêm' } : null;
    }).filter(Boolean);
    if (!store.state.customDecks) store.state.customDecks = [];
    store.state.customDecks.unshift({ id: Date.now(), title, words });
    store.save();
    closeModal();
    if (onDone) onDone();
  };
}

async function startQuickQuiz(words, title = 'Luyện tập từ vựng') {
  if (!words || !words.length) return alert('Chưa có từ vựng trong mục này!');
  const all = await dataLoader.getAllLoadedWords();
  let idx = 0, score = 0;

  const renderQ = () => {
    if (idx >= words.length) {
      store.state.profile.xp += score * 15;
      store.state.profile.coins += score * 3;
      store.state.profile.lastStudyDate = getTodayStr();
      store.save();
      updateTopbar();
      document.getElementById('main-view').innerHTML = `
        <div class="card" style="text-align:center;max-width:520px;margin:0 auto">
          <h2>🎉 Hoàn thành: ${title}!</h2>
          <p>Đúng <strong>${score}/${words.length}</strong> câu · Nhận <strong>+${score * 15} XP</strong> & <strong>+${score * 3} 🪙</strong></p>
          <button class="btn btn-primary btn-block" id="btn-back-home">Quay lại Dashboard</button>
        </div>`;
      document.getElementById('btn-back-home').onclick = () => switchTab('home');
      return;
    }
    const target = words[idx];
    const distractors = all.filter((w) => w.hanzi !== target.hanzi).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);
    const t0 = performance.now();
    tts.speak(target.hanzi);

    document.getElementById('main-view').innerHTML = `
      <div style="max-width:640px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:14px">
        <div class="card" style="text-align:center">
          <div style="display:flex;justify-content:space-between;font-size:0.84rem;color:var(--text-muted)">
            <span>${title} · Câu ${idx + 1}/${words.length}</span>
            <span class="badge-pill">${levelLabel(target.level || 1)}</span>
          </div>
          <div class="hanzi-xl" style="margin:14px 0 4px">${target.hanzi}</div>
          <div style="color:var(--primary);font-weight:700;margin-bottom:10px">${target.pinyin || ''}</div>
          <button class="btn btn-outline btn-sm" id="btn-replay">🔊 Nghe phát âm</button>
        </div>
        <div class="options-grid">
          ${options.map((o, i) => `<button class="option-btn" data-hanzi="${o.hanzi}"><strong>${i + 1}.</strong> ${o.meaning}</button>`).join('')}
        </div>
      </div>
    `;
    document.getElementById('btn-replay').onclick = () => tts.speak(target.hanzi);
    document.querySelectorAll('.option-btn').forEach((btn) => {
      btn.onclick = () => {
        const isOk = btn.dataset.hanzi === target.hanzi;
        recordReview(target.hanzi, isOk, Math.round(performance.now() - t0));
        if (isOk) { score++; btn.classList.add('correct'); }
        else { btn.classList.add('wrong'); }
        setTimeout(() => { idx++; renderQ(); }, 600);
      };
    });
  };
  renderQ();
}

async function renderView(tab) {
  const main = document.getElementById('main-view');
  const p = store.state.profile;
  const allWords = await dataLoader.getAllLoadedWords();
  const due = getDueWords(allWords);
  const fresh = getNewWords(allWords, p.activeWorld, 8);
  const customDecks = store.state.customDecks || [];

  if (tab === 'home' || tab === 'vocab') {
    main.innerHTML = `
      <!-- BANNER ĐẦU TRANG GIỐNG BAOLINGO -->
      <div class="page-hero">
        <div class="hero-left">
          <div class="mascot-avatar">🐼</div>
          <div>
            <h1 class="hero-title">Học Từ Vựng Tiếng Trung</h1>
            <p class="hero-sub">Nắm vững <strong>${allWords.length.toLocaleString()}</strong> từ vựng HSK 1–9 với hệ thống lặp lại ngắt quãng (SRS) thông minh</p>
          </div>
        </div>
        <div class="hero-btns">
          <button class="btn btn-primary" id="btn-hero-vocab">📖 Sổ tay từ vựng</button>
          <button class="btn btn-green" id="btn-hero-game">🎮 Trò Chơi</button>
          <button class="btn btn-outline" id="btn-hero-srs">❓ Spaced Repetition là gì?</button>
        </div>
      </div>

      <!-- BỐ CỤC 2 CỘT CHÍNH -->
      <div class="two-col-grid">
        <!-- CỘT TRÁI: BẢNG XẾP HẠNG & TIẾN ĐỘ -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🏆 BẢNG XẾP HẠNG</h3>
              <span class="badge-pill">Tháng 11/2026</span>
            </div>
            <div style="text-align:center;font-size:0.84rem;font-weight:700;color:var(--primary)">🎁 Phần thưởng hàng tháng</div>
            <div class="podium-row">
              <div class="podium-item"><div class="podium-circle">🥇</div><span>#1</span></div>
              <div class="podium-item"><div class="podium-circle">🥈</div><span>#2</span></div>
              <div class="podium-item"><div class="podium-circle">🥉</div><span>#3</span></div>
              <div class="podium-item"><div class="podium-circle">🐉</div><span>Bạn</span></div>
            </div>
            <div class="rank-list">
              <div class="rank-row"><span>🐼 <strong>Lê Tiêu (Bạn)</strong> · Lv.${Math.floor(p.xp / 100) + 1}</span><span class="rank-badge">${p.xp} XP</span></div>
              <div class="rank-row"><span>🐯 Minh Anh · Lv.24</span><span class="badge-pill">2.810 XP</span></div>
              <div class="rank-row"><span>🦊 Thảo Nhi · Lv.17</span><span class="badge-pill">2.090 XP</span></div>
              <div class="rank-row"><span>🐰 Hoàng Nam · Lv.15</span><span class="badge-pill">1.950 XP</span></div>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title">🎯 Chọn Cấp Độ Luyện Tập</h3>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">
              ${LEVELS.map((l) => `<button class="btn ${p.activeWorld === l ? 'btn-primary' : 'btn-outline'} btn-sm" data-set-world="${l}">${levelLabel(l)}</button>`).join('')}
            </div>
          </div>
        </div>

        <!-- CỘT PHẢI: BỘ THẺ CỦA TÔI + BỘ TỪ VỰNG PHỔ BIẾN HSK 1-9 -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🗂️ BỘ THẺ CỦA TÔI (${customDecks.length} bộ thẻ)</h3>
              <button class="btn btn-primary btn-sm" id="btn-create-deck">+ Tạo Bộ Thẻ</button>
            </div>
            ${customDecks.length === 0 ? `
              <div style="text-align:center;padding:24px 12px;background:var(--bg);border-radius:14px;border:1px dashed var(--border)">
                <div style="font-size:2rem;margin-bottom:6px">📁</div>
                <div style="font-weight:700">Chưa có bộ thẻ cá nhân nào</div>
                <p style="font-size:0.84rem;color:var(--text-muted);margin:4px 0 12px">Tạo bộ thẻ đầu tiên để quản lý từ vựng chuyên ngành hoặc giao tiếp của bạn</p>
                <button class="btn btn-primary btn-sm" id="btn-create-deck-empty">+ Tạo Bộ Thẻ Đầu Tiên</button>
              </div>
            ` : `
              <div class="deck-grid">
                ${customDecks.map((d) => `
                  <div class="deck-card" data-play-deck="${d.id}">
                    <div>
                      <strong>${d.title}</strong>
                      <div style="font-size:0.8rem;color:var(--text-muted)">${d.words.length} từ vựng</div>
                    </div>
                    <button class="btn btn-outline btn-sm btn-block">▶️ Học ngay</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">✨ BỘ TỪ VỰNG PHỔ BIẾN (HSK 1 – HSK 9)</h3>
              <button class="btn btn-gold btn-sm" id="btn-quick-review">🔁 Ôn tập (${due.length})</button>
            </div>
            <div class="deck-grid">
              ${LEVELS.map((l) => {
                const cnt = allWords.filter((w) => w.level === l).length;
                return `
                  <div class="deck-card" data-learn-level="${l}">
                    <div>
                      <div style="display:flex;justify-content:space-between;align-items:center">
                        <strong style="color:var(--primary)">Bộ từ ${levelLabel(l)}</strong>
                        <span class="badge-pill">${cnt.toLocaleString()} từ</span>
                      </div>
                      <p style="font-size:0.8rem;color:var(--text-muted);margin:6px 0 0">Từ vựng chuẩn quốc tế kèm phát âm bản xứ & trắc nghiệm</p>
                    </div>
                    <button class="btn btn-primary btn-sm btn-block">⚡ Luyện 8 từ mới</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-hero-vocab').onclick = () => switchTab('practice');
    document.getElementById('btn-hero-game').onclick = () => switchTab('arena');
    document.getElementById('btn-hero-srs').onclick = () => openModal(`
      <h3 class="card-title">🧠 Spaced Repetition (Lặp lại ngắt quãng) là gì?</h3>
      <p>Hệ thống tự động ghi nhớ từ nào bạn hay quên để nhắc ôn lại đúng thời điểm vàng trước khi rơi rụng, giúp ghi nhớ sâu hàng nghìn chữ Hán mà không cần học nhồi nhét.</p>
    `);
    document.getElementById('btn-create-deck').onclick = () => openCreateDeckModal(() => renderView(tab));
    if (document.getElementById('btn-create-deck-empty')) {
      document.getElementById('btn-create-deck-empty').onclick = () => openCreateDeckModal(() => renderView(tab));
    }
    document.getElementById('btn-quick-review').onclick = () => startQuickQuiz(due.length ? due : fresh, 'Ôn tập SRS');
    document.querySelectorAll('[data-set-world]').forEach((b) => {
      b.onclick = () => { p.activeWorld = Number(b.dataset.setWorld); store.save(); updateTopbar(); renderView(tab); };
    });
    document.querySelectorAll('[data-learn-level]').forEach((card) => {
      card.onclick = () => {
        const lvl = Number(card.dataset.learnLevel);
        startQuickQuiz(getNewWords(allWords, lvl, 8), `Từ mới ${levelLabel(lvl)}`);
      };
    });
    document.querySelectorAll('[data-play-deck]').forEach((card) => {
      card.onclick = () => {
        const deck = customDecks.find((d) => String(d.id) === card.dataset.playDeck);
        if (deck) startQuickQuiz(deck.words, deck.title);
      };
    });
  } else if (tab === 'practice') {
    let filterLevel = 0;
    main.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📖 Sổ Tay & Tra Cứu Toàn Bộ Từ Vựng (${allWords.length.toLocaleString()} từ)</h2>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:14px">
          <input type="search" id="vocab-search" placeholder="Nhập chữ Hán, pinyin hoặc nghĩa tiếng Việt để lọc..." />
          <select id="vocab-level-filter" style="width:150px;flex-shrink:0">
            <option value="0">Tất cả cấp độ</option>
            ${LEVELS.map((l) => `<option value="${l}">${levelLabel(l)}</option>`).join('')}
          </select>
        </div>
        <div id="vocab-list" class="deck-grid"></div>
      </div>`;
    const renderList = () => {
      const k = document.getElementById('vocab-search').value.trim().toLowerCase();
      const filtered = allWords.filter((w) => {
        if (filterLevel && w.level !== filterLevel) return false;
        return !k || w.hanzi.includes(k) || w.pinyin.toLowerCase().includes(k) || w.meaning.toLowerCase().includes(k);
      }).slice(0, 60);
      document.getElementById('vocab-list').innerHTML = filtered.map((w) => `
        <div class="deck-card">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="badge-pill">${levelLabel(w.level)}</span>
              <button class="btn btn-outline btn-sm" data-say="${w.hanzi}">🔊</button>
            </div>
            <div class="hanzi-md" style="margin-top:6px">${w.hanzi} <span style="font-size:0.9rem;color:var(--primary);font-family:inherit">${w.pinyin}</span></div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">${w.meaning}</div>
          </div>
          <span class="badge-pill" style="align-self:flex-start">${getWordStatus(store.state.srs[w.hanzi])}</span>
        </div>`).join('');
      document.querySelectorAll('[data-say]').forEach((b) => { b.onclick = () => tts.speak(b.dataset.say); });
    };
    renderList();
    document.getElementById('vocab-search').oninput = renderList;
    document.getElementById('vocab-level-filter').onchange = (e) => { filterLevel = Number(e.target.value); renderList(); };
  } else if (tab === 'exam') {
    const history = store.state.examHistory || [];
    main.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📋 Phòng Thi Thử HSK Chuẩn Quốc Tế (HSK 1 – 9)</h2>
          <span class="badge-pill">Đề thi sát cấu trúc thật · Sinh đề mới 100%</span>
        </div>
        <p style="font-size:0.9rem;color:var(--text-muted)">Mỗi bài thi mô phỏng đầy đủ <strong>Nghe hiểu – Đọc hiểu – Viết (có Sư Phụ AI chấm điểm trực tiếp)</strong> và bấm giờ chuẩn quốc tế:</p>
        <div class="deck-grid">
          ${LEVELS.map((l) => `
            <div class="deck-card" data-start-exam="${l}">
              <div>
                <strong style="font-size:1.05rem;color:var(--primary)">Kỳ thi ${levelLabel(l)}</strong>
                <p style="font-size:0.82rem;color:var(--text-muted);margin:4px 0 0">Đề tổ hợp Nghe · Đọc · Viết không trùng lặp</p>
              </div>
              <button class="btn btn-primary btn-sm btn-block">📝 Bắt đầu làm bài</button>
            </div>
          `).join('')}
        </div>
      </div>
      ${history.length ? `
        <div class="card">
          <h3 class="card-title">🏅 Bảng Điểm Các Kỳ Thi Đã Hoàn Thành</h3>
          <div class="rank-list">
            ${history.slice(0, 8).map((h) => `
              <div class="rank-row">
                <span><strong>${levelLabel(h.level)}</strong> · Mã đề <code>${h.examId}</code> (${h.date})</span>
                <span style="font-weight:800;color:${h.passed ? 'var(--green)' : 'var(--primary)'}">${h.score}/${h.maxScore} điểm · ${h.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    document.querySelectorAll('[data-start-exam]').forEach((card) => {
      card.onclick = () => launchExamUI(main, Number(card.dataset.startExam), allWords, () => renderView('exam'));
    });
  } else if (tab === 'listen' || tab === 'speak' || tab === 'arena') {
    const sample = allWords.filter((w) => w.level === p.activeWorld).sort(() => Math.random() - 0.5).slice(0, 10);
    const titles = { listen: '🎧 Luyện Nghe Phản Xạ', speak: '🎙️ Luyện Phát Âm & Thanh Điệu', arena: '⚔️ Đấu Trường Từ Vựng Tốc Độ' };
    main.innerHTML = `
      <div class="card" style="max-width:600px;margin:0 auto;width:100%;text-align:center">
        <h2 class="card-title" style="justify-content:center">${titles[tab]}</h2>
        <p style="font-size:0.9rem;color:var(--text-muted)">Thử thách 10 từ ngẫu nhiên cấp <strong>${levelLabel(p.activeWorld)}</strong> với giọng đọc bản xứ.</p>
        <button class="btn btn-primary btn-block" id="btn-go-mode">🚀 Bắt đầu ngay</button>
      </div>`;
    document.getElementById('btn-go-mode').onclick = () => startQuickQuiz(sample, titles[tab]);
  } else if (tab === 'grammar' || tab === 'story') {
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">${tab === 'grammar' ? '🎓 Cẩm Nang Ngữ Pháp & Sư Phụ AI' : '📚 Truyện Đọc Song Ngữ HSK'}</h2>
        <p style="font-size:0.92rem">Bạn có thể hỏi trực tiếp <strong>Sư Phụ AI</strong> bất kỳ cấu trúc ngữ pháp nào hoặc yêu cầu tạo một đoạn truyện ngắn song ngữ Trung – Việt theo trình độ của bạn.</p>
        <button class="btn btn-primary" id="btn-ask-ai-now">🧙‍♂️ Mở Sư Phụ AI Ngay</button>
      </div>`;
    document.getElementById('btn-ask-ai-now').onclick = openAITutorModal;
  } else if (tab === 'review') {
    startQuickQuiz(due.length ? due : fresh, 'Ôn tập từ vựng');
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.side-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('sidebar').classList.remove('open');
  renderView(tab);
}

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  updateTopbar();
  await dataLoader.init();
  await checkAIBackend();

  document.querySelectorAll('.side-item').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
  document.getElementById('btn-home').onclick = () => switchTab('home');
  document.getElementById('btn-ai-tutor').onclick = openAITutorModal;
  document.getElementById('btn-open-ai-side').onclick = openAITutorModal;
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('btn-toggle-sidebar').onclick = () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  };
  document.getElementById('btn-mobile-menu').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
  };
  document.getElementById('btn-theme-top').onclick = () => {
    store.state.settings.theme = store.state.settings.theme === 'light' ? 'dark' : 'light';
    store.save(); updateTopbar();
  };

  // Tìm kiếm từ điển nhanh ngay trên thanh Header
  const searchInp = document.getElementById('global-dict-search');
  const drop = document.getElementById('global-search-dropdown');
  searchInp.oninput = async () => {
    const q = searchInp.value.trim().toLowerCase();
    if (!q) { drop.classList.add('hidden'); return; }
    const all = await dataLoader.getAllLoadedWords();
    const hits = all.filter((w) => w.hanzi.includes(q) || w.pinyin.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)).slice(0, 8);
    drop.classList.remove('hidden');
    drop.innerHTML = hits.length
      ? hits.map((w) => `<div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div><strong>${w.hanzi}</strong> <span style="color:var(--primary)">${w.pinyin}</span> · <span style="font-size:0.84rem">${w.meaning}</span></div>
          <button class="btn btn-outline btn-sm" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊</button>
        </div>`).join('')
      : `<div style="padding:10px;font-size:0.85rem;color:var(--text-muted)">Không tìm thấy từ "${q}"</div>`;
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dict-search-wrap')) drop.classList.add('hidden');
  });

  renderView('home');
}
boot();