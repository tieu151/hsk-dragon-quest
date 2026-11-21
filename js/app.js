import { store } from './storage/db.js';
import { dataLoader } from './data/loader.js';
import { EXAM_CONFIGS, launchExamUI } from './exam/exam-engine.js';
import {
  renderSpeakModule,
  renderVideoModule,
  renderPlacementModule,
  renderWritingModule,
  renderDictionaryModule,
  renderStatsModule,
  renderArenaModule,
  renderPublicPage,
  openReportErrorModal
} from './features/modules.js';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const levelLabel = (l) => `HSK ${l}`;
const AVATARS = ['🐼', '🐉', '🐯', '🦊', '🦁', '🐰', '🦅', '🦄'];
const PUBLIC_TABS = new Set(['home', 'about-hsk', 'privacy', 'terms', 'contact']);

let currentTab = 'home';
let ALL_WORDS = [];
let pendingAction = null;

function speakZh(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
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

function requireAuth(actionFn) {
  if (store.currentUsername) {
    actionFn();
    return;
  }
  pendingAction = actionFn;
  openAuthModal('login', true);
}

function openAuthModal(defaultMode = 'login', isGatePrompt = false) {
  const accounts = store.accounts || [];
  let selectedAvatar = '🐼';

  const onAuthSuccess = () => {
    updateTopbar();
    closeModal();
    if (pendingAction) {
      const fn = pendingAction;
      pendingAction = null;
      fn();
    } else {
      renderView(currentTab);
    }
  };

  const renderAuth = (mode) => {
    openModal(`
      ${isGatePrompt ? `
        <div style="padding:10px 12px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:0.86rem;font-weight:700;margin-bottom:10px">
          🔒 Vui lòng đăng nhập để sử dụng chức năng này (hệ thống sẽ tự mở lại đúng mục bạn vừa chọn sau khi đăng nhập).
        </div>
      ` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-right:32px">
        <h3 class="card-title" style="margin:0">🐼 Tài Khoản Panda (${accounts.length}/10 chỗ)</h3>
        ${store.currentUsername ? `<button class="btn btn-outline btn-sm" id="btn-logout-now">Đăng xuất</button>` : ''}
      </div>

      ${accounts.length > 0 ? `
        <div style="margin-bottom:14px">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);margin-bottom:6px">Tài khoản trên máy này (bấm để vào học nhanh):</div>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:150px;overflow-y:auto">
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
        <button class="btn ${mode === 'register' ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1" id="tab-mode-reg">✨ Đăng ký mới</button>
      </div>

      ${mode === 'login' ? `
        <div style="display:flex;flex-direction:column;gap:10px">
          <input type="text" id="auth-user" placeholder="Tên đăng nhập..." />
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
          <input type="text" id="reg-name" placeholder="Tên hiển thị (VD: Lê Tiêu...)" />
          <input type="text" id="reg-user" placeholder="Tên đăng nhập không dấu (VD: letieu01)" />
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
        switchTab('home');
      };
    }
    document.querySelectorAll('[data-switch-acc]').forEach((b) => {
      b.onclick = () => { store.quickSwitch(b.dataset.switchAcc); onAuthSuccess(); };
    });
    document.querySelectorAll('[data-del-acc]').forEach((b) => {
      b.onclick = () => {
        if (confirm(`Xóa vĩnh viễn tài khoản @${b.dataset.delAcc}?`)) {
          store.deleteAccount(b.dataset.delAcc);
          updateTopbar();
          renderAuth(mode);
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
        onAuthSuccess();
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
        onAuthSuccess();
      };
    }
  };

  renderAuth(defaultMode);
}

function openAITutorModal() {
  requireAuth(() => {
    openModal(`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:40px;height:40px;border-radius:12px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem">🐼</div>
        <div>
          <h3 class="card-title" style="margin:0">Sư Phụ AI Panda — Chuyên Gia Tiếng Trung</h3>
          <div style="font-size:0.78rem;color:var(--text-muted)">Từ vựng · Ngữ pháp · Dịch thuật · HSK 1–9</div>
        </div>
      </div>
      <div id="ai-chat-box" class="chat-stream">
        <div class="chat-msg ai"><strong>Sư phụ Panda:</strong> 你好！Bạn muốn hỏi gì về tiếng Trung hôm nay?</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="ai-input" placeholder="Nhập câu hỏi tiếng Trung hoặc ngữ pháp..." maxlength="600" />
        <button class="btn btn-primary" id="ai-send">Gửi</button>
      </div>
    `);

    const send = async () => {
      const inp = document.getElementById('ai-input');
      const box = document.getElementById('ai-chat-box');
      const msg = inp.value.trim();
      if (!msg) return;
      inp.value = '';
      box.innerHTML += `<div class="chat-msg user">${msg}</div>`;
      const lid = 'ai-l-' + Date.now();
      box.innerHTML += `<div id="${lid}" class="chat-msg ai">⏳ Đang phân tích...</div>`;
      box.scrollTop = box.scrollHeight;
      try {
        const res = await fetch('./api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Panda-User': store.currentUsername || 'guest'
          },
          body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        document.getElementById(lid).innerHTML = (data.reply || data.error || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      } catch {
        document.getElementById(lid).textContent = 'Lỗi kết nối máy chủ AI.';
      }
      box.scrollTop = box.scrollHeight;
    };
    document.getElementById('ai-send').onclick = send;
    document.getElementById('ai-input').onkeydown = (e) => { if (e.key === 'Enter') send(); };
  });
}

function openCreateDeckModal(onDone) {
  requireAuth(() => {
    openModal(`
      <h3 class="card-title">➕ Tạo Bộ Thẻ Từ Vựng Mới</h3>
      <p style="font-size:0.85rem;color:var(--text-muted)">Mỗi từ 1 dòng theo dạng: <strong>Chữ Hán | Pinyin | Nghĩa Việt</strong></p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
        <input type="text" id="deck-title-inp" placeholder="Tên bộ thẻ..." />
        <textarea id="deck-words-inp" rows="5" placeholder="仓库 | cāngkù | nhà kho"></textarea>
        <button class="btn btn-primary btn-block" id="btn-save-deck">💾 Lưu Bộ Thẻ</button>
      </div>
    `);
    document.getElementById('btn-save-deck').onclick = () => {
      const title = document.getElementById('deck-title-inp').value.trim();
      const raw = document.getElementById('deck-words-inp').value.trim();
      if (!title || !raw) return alert('Vui lòng nhập đầy đủ tên và từ vựng!');
      const words = raw.split(/\r?\n/).map((line, i) => {
        const [hanzi = '', pinyin = '', meaning = ''] = line.split('|').map((s) => s.trim());
        return hanzi ? { id: `custom_${Date.now()}_${i}`, level: 1, hanzi, pinyin, meaning: meaning || 'Từ tự thêm' } : null;
      }).filter(Boolean);
      store.state.customDecks.unshift({ id: Date.now(), title, words });
      store.save();
      closeModal();
      if (onDone) onDone();
    };
  });
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
          <button class="btn btn-primary btn-block" id="btn-back-tab">Tiếp tục</button>
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
            <button class="btn btn-outline btn-sm" id="btn-rep-q">🚩 Báo lỗi</button>
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
    document.getElementById('btn-rep-q').onclick = () => openReportErrorModal(`Câu hỏi từ vựng: ${target.hanzi}`, openModal, closeModal);
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
  const allWords = ALL_WORDS;
  const due = allWords.filter((w) => store.state.srs[w.hanzi] && store.state.srs[w.hanzi].streak < 3).slice(0, 12);
  const fresh = allWords.filter((w) => w.level === p.activeWorld && !store.state.srs[w.hanzi]).slice(0, 10);
  const customDecks = store.state.customDecks || [];

  if (PUBLIC_TABS.has(tab) && tab !== 'home') {
    renderPublicPage(main, tab);
    return;
  }

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
            <h1 class="hero-title">Chào mừng đến với Panda HSK, ${p.name}!</h1>
            <p class="hero-sub">Kho từ vựng <strong>${allWords.length.toLocaleString()}</strong> từ (HSK 1–9) · ${store.currentUsername ? 'Đã đồng bộ tiến độ tài khoản' : 'Chế độ Khách — Đăng nhập để mở khóa toàn bộ tính năng học tập'}</p>
          </div>
        </div>
        <div class="hero-btns">
          <button class="btn btn-primary" id="btn-hero-placement">🧭 Kiểm tra xếp lớp</button>
          <button class="btn btn-green" id="btn-hero-journey">🗺️ Vào Hành Trình</button>
          <button class="btn btn-outline" id="btn-hero-auth">👤 Tài khoản (${store.accounts.length}/10)</button>
        </div>
      </div>

      <div class="two-col-grid">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🏆 BẢNG XẾP HẠNG PANDA</h3>
              <span class="badge-pill">HSK 1 – 9</span>
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
            <h3 class="card-title">🎯 Chọn Cấp Độ Đang Luyện (HSK 1 – 9)</h3>
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
              <div style="text-align:center;padding:20px;background:var(--bg);border-radius:14px;border:1px dashed var(--border)">
                <div style="font-weight:700">Chưa có bộ thẻ cá nhân nào</div>
                <p style="font-size:0.84rem;color:var(--text-muted);margin:4px 0 10px">Tạo bộ thẻ để lưu từ vựng chuyên ngành hoặc giao tiếp của bạn</p>
                <button class="btn btn-primary btn-sm" id="btn-create-deck-empty">+ Tạo Bộ Thẻ Đầu Tiên</button>
              </div>
            ` : `
              <div class="deck-grid">
                ${customDecks.map((d) => `
                  <div class="deck-card" data-play-deck="${d.id}">
                    <div><strong>${d.title}</strong><div style="font-size:0.8rem;color:var(--text-muted)">${d.words.length} từ vựng</div></div>
                    <button class="btn btn-outline btn-sm btn-block">▶️ Học ngay</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">✨ LỘ TRÌNH 9 CẤP ĐỘ (HSK 1 – HSK 9)</h3>
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
                      <p style="font-size:0.8rem;color:var(--text-muted);margin:6px 0 0">Chia thành ${Math.max(1, Math.ceil(lvlWords.length / 50))} chương bài bản</p>
                    </div>
                    <button class="btn btn-primary btn-sm btn-block">🗺️ Học lộ trình</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-hero-placement').onclick = () => switchTab('placement');
    document.getElementById('btn-hero-journey').onclick = () => switchTab('journey');
    document.getElementById('btn-hero-auth').onclick = () => openAuthModal('login');
    document.getElementById('btn-create-deck').onclick = () => openCreateDeckModal(() => renderView('home'));
    if (document.getElementById('btn-create-deck-empty')) {
      document.getElementById('btn-create-deck-empty').onclick = () => openCreateDeckModal(() => renderView('home'));
    }
    document.getElementById('btn-quick-review').onclick = () => switchTab('review');
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
        requireAuth(() => {
          const deck = customDecks.find((d) => String(d.id) === card.dataset.playDeck);
          if (deck) startQuickQuiz(deck.words, deck.title, 'home');
        });
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
            <p class="hero-sub">Tiến độ: đã học <strong>${totalLearnedInLevel}/${levelWords.length.toLocaleString()}</strong> từ · Chia thành <strong>${totalChapters} Chương</strong></p>
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
                return `<button class="btn ${isAct ? 'btn-primary' : 'btn-outline'}" style="justify-content:space-between;width:100%" data-chap="${cIdx}">
                  <span>Chương ${cIdx + 1} (Từ ${cIdx * chapterSize + 1}–${cIdx * chapterSize + slice.length})</span>
                  <span class="badge-pill" style="${isAct ? 'color:#1e293b' : ''}">${done}/${slice.length}</span>
                </button>`;
              }).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🏯 Chương ${selectedChapter + 1} · Các Bài Học Chi Tiết</h3>
              <button class="btn btn-gold btn-sm" id="btn-test-chapter">🎯 Kiểm tra Chương ${selectedChapter + 1}</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
              ${Array.from({ length: lessonsCount }, (_, lIdx) => {
                const lw = chapterWords.slice(lIdx * 10, (lIdx + 1) * 10);
                const doneCnt = lw.filter((w) => store.state.srs[w.hanzi]).length;
                const pct = Math.round((doneCnt / Math.max(1, lw.length)) * 100);
                return `
                  <div style="padding:14px;border:1.5px solid var(--border);border-radius:14px;background:var(--bg)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                      <strong>Bài ${lIdx + 1}: ${lw.slice(0, 4).map((x) => x.hanzi).join(' · ')}...</strong>
                      <span class="badge-pill">${doneCnt}/${lw.length} từ (${pct}%)</span>
                    </div>
                    <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:10px">
                      <div style="height:100%;width:${pct}%;background:var(--green)"></div>
                    </div>
                    <div style="display:flex;gap:8px">
                      <button class="btn btn-outline btn-sm" data-preview-lesson="${lIdx}">👁️ Xem từ trước</button>
                      <button class="btn btn-primary btn-sm" data-study-lesson="${lIdx}">▶️ Vào học</button>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      `;
      document.querySelectorAll('[data-j-lvl]').forEach((b) => {
        b.onclick = () => { p.activeWorld = Number(b.dataset.jLvl); selectedChapter = 0; store.save(); updateTopbar(); renderJourney(); };
      });
      document.querySelectorAll('[data-chap]').forEach((b) => {
        b.onclick = () => { selectedChapter = Number(b.dataset.chap); renderJourney(); };
      });
      document.getElementById('btn-test-chapter').onclick = () => startQuickQuiz(chapterWords.slice(0, 15), `Kiểm tra Chương ${selectedChapter + 1}`, 'journey');
      document.querySelectorAll('[data-study-lesson]').forEach((b) => {
        b.onclick = () => {
          const i = Number(b.dataset.studyLesson);
          startQuickQuiz(chapterWords.slice(i * 10, (i + 1) * 10), `${levelLabel(p.activeWorld)} · Chương ${selectedChapter + 1} - Bài ${i + 1}`, 'journey');
        };
      });
      document.querySelectorAll('[data-preview-lesson]').forEach((b) => {
        b.onclick = () => {
          const i = Number(b.dataset.previewLesson);
          const lw = chapterWords.slice(i * 10, (i + 1) * 10);
          openModal(`
            <h3 class="card-title">📖 Danh sách từ Bài ${i + 1} (Chương ${selectedChapter + 1})</h3>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
              ${lw.map((w) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--border);border-radius:10px">
                <div><strong class="hanzi-md">${w.hanzi}</strong> <span style="color:var(--primary)">${w.pinyin}</span><div style="font-size:0.85rem;color:var(--text-muted)">${w.meaning}</div></div>
                <button class="btn btn-outline btn-sm" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊</button>
              </div>`).join('')}
            </div>
          `);
        };
      });
    };
    renderJourney();

  } else if (tab === 'practice') {
    let filterLevel = 0, statusTab = 'all', page = 1;
    const pageSize = 30;
    main.innerHTML = `
      <div class="card">
        <div class="card-header"><h2 class="card-title">📜 Sổ Từ Vựng Phân Phần (${allWords.length.toLocaleString()} từ)</h2></div>
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

      document.getElementById('vocab-summary').innerHTML = `Tìm thấy <strong>${filtered.length.toLocaleString()}</strong> từ · Trang <strong>${page}/${totalPages}</strong>`;
      document.getElementById('vocab-list').innerHTML = slice.map((w) => `
        <div class="deck-card" data-detail-word="${w.hanzi}">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="badge-pill">${levelLabel(w.level)}</span>
              <div style="display:flex;gap:4px">
                <button class="btn btn-outline btn-sm" data-say="${w.hanzi}">🔊</button>
                <button class="btn btn-outline btn-sm" data-rep-v="${w.hanzi}" title="Báo lỗi từ vựng">🚩</button>
              </div>
            </div>
            <div class="hanzi-md" style="margin-top:6px">${w.hanzi} <span style="font-size:0.9rem;color:var(--primary)">${w.pinyin}</span></div>
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
      document.querySelectorAll('[data-say]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); speakZh(b.dataset.say); }; });
      document.querySelectorAll('[data-rep-v]').forEach((b) => {
        b.onclick = (e) => { e.stopPropagation(); openReportErrorModal(`Từ vựng: ${b.dataset.repV}`, openModal, closeModal); };
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
              ${w.exZh ? `<div style="background:var(--surface-alt);padding:10px;border-radius:12px;text-align:left"><strong>${w.exZh}</strong><div style="font-size:0.84rem;color:var(--primary)">${w.exPy}</div><div style="font-size:0.84rem;color:var(--text-muted)">${w.exVi}</div></div>` : ''}
            </div>
          `);
        };
      });
    };
    document.querySelectorAll('[data-st-tab]').forEach((b) => {
      b.onclick = () => {
        statusTab = b.dataset.stTab; page = 1;
        document.querySelectorAll('[data-st-tab]').forEach((x) => { x.className = 'btn btn-outline btn-sm'; });
        b.className = 'btn btn-primary btn-sm'; renderVocab();
      };
    });
    document.getElementById('vocab-search').oninput = () => { page = 1; renderVocab(); };
    document.getElementById('vocab-level-filter').onchange = (e) => { filterLevel = Number(e.target.value); page = 1; renderVocab(); };
    renderVocab();

  } else if (tab === 'exam') {
    const history = store.state.examHistory || [];
    const draft = store.state.inProgressExam;
    main.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📋 Phòng Thi Thử Panda HSK (Tách Riêng HSK 1 – HSK 9)</h2>
          <span class="badge-pill">Cloze A–F · Đọc chia đôi · Lưu bài làm dở</span>
        </div>
        <p style="font-size:0.88rem;color:var(--text-muted)">
          Theo chuẩn <strong>HSK 3.0</strong>, HSK 7–9 là một kỳ thi chung duy nhất; tại Panda HSK, hệ thống chia tách riêng <strong>HSK 7, HSK 8 và HSK 9</strong> với số câu, thời gian và thang điểm tăng tiến để bạn luyện tập chuyên sâu.
        </p>

        ${draft ? `
          <div style="padding:12px 14px;border-radius:12px;background:var(--surface-alt);border:1.5px solid var(--primary);display:flex;justify-content:space-between;align-items:center;margin:12px 0;flex-wrap:wrap;gap:8px">
            <div><strong>📝 Bạn có bài thi đang làm dở:</strong> HSK ${draft.level} (Mã đề <code>${draft.examId}</code> · Lưu lúc ${draft.savedAt})</div>
            <button class="btn btn-primary btn-sm" id="btn-resume-draft">▶️ Tiếp tục làm bài</button>
          </div>
        ` : ''}

        <div class="deck-grid" style="margin-top:12px">
          ${LEVELS.map((l) => {
            const c = EXAM_CONFIGS[l];
            return `
              <div class="deck-card" data-start-exam="${l}">
                <div>
                  <div style="display:flex;justify-content:space-between">
                    <strong style="font-size:1.05rem;color:var(--primary)">${c.label}</strong>
                    <span class="badge-pill">${c.totalQ} câu · ${c.minutes}p</span>
                  </div>
                  <p style="font-size:0.8rem;color:var(--text-muted);margin:6px 0 0">${c.desc}</p>
                </div>
                <button class="btn btn-primary btn-sm btn-block">📝 Vào phòng thi</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${history.length ? `
        <div class="card">
          <h3 class="card-title">🏅 Bảng Điểm Các Kỳ Thi Đã Nộp (${p.name})</h3>
          <div class="rank-list">
            ${history.slice(0, 10).map((h) => `
              <div class="rank-row">
                <span><strong>HSK ${h.level}</strong> · Mã đề <code>${h.examId}</code> (${h.date})</span>
                <span style="font-weight:800;color:${h.passed ? 'var(--green)' : 'var(--primary)'}">${h.score}/${h.maxScore} điểm · ${h.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    if (document.getElementById('btn-resume-draft')) {
      document.getElementById('btn-resume-draft').onclick = () => {
        launchExamUI(main, draft.level, allWords, () => renderView('exam'), draft);
      };
    }
    document.querySelectorAll('[data-start-exam]').forEach((card) => {
      card.onclick = () => launchExamUI(main, Number(card.dataset.startExam), allWords, () => renderView('exam'));
    });

  } else if (tab === 'speak') {
    renderSpeakModule(main, allWords);
  } else if (tab === 'video') {
    renderVideoModule(main, (lvl, title) => {
      const sample = allWords.filter((w) => w.level === lvl).sort(() => Math.random() - 0.5).slice(0, 10);
      startQuickQuiz(sample, `Củng cố: ${title}`, 'video');
    }, openModal, closeModal);
  } else if (tab === 'placement') {
    renderPlacementModule(main, allWords, (recLvl) => {
      p.activeWorld = recLvl;
      store.save();
      updateTopbar();
      switchTab('journey');
    });
  } else if (tab === 'writing') {
    renderWritingModule(main, allWords);
  } else if (tab === 'dictionary') {
    renderDictionaryModule(main, allWords, openModal, closeModal);
  } else if (tab === 'stats') {
    renderStatsModule(main, allWords);
  } else if (tab === 'arena') {
    renderArenaModule(main, allWords, updateTopbar);
  } else if (tab === 'review') {
    startQuickQuiz(due.length ? due : fresh, 'Ôn tập từ vựng SRS', 'home');
  }
}

function switchTab(tab) {
  const executeSwitch = () => {
    currentTab = tab;
    document.querySelectorAll('.side-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('sidebar').classList.remove('open');
    renderView(tab);
  };

  if (PUBLIC_TABS.has(tab)) {
    executeSwitch();
  } else {
    requireAuth(executeSwitch);
  }
}

async function boot() {
  updateTopbar();
  document.querySelectorAll('.side-item').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
  document.querySelectorAll('[data-pub-link]').forEach((a) => {
    a.onclick = (e) => { e.preventDefault(); switchTab(a.dataset.pubLink); };
  });
  document.getElementById('btn-home').onclick = () => switchTab('home');
  document.getElementById('btn-ai-tutor').onclick = openAITutorModal;
  document.getElementById('btn-auth-sidebar').onclick = () => openAuthModal('login');
  document.getElementById('ui-user-badge').onclick = () => openAuthModal('login');
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('btn-toggle-sidebar').onclick = () => document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('btn-mobile-menu').onclick = () => document.getElementById('sidebar').classList.toggle('open');
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

  await dataLoader.init();
  ALL_WORDS = await dataLoader.getAllLoadedWords();
  renderView('home');

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

boot();