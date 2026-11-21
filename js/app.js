import { store } from './storage/db.js';

const LEVELS = [1, 2, 3, 4, 5, 6, 7];
const levelLabel = (l) => (l === 7 ? 'HSK 7-9' : `HSK ${l}`);
const AVATARS = ['🐼', '🐉', '🐯', '🦊', '🦁', '🐰', '🦅', '🦄'];

let currentTab = 'home';
let ALL_WORDS = [];
let examLauncher = null;

const FALLBACK_WORDS = [
  { id: 1, level: 1, hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'xin chào', pos: 'Đại từ / Chào hỏi' },
  { id: 2, level: 1, hanzi: '谢谢', pinyin: 'xièxie', meaning: 'cảm ơn', pos: 'Động từ' },
  { id: 3, level: 1, hanzi: '学习', pinyin: 'xuéxí', meaning: 'học tập', pos: 'Động từ' },
  { id: 4, level: 1, hanzi: '中国', pinyin: 'Zhōngguó', meaning: 'Trung Quốc', pos: 'Danh từ' },
  { id: 5, level: 1, hanzi: '朋友', pinyin: 'péngyou', meaning: 'bạn bè', pos: 'Danh từ' },
  { id: 6, level: 2, hanzi: '准备', pinyin: 'zhǔnbèi', meaning: 'chuẩn bị', pos: 'Động từ' },
  { id: 7, level: 2, hanzi: '开始', pinyin: 'kāishǐ', meaning: 'bắt đầu', pos: 'Động từ' },
  { id: 8, level: 3, hanzi: '完成', pinyin: 'wánchéng', meaning: 'hoàn thành', pos: 'Động từ' },
  { id: 9, level: 4, hanzi: '管理', pinyin: 'guǎnlǐ', meaning: 'quản lý', pos: 'Động từ' },
  { id: 10, level: 5, hanzi: '效率', pinyin: 'xiàolǜ', meaning: 'hiệu suất', pos: 'Danh từ' }
];

function speakZh(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  } catch {}
}

function getWordStatus(rec) {
  if (!rec) return 'Chưa học';
  if ((rec.streak || 0) >= 3) return 'Đã thuộc lòng';
  return 'Đang ôn tập';
}

function recordWord(hanzi, isCorrect) {
  const prev = store.state.srs[hanzi] || { streak: 0, reviews: 0 };
  store.state.srs[hanzi] = {
    streak: isCorrect ? prev.streak + 1 : 0,
    reviews: prev.reviews + 1,
    lastReview: new Date().toISOString().slice(0, 10)
  };
  store.save();
}

function updateTopbar() {
  const p = store.state.profile;
  const lvl = Math.floor(p.xp / 100) + 1;
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt('ui-level', `Cấp ${lvl} · ${levelLabel(p.activeWorld)}`);
  setTxt('ui-streak', `🔥 ${p.streak}`);
  setTxt('ui-coins', `🪙 ${p.coins}`);
  setTxt('ui-user-badge', `${p.avatar || '🐼'} ${p.name}`);

  const sideAuthBtn = document.getElementById('btn-auth-sidebar');
  if (sideAuthBtn) {
    sideAuthBtn.innerHTML = store.currentUsername
      ? `<span>${p.avatar || '🐼'}</span> <span class="side-txt">${p.name}</span>`
      : `<span>👤</span> <span class="side-txt">ĐĂNG NHẬP / ĐĂNG KÝ</span>`;
  }
  document.documentElement.setAttribute('data-theme', store.state.settings.theme || 'light');
}

function openModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function openAuthModal(defaultMode = 'login') {
  const accounts = store.accounts || [];
  let selectedAvatar = '🐼';

  const renderAuth = (mode) => {
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-right:32px">
        <h3 class="card-title" style="margin:0">🐼 Tài Khoản Panda (${accounts.length}/10 chỗ)</h3>
        ${store.currentUsername ? `<button class="btn btn-outline btn-sm" id="btn-logout-now">Đăng xuất</button>` : ''}
      </div>

      ${accounts.length > 0 ? `
        <div style="margin-bottom:14px">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);margin-bottom:6px">Tài khoản đã đăng ký trên máy này (bấm để chuyển nhanh):</div>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto">
            ${accounts.map((acc) => {
              const isCurrent = acc.username === store.currentUsername;
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:10px;border:1.5px solid ${isCurrent ? 'var(--primary)' : 'var(--border)'};background:var(--surface-alt)">
                  <div>
                    <strong>${acc.avatar} ${acc.displayName}</strong> <span style="font-size:0.78rem;color:var(--text-muted)">(@${acc.username})</span>
                    <div style="font-size:0.75rem;color:var(--primary)">Cấp ${acc.level || 1} · ${acc.xp || 0} XP</div>
                  </div>
                  <div style="display:flex;gap:6px">
                    ${isCurrent
                      ? `<span class="badge-pill" style="background:var(--primary);color:#fff">Đang học</span>`
                      : `<button class="btn btn-primary btn-sm" data-switch-acc="${acc.username}">Vào học</button>`}
                    <button class="btn btn-outline btn-sm" data-del-acc="${acc.username}" title="Xóa tài khoản">🗑️</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div style="display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:10px">
        <button class="btn ${mode === 'login' ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1" id="tab-mode-login">🔑 Đăng nhập</button>
        <button class="btn ${mode === 'register' ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1" id="tab-mode-reg">✨ Đăng ký tài khoản mới</button>
      </div>

      ${mode === 'login' ? `
        <div style="display:flex;flex-direction:column;gap:10px">
          <input type="text" id="auth-user" placeholder="Tên đăng nhập (ví dụ: letieu, minhanh...)" />
          <input type="password" id="auth-pass" placeholder="Mật khẩu..." />
          <div id="auth-err" style="color:#dc2626;font-size:0.82rem;font-weight:600"></div>
          <button class="btn btn-primary btn-block" id="btn-submit-login">Đăng nhập vào Panda</button>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="font-size:0.82rem;font-weight:700">Chọn biểu tượng đại diện:</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${AVATARS.map((av) => `<button type="button" class="btn btn-outline btn-sm" data-pick-av="${av}" style="font-size:1.2rem;border-color:${av === selectedAvatar ? 'var(--primary)' : 'var(--border)'}">${av}</button>`).join('')}
          </div>
          <input type="text" id="reg-name" placeholder="Tên hiển thị (VD: Lê Tiêu, Nguyễn Văn A...)" />
          <input type="text" id="reg-user" placeholder="Tên đăng nhập viết liền không dấu (VD: letieu01)" />
          <input type="password" id="reg-pass" placeholder="Mật khẩu (tối thiểu 4 ký tự)" />
          <div id="auth-err" style="color:#dc2626;font-size:0.82rem;font-weight:600"></div>
          <button class="btn btn-green btn-block" id="btn-submit-reg">🚀 Tạo tài khoản & Bắt đầu học</button>
        </div>
      `}
    `);

    document.getElementById('tab-mode-login').onclick = () => renderAuth('login');
    document.getElementById('tab-mode-reg').onclick = () => renderAuth('register');

    if (document.getElementById('btn-logout-now')) {
      document.getElementById('btn-logout-now').onclick = () => {
        store.logout();
        updateTopbar();
        closeModal();
        renderView(currentTab);
      };
    }

    document.querySelectorAll('[data-switch-acc]').forEach((b) => {
      b.onclick = () => {
        store.quickSwitch(b.dataset.switchAcc);
        updateTopbar();
        closeModal();
        renderView(currentTab);
      };
    });

    document.querySelectorAll('[data-del-acc]').forEach((b) => {
      b.onclick = () => {
        if (confirm(`Xóa vĩnh viễn tài khoản @${b.dataset.delAcc}?`)) {
          store.deleteAccount(b.dataset.delAcc);
          updateTopbar();
          renderAuth(mode);
          renderView(currentTab);
        }
      };
    });

    document.querySelectorAll('[data-pick-av]').forEach((b) => {
      b.onclick = () => {
        selectedAvatar = b.dataset.pickAv;
        document.querySelectorAll('[data-pick-av]').forEach((x) => { x.style.borderColor = 'var(--border)'; });
        b.style.borderColor = 'var(--primary)';
      };
    });

    if (document.getElementById('btn-submit-login')) {
      document.getElementById('btn-submit-login').onclick = () => {
        const res = store.login(document.getElementById('auth-user').value, document.getElementById('auth-pass').value);
        if (!res.ok) { document.getElementById('auth-err').textContent = res.error; return; }
        updateTopbar();
        closeModal();
        renderView(currentTab);
      };
    }

    if (document.getElementById('btn-submit-reg')) {
      document.getElementById('btn-submit-reg').onclick = () => {
        const res = store.register({
          displayName: document.getElementById('reg-name').value,
          username: document.getElementById('reg-user').value,
          password: document.getElementById('reg-pass').value,
          avatar: selectedAvatar
        });
        if (!res.ok) { document.getElementById('auth-err').textContent = res.error; return; }
        updateTopbar();
        closeModal();
        renderView(currentTab);
      };
    }
  };

  renderAuth(defaultMode);
}

function openAITutorModal() {
  openModal(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:40px;height:40px;border-radius:12px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem">🐼</div>
      <div>
        <h3 class="card-title" style="margin:0">Sư Phụ AI Panda — Chuyên Gia Tiếng Trung</h3>
        <div style="font-size:0.78rem;color:var(--text-muted)">Từ vựng · Ngữ pháp · Giao tiếp · Dịch thuật · HSK 1–9</div>
      </div>
    </div>
    <div id="ai-chat-box" class="chat-stream">
      <div class="chat-msg ai">
        <strong>Sư phụ Panda:</strong> 你好！(Nǐ hǎo!) Ta có thể giải đáp mọi vấn đề về tiếng Trung — từ giao tiếp thực tế, ngữ pháp, chiết tự chữ Hán, dịch thuật đến luyện thi mọi cấp độ.<br><br>
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
    box.innerHTML += `<div id="${loadingId}" class="chat-msg ai" style="color:var(--text-muted)">⏳ Panda AI đang phân tích...</div>`;
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
    <p style="font-size:0.85rem;color:var(--text-muted)">Nhập mỗi từ 1 dòng theo dạng: <strong>Chữ Hán | Pinyin | Nghĩa Việt</strong></p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <input type="text" id="deck-title-inp" placeholder="Tên bộ thẻ (VD: Từ vựng công xưởng, Giao tiếp hàng ngày...)" />
      <textarea id="deck-words-inp" rows="5" placeholder="仓库 | cāngkù | nhà kho"></textarea>
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

function startQuickQuiz(words, title = 'Luyện tập từ vựng', returnTab = 'home') {
  if (!words || !words.length) return alert('Chưa có từ vựng trong mục này!');
  let idx = 0, score = 0;

  const renderQ = () => {
    if (idx >= words.length) {
      store.state.profile.xp += score * 15;
      store.state.profile.coins += score * 3;
      store.state.profile.lastStudyDate = new Date().toISOString().slice(0, 10);
      store.save();
      updateTopbar();
      document.getElementById('main-view').innerHTML = `
        <div class="card" style="text-align:center;max-width:520px;margin:0 auto">
          <h2>🎉 Hoàn thành: ${title}!</h2>
          <p>Đúng <strong>${score}/${words.length}</strong> câu · Nhận <strong>+${score * 15} XP</strong> & <strong>+${score * 3} 🪙</strong></p>
          <button class="btn btn-primary btn-block" id="btn-back-tab">Tiếp tục hành trình</button>
        </div>`;
      document.getElementById('btn-back-tab').onclick = () => switchTab(returnTab);
      return;
    }
    const target = words[idx];
    const distractors = ALL_WORDS.filter((w) => w.hanzi !== target.hanzi).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);
    speakZh(target.hanzi);

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
    document.getElementById('btn-replay').onclick = () => speakZh(target.hanzi);
    document.querySelectorAll('.option-btn').forEach((btn) => {
      btn.onclick = () => {
        const isOk = btn.dataset.hanzi === target.hanzi;
        recordWord(target.hanzi, isOk);
        if (isOk) { score++; btn.classList.add('correct'); }
        else { btn.classList.add('wrong'); }
        setTimeout(() => { idx++; renderQ(); }, 550);
      };
    });
  };
  renderQ();
}

function renderView(tab) {
  const main = document.getElementById('main-view');
  const p = store.state.profile;
  const allWords = ALL_WORDS.length ? ALL_WORDS : FALLBACK_WORDS;
  const due = allWords.filter((w) => store.state.srs[w.hanzi] && store.state.srs[w.hanzi].streak < 3).slice(0, 12);
  const fresh = allWords.filter((w) => w.level === p.activeWorld && !store.state.srs[w.hanzi]).slice(0, 10);
  const customDecks = store.state.customDecks || [];

  if (tab === 'home') {
    const realPlayers = (store.accounts || []).map((a) => ({
      name: `${a.displayName} (@${a.username})`,
      avatar: a.avatar || '🐼',
      lv: a.level || 1,
      xp: a.xp || 0,
      isReal: true
    }));
    const demoPlayers = [
      { name: 'Minh Anh', avatar: '🐯', lv: 24, xp: 2810, isReal: false },
      { name: 'Thảo Nhi', avatar: '🦊', lv: 17, xp: 2090, isReal: false },
      { name: 'Hoàng Nam', avatar: '🐰', lv: 15, xp: 1950, isReal: false }
    ];
    const leaderboard = [...realPlayers, ...demoPlayers].sort((a, b) => b.xp - a.xp).slice(0, 6);

    main.innerHTML = `
      <div class="page-hero">
        <div class="hero-left">
          <div class="mascot-avatar">${p.avatar || '🐼'}</div>
          <div>
            <h1 class="hero-title">Chào mừng đến với Panda, ${p.name}!</h1>
            <p class="hero-sub">Kho từ vựng <strong>${allWords.length.toLocaleString()}</strong> từ (HSK 1–9) · ${store.currentUsername ? 'Đã đồng bộ tiến độ tài khoản' : 'Chế độ Khách (nên đăng ký tài khoản để lưu tiến độ riêng)'}</p>
          </div>
        </div>
        <div class="hero-btns">
          <button class="btn btn-primary" id="btn-hero-journey">🗺️ Vào Hành Trình</button>
          <button class="btn btn-green" id="btn-hero-vocab">📜 Mở Sổ Từ</button>
          <button class="btn btn-outline" id="btn-hero-auth">👤 Tài khoản (${store.accounts.length}/10)</button>
        </div>
      </div>

      <div class="two-col-grid">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🏆 BẢNG XẾP HẠNG PANDA</h3>
              <span class="badge-pill">Tháng 11/2026</span>
            </div>
            <div class="podium-row">
              <div class="podium-item"><div class="podium-circle">🥇</div><span>#1</span></div>
              <div class="podium-item"><div class="podium-circle">🥈</div><span>#2</span></div>
              <div class="podium-item"><div class="podium-circle">🥉</div><span>#3</span></div>
              <div class="podium-item"><div class="podium-circle">${p.avatar || '🐼'}</div><span>Bạn</span></div>
            </div>
            <div class="rank-list">
              ${leaderboard.map((u, idx) => `
                <div class="rank-row" style="${u.isReal ? 'border:1px solid var(--primary);' : ''}">
                  <span><strong>#${idx + 1}</strong> ${u.avatar} ${u.name} · Lv.${u.lv}</span>
                  <span class="rank-badge">${u.xp} XP</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card">
            <h3 class="card-title">🎯 Chọn Cấp Độ Đang Luyện</h3>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">
              ${LEVELS.map((l) => `<button class="btn ${p.activeWorld === l ? 'btn-primary' : 'btn-outline'} btn-sm" data-set-world="${l}">${levelLabel(l)}</button>`).join('')}
            </div>
          </div>
        </div>

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
                <p style="font-size:0.84rem;color:var(--text-muted);margin:4px 0 12px">Tạo bộ thẻ đầu tiên để lưu từ vựng chuyên ngành hoặc giao tiếp của riêng bạn</p>
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
              <h3 class="card-title">✨ LỘ TRÌNH CÁC CẤP ĐỘ (HSK 1 – HSK 9)</h3>
              <button class="btn btn-gold btn-sm" id="btn-quick-review">🔁 Ôn tập (${due.length})</button>
            </div>
            <div class="deck-grid">
              ${LEVELS.map((l) => {
                const lvlWords = allWords.filter((w) => w.level === l);
                const learnedCnt = lvlWords.filter((w) => store.state.srs[w.hanzi]).length;
                return `
                  <div class="deck-card" data-open-journey="${l}">
                    <div>
                      <div style="display:flex;justify-content:space-between;align-items:center">
                        <strong style="color:var(--primary)">${levelLabel(l)}</strong>
                        <span class="badge-pill">${learnedCnt}/${lvlWords.length} từ</span>
                      </div>
                      <p style="font-size:0.8rem;color:var(--text-muted);margin:6px 0 0">Chia thành ${Math.max(1, Math.ceil(lvlWords.length / 50))} chương học bài bản</p>
                    </div>
                    <button class="btn btn-primary btn-sm btn-block">🗺️ Học theo lộ trình</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-hero-journey').onclick = () => switchTab('journey');
    document.getElementById('btn-hero-vocab').onclick = () => switchTab('practice');
    document.getElementById('btn-hero-auth').onclick = () => openAuthModal('login');
    document.getElementById('btn-create-deck').onclick = () => openCreateDeckModal(() => renderView('home'));
    if (document.getElementById('btn-create-deck-empty')) {
      document.getElementById('btn-create-deck-empty').onclick = () => openCreateDeckModal(() => renderView('home'));
    }
    document.getElementById('btn-quick-review').onclick = () => startQuickQuiz(due.length ? due : fresh, 'Ôn tập SRS', 'home');
    document.querySelectorAll('[data-set-world]').forEach((b) => {
      b.onclick = () => { p.activeWorld = Number(b.dataset.setWorld); store.save(); updateTopbar(); renderView('home'); };
    });
    document.querySelectorAll('[data-open-journey]').forEach((card) => {
      card.onclick = () => {
        p.activeWorld = Number(card.dataset.openJourney);
        store.save();
        updateTopbar();
        switchTab('journey');
      };
    });
    document.querySelectorAll('[data-play-deck]').forEach((card) => {
      card.onclick = () => {
        const deck = customDecks.find((d) => String(d.id) === card.dataset.playDeck);
        if (deck) startQuickQuiz(deck.words, deck.title, 'home');
      };
    });

  } else if (tab === 'journey') {
    let selectedChapter = 0;

    const renderJourney = () => {
      const levelWords = allWords.filter((w) => w.level === p.activeWorld);
      const chapterSize = 50;
      const totalChapters = Math.max(1, Math.ceil(levelWords.length / chapterSize));
      if (selectedChapter >= totalChapters) selectedChapter = 0;

      const chapterWords = levelWords.slice(selectedChapter * chapterSize, (selectedChapter + 1) * chapterSize);
      const lessonsCount = Math.max(1, Math.ceil(chapterWords.length / 10));
      const totalLearnedInLevel = levelWords.filter((w) => store.state.srs[w.hanzi]).length;

      main.innerHTML = `
        <div class="page-hero">
          <div>
            <h1 class="hero-title">🗺️ Hành Trình Chinh Phục ${levelLabel(p.activeWorld)}</h1>
            <p class="hero-sub">Tiến độ cấp độ: đã học <strong>${totalLearnedInLevel}/${levelWords.length.toLocaleString()}</strong> từ · Chia thành <strong>${totalChapters} Chương</strong> bài bản</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${LEVELS.map((l) => `<button class="btn ${p.activeWorld === l ? 'btn-primary' : 'btn-outline'} btn-sm" data-j-lvl="${l}">${levelLabel(l)}</button>`).join('')}
          </div>
        </div>

        <div class="two-col-grid">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:10px">📚 Danh Sách Chương (${totalChapters} chương)</h3>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:62dvh;overflow-y:auto">
              ${Array.from({ length: totalChapters }, (_, cIdx) => {
                const slice = levelWords.slice(cIdx * chapterSize, (cIdx + 1) * chapterSize);
                const done = slice.filter((w) => store.state.srs[w.hanzi]).length;
                const isAct = cIdx === selectedChapter;
                return `
                  <button class="btn ${isAct ? 'btn-primary' : 'btn-outline'}" style="justify-content:space-between;width:100%" data-chap="${cIdx}">
                    <span>Chương ${cIdx + 1} (Từ ${cIdx * chapterSize + 1}–${cIdx * chapterSize + slice.length})</span>
                    <span class="badge-pill" style="${isAct ? 'color:#1e293b' : ''}">${done}/${slice.length}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🏯 Chương ${selectedChapter + 1} · Các Bài Học Chi Tiết</h3>
              <button class="btn btn-gold btn-sm" id="btn-test-chapter">🎯 Kiểm tra tổng hợp Chương ${selectedChapter + 1}</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
              ${Array.from({ length: lessonsCount }, (_, lIdx) => {
                const lessonWords = chapterWords.slice(lIdx * 10, (lIdx + 1) * 10);
                const doneCnt = lessonWords.filter((w) => store.state.srs[w.hanzi]).length;
                const pct = Math.round((doneCnt / Math.max(1, lessonWords.length)) * 100);
                return `
                  <div style="padding:14px;border:1.5px solid var(--border);border-radius:14px;background:var(--bg)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                      <strong>Bài ${lIdx + 1}: ${lessonWords.slice(0, 4).map((x) => x.hanzi).join(' · ')}...</strong>
                      <span class="badge-pill">${doneCnt}/${lessonWords.length} từ (${pct}%)</span>
                    </div>
                    <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:10px">
                      <div style="height:100%;width:${pct}%;background:var(--green)"></div>
                    </div>
                    <div style="display:flex;gap:8px">
                      <button class="btn btn-outline btn-sm" data-preview-lesson="${lIdx}">👁️ Xem ${lessonWords.length} từ trước</button>
                      <button class="btn btn-primary btn-sm" data-study-lesson="${lIdx}">▶️ Vào học & Luyện tập</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      document.querySelectorAll('[data-j-lvl]').forEach((b) => {
        b.onclick = () => {
          p.activeWorld = Number(b.dataset.jLvl);
          selectedChapter = 0;
          store.save();
          updateTopbar();
          renderJourney();
        };
      });
      document.querySelectorAll('[data-chap]').forEach((b) => {
        b.onclick = () => { selectedChapter = Number(b.dataset.chap); renderJourney(); };
      });
      document.getElementById('btn-test-chapter').onclick = () => {
        startQuickQuiz(chapterWords.slice(0, 15), `Kiểm tra Chương ${selectedChapter + 1} (${levelLabel(p.activeWorld)})`, 'journey');
      };
      document.querySelectorAll('[data-study-lesson]').forEach((b) => {
        b.onclick = () => {
          const i = Number(b.dataset.studyLesson);
          const lw = chapterWords.slice(i * 10, (i + 1) * 10);
          startQuickQuiz(lw, `${levelLabel(p.activeWorld)} · Chương ${selectedChapter + 1} - Bài ${i + 1}`, 'journey');
        };
      });
      document.querySelectorAll('[data-preview-lesson]').forEach((b) => {
        b.onclick = () => {
          const i = Number(b.dataset.previewLesson);
          const lw = chapterWords.slice(i * 10, (i + 1) * 10);
          openModal(`
            <h3 class="card-title">📖 Danh sách từ Bài ${i + 1} (Chương ${selectedChapter + 1})</h3>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
              ${lw.map((w) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--border);border-radius:10px">
                  <div>
                    <strong class="hanzi-md">${w.hanzi}</strong> <span style="color:var(--primary);font-weight:700">${w.pinyin}</span>
                    <div style="font-size:0.85rem;color:var(--text-muted)">${w.meaning}</div>
                  </div>
                  <button class="btn btn-outline btn-sm" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊</button>
                </div>
              `).join('')}
            </div>
          `);
        };
      });
    };

    renderJourney();

  } else if (tab === 'practice') {
    let filterLevel = 0;
    let statusTab = 'all';
    let page = 1;
    const pageSize = 30;

    main.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📜 Sổ Từ Vựng Phân Phần Thông Minh (${allWords.length.toLocaleString()} từ)</h2>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <button class="btn btn-primary btn-sm" data-st-tab="all">📚 Tất cả từ</button>
          <button class="btn btn-outline btn-sm" data-st-tab="unlearned">🆕 Chưa học</button>
          <button class="btn btn-outline btn-sm" data-st-tab="learning">🔁 Đang ôn tập</button>
          <button class="btn btn-outline btn-sm" data-st-tab="mastered">✅ Đã thuộc lòng</button>
        </div>

        <div style="display:flex;gap:10px;margin-bottom:14px">
          <input type="search" id="vocab-search" placeholder="Tìm chữ Hán, pinyin hoặc nghĩa tiếng Việt..." />
          <select id="vocab-level-filter" style="width:160px;flex-shrink:0">
            <option value="0">Tất cả cấp (HSK 1–9)</option>
            ${LEVELS.map((l) => `<option value="${l}">${levelLabel(l)}</option>`).join('')}
          </select>
        </div>

        <div id="vocab-summary" style="font-size:0.84rem;color:var(--text-muted);margin-bottom:10px"></div>
        <div id="vocab-list" class="deck-grid"></div>
        <div id="vocab-pagination" style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px"></div>
      </div>
    `;

    const renderVocab = () => {
      const k = document.getElementById('vocab-search').value.trim().toLowerCase();
      const filtered = allWords.filter((w) => {
        if (filterLevel && w.level !== filterLevel) return false;
        const rec = store.state.srs[w.hanzi];
        if (statusTab === 'unlearned' && rec) return false;
        if (statusTab === 'learning' && (!rec || rec.streak >= 3)) return false;
        if (statusTab === 'mastered' && (!rec || rec.streak < 3)) return false;
        return !k || w.hanzi.includes(k) || w.pinyin.toLowerCase().includes(k) || w.meaning.toLowerCase().includes(k);
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (page > totalPages) page = 1;
      const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

      document.getElementById('vocab-summary').innerHTML = `Tìm thấy <strong>${filtered.length.toLocaleString()}</strong> từ phù hợp · Trang <strong>${page}/${totalPages}</strong>`;

      document.getElementById('vocab-list').innerHTML = slice.map((w) => `
        <div class="deck-card" data-detail-word="${w.hanzi}">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="badge-pill">${levelLabel(w.level)}</span>
              <button class="btn btn-outline btn-sm" data-say="${w.hanzi}">🔊</button>
            </div>
            <div class="hanzi-md" style="margin-top:6px">${w.hanzi} <span style="font-size:0.9rem;color:var(--primary);font-family:inherit">${w.pinyin}</span></div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">${w.meaning}</div>
          </div>
          <span class="badge-pill" style="align-self:flex-start">${getWordStatus(store.state.srs[w.hanzi])}</span>
        </div>
      `).join('');

      document.getElementById('vocab-pagination').innerHTML = `
        <button class="btn btn-outline btn-sm" id="btn-v-prev" ${page <= 1 ? 'disabled' : ''}>⬅️ Trang trước</button>
        <span style="font-size:0.85rem;font-weight:700">Trang ${page} / ${totalPages}</span>
        <button class="btn btn-outline btn-sm" id="btn-v-next" ${page >= totalPages ? 'disabled' : ''}>Trang sau ➡️</button>
      `;

      document.getElementById('btn-v-prev').onclick = () => { page--; renderVocab(); };
      document.getElementById('btn-v-next').onclick = () => { page++; renderVocab(); };

      document.querySelectorAll('[data-say]').forEach((b) => {
        b.onclick = (e) => { e.stopPropagation(); speakZh(b.dataset.say); };
      });
      document.querySelectorAll('[data-detail-word]').forEach((card) => {
        card.onclick = () => {
          const w = allWords.find((x) => x.hanzi === card.dataset.detailWord);
          if (!w) return;
          speakZh(w.hanzi);
          openModal(`
            <div style="text-align:center">
              <span class="badge-pill">${levelLabel(w.level)} · ${w.pos || 'Từ vựng'}</span>
              <div class="hanzi-xl" style="margin:12px 0 4px">${w.hanzi}</div>
              <div style="font-size:1.2rem;color:var(--primary);font-weight:800">${w.pinyin}</div>
              <p style="font-size:1.05rem;font-weight:700;margin:10px 0">${w.meaning}</p>
              ${w.exZh ? `<div style="background:var(--surface-alt);padding:10px;border-radius:12px;text-align:left;margin-top:10px">
                <div style="font-weight:700">${w.exZh}</div>
                <div style="font-size:0.84rem;color:var(--primary)">${w.exPy}</div>
                <div style="font-size:0.84rem;color:var(--text-muted)">${w.exVi}</div>
              </div>` : ''}
              <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊 Nghe phát âm chuẩn</button>
            </div>
          `);
        };
      });
    };

    document.querySelectorAll('[data-st-tab]').forEach((b) => {
      b.onclick = () => {
        statusTab = b.dataset.stTab;
        page = 1;
        document.querySelectorAll('[data-st-tab]').forEach((x) => { x.className = 'btn btn-outline btn-sm'; });
        b.className = 'btn btn-primary btn-sm';
        renderVocab();
      };
    });
    document.getElementById('vocab-search').oninput = () => { page = 1; renderVocab(); };
    document.getElementById('vocab-level-filter').onchange = (e) => { filterLevel = Number(e.target.value); page = 1; renderVocab(); };
    renderVocab();

  } else if (tab === 'exam') {
    const history = store.state.examHistory || [];
    main.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📋 Phòng Thi Thử Panda HSK Chuẩn Quốc Tế (HSK 1 – 9)</h2>
          <span class="badge-pill">Đề thi sát cấu trúc thật · Sinh đề mới 100%</span>
        </div>
        <p style="font-size:0.9rem;color:var(--text-muted)">Mỗi bài thi mô phỏng đầy đủ <strong>Nghe hiểu – Đọc hiểu – Viết (có Sư Phụ Panda AI chấm điểm trực tiếp)</strong> và bấm giờ chuẩn quốc tế:</p>
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
          <h3 class="card-title">🏅 Bảng Điểm Các Kỳ Thi Đã Hoàn Thành (${p.name})</h3>
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
      card.onclick = () => {
        const lvl = Number(card.dataset.startExam);
        if (examLauncher) examLauncher(main, lvl, allWords, () => renderView('exam'));
        else startQuickQuiz(allWords.filter((w) => w.level === lvl).slice(0, 15), `Thi thử ${levelLabel(lvl)}`, 'exam');
      };
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
    document.getElementById('btn-go-mode').onclick = () => startQuickQuiz(sample, titles[tab], tab);
  } else if (tab === 'grammar' || tab === 'story') {
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">${tab === 'grammar' ? '🎓 Cẩm Nang Ngữ Pháp & Sư Phụ Panda AI' : '📚 Truyện Đọc Song Ngữ Panda'}</h2>
        <p style="font-size:0.92rem">Bạn có thể hỏi trực tiếp <strong>Sư Phụ Panda AI</strong> bất kỳ cấu trúc ngữ pháp nào hoặc yêu cầu tạo một đoạn truyện ngắn song ngữ Trung – Việt theo trình độ của bạn.</p>
        <button class="btn btn-primary" id="btn-ask-ai-now">🐼 Mở Sư Phụ Panda AI Ngay</button>
      </div>`;
    document.getElementById('btn-ask-ai-now').onclick = openAITutorModal;
  } else if (tab === 'review') {
    startQuickQuiz(due.length ? due : fresh, 'Ôn tập từ vựng SRS', 'home');
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.side-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('sidebar').classList.remove('open');
  renderView(tab);
}

async function boot() {
  // 1. Gắn sự kiện cho toàn bộ nút bấm & thanh điều hướng NGAY LẬP TỨC
  updateTopbar();
  document.querySelectorAll('.side-item').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
  document.getElementById('btn-home').onclick = () => switchTab('home');
  document.getElementById('btn-ai-tutor').onclick = openAITutorModal;
  document.getElementById('btn-auth-sidebar').onclick = () => openAuthModal('login');
  document.getElementById('ui-user-badge').onclick = () => openAuthModal('login');
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

  const searchInp = document.getElementById('global-dict-search');
  const drop = document.getElementById('global-search-dropdown');
  searchInp.oninput = () => {
    const q = searchInp.value.trim().toLowerCase();
    if (!q) { drop.classList.add('hidden'); return; }
    const hits = ALL_WORDS.filter((w) => w.hanzi.includes(q) || w.pinyin.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)).slice(0, 8);
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

  // 2. Hiển thị ngay giao diện chính để không bao giờ bị treo màn hình chờ
  ALL_WORDS = [...FALLBACK_WORDS];
  renderView('home');

  // 3. Nạp kho từ vựng lớn & module phòng thi ở chế độ nền
  try {
    const modLoader = await import('./data/loader.js');
    await modLoader.dataLoader.init();
    const loaded = await modLoader.dataLoader.getAllLoadedWords();
    if (loaded && loaded.length) {
      ALL_WORDS = loaded;
      renderView(currentTab);
    }
  } catch (err) {
    console.warn('Dùng bộ từ vựng dự phòng:', err);
  }

  try {
    const modExam = await import('./exam/exam-engine.js');
    examLauncher = modExam.launchExamUI;
  } catch {}

  try {
    const res = await fetch('./api/chat', { method: 'GET' });
    const data = await res.json();
    const btn = document.getElementById('btn-ai-tutor');
    if (btn) btn.classList.toggle('hidden', !data.enabled);
  } catch {}

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();