import { store } from './storage/db.js';
import { dataLoader } from './data/loader.js';
import { EXAM_CONFIGS, launchExamUI } from './exam/exam-engine.js';
import {
  getSupabase, authRegister, authLogin, authChangePassword, authLogout,
  fetchLeaderboard, exportUserCloudData, deleteAccountOnServer
} from './services/supabase-client.js';
import {
  renderSpeakModule, renderVideoModule, renderPlacementModule, renderWritingModule,
  renderDictionaryModule, renderStatsModule, renderArenaModule, renderPublicPage, openReportErrorModal
} from './features/modules.js';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const levelLabel = (l) => `HSK ${l}`;
const AVATARS = ['🐼', '🐉', '🐯', '🦊', '🦁', '🐰', '🦅', '🦄'];
const PUBLIC_TABS = new Set(['home', 'about-hsk', 'privacy', 'terms', 'contact']);

let currentTab = 'home';
let ALL_WORDS = [];
let pendingAction = null;
let cloudLeaderboard = [];

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
  return (rec.streak || 0) >= 3 ? 'Đã thuộc lòng' : 'Đang ôn tập';
}

function recordWord(hanzi, isCorrect) {
  const prev = store.state.srs[hanzi] || { streak: 0, reviews: 0 };
  store.state.srs[hanzi] = { streak: isCorrect ? prev.streak + 1 : 0, reviews: prev.reviews + 1, lastReview: new Date().toISOString().slice(0, 10) };
  store.dirtyWords.add(hanzi);
  store.save();
}

function renderSyncBadge(status) {
  const el = document.getElementById('ui-sync-status');
  if (!el) return;
  if (!store.user) { el.textContent = '☁️ Chế độ Khách'; el.style.color = 'var(--text-muted)'; return; }
  const map = {
    idle: ['☁️ Sẵn sàng', 'var(--text-muted)'],
    syncing: ['🔄 Đang đồng bộ...', '#d97706'],
    saved: ['☁️ Đã lưu', '#16a34a'],
    offline: ['📴 Lưu tạm (Offline)', '#d97706'],
    error: ['⚠️ Lỗi đồng bộ', '#dc2626']
  };
  const [label, color] = map[status] || map.idle;
  el.textContent = label;
  el.style.color = color;
}

function updateTopbar() {
  const p = store.state.profile;
  const lvl = Math.floor(p.xp / 100) + 1;
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt('ui-level', `Cấp ${lvl} · ${levelLabel(p.activeWorld)}`);
  setTxt('ui-streak', `🔥 ${p.streak}`);
  setTxt('ui-coins', `🪙 ${p.coins}`);
  setTxt('ui-user-badge', store.user ? `${p.avatar || '🐼'} ${p.name}` : '🐼 Khách');
  const sideAuthBtn = document.getElementById('btn-auth-sidebar');
  if (sideAuthBtn) {
    sideAuthBtn.innerHTML = store.user
      ? `<span>${p.avatar || '🐼'}</span> <span class="side-txt">${p.name}</span>`
      : `<span>👤</span> <span class="side-txt">ĐĂNG NHẬP / ĐĂNG KÝ</span>`;
  }
  renderSyncBadge(store.syncStatus);
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
  if (store.user) { actionFn(); return; }
  pendingAction = actionFn;
  openAuthModal('login', true);
}

async function checkLegacyMigrationPrompt() {
  const legacyList = store.detectLegacyLocalData();
  if (!legacyList || !legacyList.length) return;
  if (legacyList.length === 1 && store.state.profile.xp === 0 && Object.keys(store.state.srs).length === 0) {
    const res = await store.migrateLegacyState(legacyList[0].state);
    if (res.ok) { updateTopbar(); renderView(currentTab); }
    return;
  }
  openModal(`
    <h3 class="card-title">📦 Tìm thấy dữ liệu học tập cũ trên máy này</h3>
    <p style="font-size:0.88rem;color:var(--text-muted);margin:8px 0">Gộp tiến độ cũ vào tài khoản <strong>@${store.currentUsername}</strong>?</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">
      ${legacyList.map((item, idx) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px">
          <div><strong>${item.displayName}</strong> (@${item.username}) · ${item.wordCount} từ · ${item.xp} XP</div>
          <button class="btn btn-primary btn-sm" data-mig-idx="${idx}">Gộp ngay</button>
        </div>`).join('')}
    </div>
    <button class="btn btn-outline btn-block btn-sm" id="btn-skip-mig">Bỏ qua</button>
  `);
  document.querySelectorAll('[data-mig-idx]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      const res = await store.migrateLegacyState(legacyList[Number(b.dataset.migIdx)].state);
      closeModal();
      if (res.ok) { updateTopbar(); renderView(currentTab); alert('Đã gộp dữ liệu cũ lên tài khoản!'); }
    };
  });
  document.getElementById('btn-skip-mig').onclick = () => { store.markLegacySkipped(); closeModal(); };
}

function openProfileAccountModal() {
  const p = store.state.profile;
  openModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-right:30px">
      <div>
        <h3 class="card-title" style="margin:0">${p.avatar || '🐼'} Hồ Sơ & Dữ Liệu Đám Mây</h3>
        <div style="font-size:0.8rem;color:var(--text-muted)">Tên đăng nhập: <strong>@${store.currentUsername}</strong></div>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-logout-now">Đăng xuất</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-alt);margin-bottom:12px">
      <div style="font-weight:700;font-size:0.88rem">✏️ Thông tin hiển thị & Bảng xếp hạng</div>
      <input type="text" id="prof-display-name" value="${p.name}" placeholder="Tên hiển thị..." />
      <label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;cursor:pointer">
        <input type="checkbox" id="prof-hide-lb" ${p.hideOnLeaderboard ? 'checked' : ''} style="width:auto" />
        Ẩn tên và điểm trên Bảng xếp hạng công khai
      </label>
      <button class="btn btn-primary btn-sm" id="btn-save-prof">💾 Lưu thay đổi hồ sơ</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:12px">
      <div style="font-weight:700;font-size:0.88rem">🔑 Đổi mật khẩu</div>
      <div style="display:flex;gap:8px">
        <input type="password" id="prof-new-pass" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" />
        <button class="btn btn-outline btn-sm" id="btn-change-pass" style="flex-shrink:0">Cập nhật</button>
      </div>
      <div id="prof-pass-msg" style="font-size:0.8rem"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <button class="btn btn-green btn-sm" style="flex:1" id="btn-export-data">📥 Xuất dữ liệu (JSON)</button>
      <button class="btn btn-outline btn-sm" style="flex:1;color:#dc2626;border-color:#fecaca" id="btn-toggle-del">🗑️ Xóa vĩnh viễn tài khoản</button>
    </div>
    <div id="del-account-box" class="hidden" style="padding:12px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca">
      <div style="font-size:0.82rem;color:#b91c1c;font-weight:700;margin-bottom:8px">⚠️ Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu học tập, không thể khôi phục!</div>
      <div style="display:flex;gap:8px">
        <input type="password" id="del-confirm-pass" placeholder="Nhập mật khẩu hiện tại..." />
        <button class="btn btn-primary btn-sm" id="btn-confirm-del" style="background:#dc2626;flex-shrink:0">Xác nhận xóa</button>
      </div>
      <div id="del-err-msg" style="font-size:0.8rem;color:#dc2626;margin-top:6px"></div>
    </div>
  `);

  document.getElementById('btn-logout-now').onclick = async () => {
    await authLogout(); await store.bindUser(null); updateTopbar(); closeModal(); switchTab('home');
  };
  document.getElementById('btn-save-prof').onclick = async () => {
    const newName = document.getElementById('prof-display-name').value.trim();
    if (newName) store.state.profile.name = newName;
    store.state.profile.hideOnLeaderboard = document.getElementById('prof-hide-lb').checked;
    store.save(); await store.flushToCloud(); updateTopbar();
    cloudLeaderboard = await fetchLeaderboard(); renderView(currentTab);
    alert('Đã lưu thông tin hồ sơ!');
  };
  document.getElementById('btn-change-pass').onclick = async () => {
    const res = await authChangePassword(document.getElementById('prof-new-pass').value);
    const msgEl = document.getElementById('prof-pass-msg');
    msgEl.style.color = res.ok ? '#16a34a' : '#dc2626';
    msgEl.textContent = res.ok ? '✅ Đã đổi mật khẩu thành công!' : res.error;
  };
  document.getElementById('btn-export-data').onclick = async () => {
    const res = await exportUserCloudData();
    if (!res.ok) return alert(res.error);
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `panda-hsk-${store.currentUsername}.json`;
    a.click();
  };
  document.getElementById('btn-toggle-del').onclick = () => document.getElementById('del-account-box').classList.toggle('hidden');
  document.getElementById('btn-confirm-del').onclick = async () => {
    const uid = store.user?.id;
    const res = await deleteAccountOnServer(document.getElementById('del-confirm-pass').value);
    if (!res.ok) { document.getElementById('del-err-msg').textContent = res.error; return; }
    store.clearUserLocalCache(uid); await store.bindUser(null); updateTopbar(); closeModal(); switchTab('home');
    alert('Tài khoản đã được xóa vĩnh viễn.');
  };
}

function openAuthModal(defaultMode = 'login', isGatePrompt = false) {
  if (store.user) { openProfileAccountModal(); return; }
  let selectedAvatar = '🐼';

  const onAuthSuccess = async (user) => {
    await store.bindUser(user);
    updateTopbar(); closeModal();
    cloudLeaderboard = await fetchLeaderboard();
    await checkLegacyMigrationPrompt();
    if (pendingAction) { const fn = pendingAction; pendingAction = null; fn(); }
    else renderView(currentTab);
  };

  const renderAuth = (mode) => {
    openModal(`
      ${isGatePrompt ? `<div style="padding:10px 12px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:0.85rem;font-weight:700;margin-bottom:10px">🔒 Vui lòng đăng nhập để học và lưu tiến độ vĩnh viễn.</div>` : ''}
      <h3 class="card-title" style="margin-bottom:10px">🐼 Tài Khoản Panda HSK</h3>
      <div style="display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:10px">
        <button class="btn ${mode === 'login' ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1" id="tab-mode-login">🔑 Đăng nhập</button>
        <button class="btn ${mode === 'register' ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1" id="tab-mode-reg">✨ Tạo tài khoản mới</button>
      </div>
      ${mode === 'login' ? `
        <div style="display:flex;flex-direction:column;gap:10px">
          <input type="text" id="auth-user" placeholder="Tên đăng nhập (VD: letieu01)" autocomplete="username" />
          <div style="position:relative;display:flex;align-items:center">
            <input type="password" id="auth-pass" placeholder="Mật khẩu..." autocomplete="current-password" style="padding-right:42px" />
            <button type="button" id="toggle-pass-vis" style="position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:1rem">👁️</button>
          </div>
          <div id="auth-err" style="color:#dc2626;font-size:0.82rem;font-weight:600"></div>
          <button class="btn btn-primary btn-block" id="btn-submit-login">Đăng nhập vào Panda HSK</button>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="font-size:0.82rem;font-weight:700">Chọn biểu tượng đại diện:</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${AVATARS.map((av) => `<button type="button" class="btn btn-outline btn-sm" data-pick-av="${av}" style="font-size:1.2rem;border-color:${av === selectedAvatar ? 'var(--primary)' : 'var(--border)'}">${av}</button>`).join('')}
          </div>
          <input type="text" id="reg-name" placeholder="Tên hiển thị (VD: Lê Tiêu)" />
          <input type="text" id="reg-user" placeholder="Tên đăng nhập không dấu (VD: letieu01)" autocomplete="username" />
          <div style="position:relative;display:flex;align-items:center">
            <input type="password" id="reg-pass" placeholder="Mật khẩu (tối thiểu 6 ký tự)" autocomplete="new-password" style="padding-right:42px" />
            <button type="button" id="toggle-pass-vis" style="position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:1rem">👁️</button>
          </div>
          <input type="password" id="reg-pass2" placeholder="Nhập lại mật khẩu..." autocomplete="new-password" />
          <div id="auth-err" style="color:#dc2626;font-size:0.82rem;font-weight:600"></div>
          <button class="btn btn-green btn-block" id="btn-submit-reg">🚀 Tạo tài khoản & Vào học ngay</button>
        </div>
      `}
    `);

    document.getElementById('tab-mode-login').onclick = () => renderAuth('login');
    document.getElementById('tab-mode-reg').onclick = () => renderAuth('register');
    const toggleVis = document.getElementById('toggle-pass-vis');
    if (toggleVis) {
      toggleVis.onclick = () => {
        const inp = document.getElementById(mode === 'login' ? 'auth-pass' : 'reg-pass');
        if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
      };
    }
    document.querySelectorAll('[data-pick-av]').forEach((b) => {
      b.onclick = () => {
        selectedAvatar = b.dataset.pickAv;
        document.querySelectorAll('[data-pick-av]').forEach((x) => { x.style.borderColor = 'var(--border)'; });
        b.style.borderColor = 'var(--primary)';
      };
    });

    if (document.getElementById('btn-submit-login')) {
      const doLogin = async () => {
        const btn = document.getElementById('btn-submit-login');
        const errEl = document.getElementById('auth-err');
        btn.disabled = true; btn.textContent = '⏳ Đang đăng nhập...';
        const res = await authLogin({ username: document.getElementById('auth-user').value, password: document.getElementById('auth-pass').value });
        btn.disabled = false; btn.textContent = 'Đăng nhập vào Panda HSK';
        if (!res.ok) { errEl.textContent = res.error; return; }
        await onAuthSuccess(res.user);
      };
      document.getElementById('btn-submit-login').onclick = doLogin;
      document.getElementById('auth-pass').onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
    }

    if (document.getElementById('btn-submit-reg')) {
      const doReg = async () => {
        const btn = document.getElementById('btn-submit-reg');
        const errEl = document.getElementById('auth-err');
        const p1 = document.getElementById('reg-pass').value;
        const p2 = document.getElementById('reg-pass2').value;
        if (p1 !== p2) { errEl.textContent = 'Mật khẩu nhập lại không khớp.'; return; }
        btn.disabled = true; btn.textContent = '⏳ Đang tạo tài khoản...';
        const res = await authRegister({
          displayName: document.getElementById('reg-name').value,
          username: document.getElementById('reg-user').value,
          password: p1, avatar: selectedAvatar
        });
        btn.disabled = false; btn.textContent = '🚀 Tạo tài khoản & Vào học ngay';
        if (!res.ok) { errEl.textContent = res.error; return; }
        await onAuthSuccess(res.user);
      };
      document.getElementById('btn-submit-reg').onclick = doReg;
      document.getElementById('reg-pass2').onkeydown = (e) => { if (e.key === 'Enter') doReg(); };
    }
  };
  renderAuth(defaultMode);
}

function openAITutorModal() {
  requireAuth(() => {
    openModal(`
      <h3 class="card-title">🐼 Sư Phụ AI Panda — Chuyên Gia Tiếng Trung</h3>
      <div id="ai-chat-box" class="chat-stream"><div class="chat-msg ai"><strong>Sư phụ Panda:</strong> 你好！Bạn muốn hỏi gì về tiếng Trung hôm nay?</div></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="ai-input" placeholder="Nhập câu hỏi..." maxlength="600" />
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
      try {
        const res = await fetch('./api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Panda-User': store.currentUsername || 'guest' },
          body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        document.getElementById(lid).innerHTML = (data.reply || data.error || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      } catch { document.getElementById(lid).textContent = 'Lỗi kết nối AI.'; }
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
      <p style="font-size:0.85rem;color:var(--text-muted)">Mỗi từ 1 dòng: <strong>Chữ Hán | Pinyin | Nghĩa Việt</strong></p>
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
      store.save(); closeModal();
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
      store.save(); updateTopbar();
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
      </div>`;
    document.getElementById('btn-replay').onclick = () => speakZh(target.hanzi);
    document.getElementById('btn-rep-q').onclick = () => openReportErrorModal(`Câu hỏi từ vựng: ${target.hanzi}`, openModal, closeModal);
    document.querySelectorAll('.option-btn').forEach((btn) => {
      btn.onclick = () => {
        const isOk = btn.dataset.hanzi === target.hanzi;
        recordWord(target.hanzi, isOk);
        if (isOk) { score++; btn.classList.add('correct'); } else { btn.classList.add('wrong'); }
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

  if (PUBLIC_TABS.has(tab) && tab !== 'home') { renderPublicPage(main, tab); return; }

  if (tab === 'home') {
    const cloudRows = (cloudLeaderboard || []).map((r) => ({ name: r.display_name, avatar: r.avatar_url || '🐼', lv: r.level || 1, xp: Number(r.xp || 0), isReal: true }));
    const demoPlayers = [
      { name: 'Minh Anh', avatar: '🐯', lv: 24, xp: 2810, isReal: false },
      { name: 'Thảo Nhi', avatar: '🦊', lv: 17, xp: 2090, isReal: false },
      { name: 'Hoàng Nam', avatar: '🐰', lv: 15, xp: 1950, isReal: false }
    ];
    const leaderboard = [...cloudRows, ...demoPlayers].sort((a, b) => b.xp - a.xp).slice(0, 6);

    main.innerHTML = `
      <div class="page-hero">
        <div class="hero-left">
          <div class="mascot-avatar">${p.avatar || '🐼'}</div>
          <div>
            <h1 class="hero-title">Chào mừng đến với Panda HSK, ${p.name}!</h1>
            <p class="hero-sub">Kho từ vựng <strong>${allWords.length.toLocaleString()}</strong> từ (HSK 1–9) · ${store.user ? `Đã kết nối tài khoản <strong>@${store.currentUsername}</strong>` : 'Đăng nhập bằng Tên đăng nhập & Mật khẩu để lưu tiến độ vĩnh viễn'}</p>
          </div>
        </div>
        <div class="hero-btns">
          <button class="btn btn-primary" id="btn-hero-placement">🧭 Kiểm tra xếp lớp</button>
          <button class="btn btn-green" id="btn-hero-journey">🗺️ Vào Hành Trình</button>
          <button class="btn btn-outline" id="btn-hero-auth">${store.user ? '⚙️ Hồ sơ & Dữ liệu' : '👤 Đăng nhập / Tạo tài khoản'}</button>
        </div>
      </div>

      <div class="two-col-grid">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-header"><h3 class="card-title">🏆 BẢNG XẾP HẠNG PANDA</h3><span class="badge-pill">HSK 1 – 9</span></div>
            <div class="rank-list">
              ${leaderboard.map((u, idx) => `<div class="rank-row" style="${u.isReal ? 'border:1px solid var(--primary);' : ''}"><span><strong>#${idx + 1}</strong> ${u.avatar} ${u.name} · Lv.${u.lv}</span><span class="rank-badge">${u.xp} XP</span></div>`).join('')}
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
            <div class="card-header"><h3 class="card-title">🗂️ BỘ THẺ CỦA TÔI (${customDecks.length} bộ thẻ)</h3><button class="btn btn-primary btn-sm" id="btn-create-deck">+ Tạo Bộ Thẻ</button></div>
            ${customDecks.length === 0 ? `
              <div style="text-align:center;padding:20px;background:var(--bg);border-radius:14px;border:1px dashed var(--border)">
                <div style="font-weight:700">Chưa có bộ thẻ cá nhân nào</div>
                <button class="btn btn-primary btn-sm" style="margin-top:8px" id="btn-create-deck-empty">+ Tạo Bộ Thẻ Đầu Tiên</button>
              </div>
            ` : `<div class="deck-grid">${customDecks.map((d) => `<div class="deck-card" data-play-deck="${d.id}"><div><strong>${d.title}</strong><div style="font-size:0.8rem;color:var(--text-muted)">${d.words.length} từ vựng</div></div><button class="btn btn-outline btn-sm btn-block">▶️ Học ngay</button></div>`).join('')}</div>`}
          </div>

          <div class="card">
            <div class="card-header"><h3 class="card-title">✨ LỘ TRÌNH 9 CẤP ĐỘ (HSK 1 – HSK 9)</h3><button class="btn btn-gold btn-sm" id="btn-quick-review">🔁 Ôn tập (${due.length})</button></div>
            <div class="deck-grid">
              ${LEVELS.map((l) => {
                const lvlWords = allWords.filter((w) => w.level === l);
                const learnedCnt = lvlWords.filter((w) => store.state.srs[w.hanzi]).length;
                return `<div class="deck-card" data-open-journey="${l}"><div><div style="display:flex;justify-content:space-between;align-items:center"><strong style="color:var(--primary)">${levelLabel(l)}</strong><span class="badge-pill">${learnedCnt}/${lvlWords.length} từ</span></div><p style="font-size:0.8rem;color:var(--text-muted);margin:6px 0 0">Chia thành ${Math.max(1, Math.ceil(lvlWords.length / 50))} chương</p></div><button class="btn btn-primary btn-sm btn-block">🗺️ Học lộ trình</button></div>`;
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
    if (document.getElementById('btn-create-deck-empty')) document.getElementById('btn-create-deck-empty').onclick = () => openCreateDeckModal(() => renderView('home'));
    document.getElementById('btn-quick-review').onclick = () => switchTab('review');
    document.querySelectorAll('[data-set-world]').forEach((b) => { b.onclick = () => { p.activeWorld = Number(b.dataset.setWorld); store.save(); updateTopbar(); renderView('home'); }; });
    document.querySelectorAll('[data-open-journey]').forEach((card) => { card.onclick = () => { p.activeWorld = Number(card.dataset.openJourney); store.save(); updateTopbar(); switchTab('journey'); }; });
    document.querySelectorAll('[data-play-deck]').forEach((card) => {
      card.onclick = () => requireAuth(() => { const deck = customDecks.find((d) => String(d.id) === card.dataset.playDeck); if (deck) startQuickQuiz(deck.words, deck.title, 'home'); });
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
          <div><h1 class="hero-title">🗺️ Hành Trình Chinh Phục ${levelLabel(p.activeWorld)}</h1><p class="hero-sub">Tiến độ: đã học <strong>${totalLearnedInLevel}/${levelWords.length.toLocaleString()}</strong> từ</p></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${LEVELS.map((l) => `<button class="btn ${p.activeWorld === l ? 'btn-primary' : 'btn-outline'} btn-sm" data-j-lvl="${l}">${levelLabel(l)}</button>`).join('')}</div>
        </div>
        <div class="two-col-grid">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:10px">📚 Danh Sách Chương (${totalChapters} chương)</h3>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:62dvh;overflow-y:auto">
              ${Array.from({ length: totalChapters }, (_, cIdx) => {
                const slice = levelWords.slice(cIdx * chapterSize, (cIdx + 1) * chapterSize);
                const done = slice.filter((w) => store.state.srs[w.hanzi]).length;
                const isAct = cIdx === selectedChapter;
                return `<button class="btn ${isAct ? 'btn-primary' : 'btn-outline'}" style="justify-content:space-between;width:100%" data-chap="${cIdx}"><span>Chương ${cIdx + 1}</span><span class="badge-pill" style="${isAct ? 'color:#1e293b' : ''}">${done}/${slice.length}</span></button>`;
              }).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3 class="card-title">🏯 Chương ${selectedChapter + 1}</h3><button class="btn btn-gold btn-sm" id="btn-test-chapter">🎯 Kiểm tra Chương ${selectedChapter + 1}</button></div>
            <div style="display:flex;flex-direction:column;gap:12px">
              ${Array.from({ length: lessonsCount }, (_, lIdx) => {
                const lw = chapterWords.slice(lIdx * 10, (lIdx + 1) * 10);
                const doneCnt = lw.filter((w) => store.state.srs[w.hanzi]).length;
                const pct = Math.round((doneCnt / Math.max(1, lw.length)) * 100);
                return `<div style="padding:14px;border:1.5px solid var(--border);border-radius:14px;background:var(--bg)">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><strong>Bài ${lIdx + 1}: ${lw.slice(0, 4).map((x) => x.hanzi).join(' · ')}...</strong><span class="badge-pill">${doneCnt}/${lw.length} (${pct}%)</span></div>
                  <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:10px"><div style="height:100%;width:${pct}%;background:var(--green)"></div></div>
                  <div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm" data-preview-lesson="${lIdx}">👁️ Xem từ</button><button class="btn btn-primary btn-sm" data-study-lesson="${lIdx}">▶️ Vào học</button></div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>`;
      document.querySelectorAll('[data-j-lvl]').forEach((b) => { b.onclick = () => { p.activeWorld = Number(b.dataset.jLvl); selectedChapter = 0; store.save(); updateTopbar(); renderJourney(); }; });
      document.querySelectorAll('[data-chap]').forEach((b) => { b.onclick = () => { selectedChapter = Number(b.dataset.chap); renderJourney(); }; });
      document.getElementById('btn-test-chapter').onclick = () => startQuickQuiz(chapterWords.slice(0, 15), `Kiểm tra Chương ${selectedChapter + 1}`, 'journey');
      document.querySelectorAll('[data-study-lesson]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.studyLesson); startQuickQuiz(chapterWords.slice(i * 10, (i + 1) * 10), `Chương ${selectedChapter + 1} - Bài ${i + 1}`, 'journey'); }; });
      document.querySelectorAll('[data-preview-lesson]').forEach((b) => {
        b.onclick = () => {
          const i = Number(b.dataset.previewLesson);
          const lw = chapterWords.slice(i * 10, (i + 1) * 10);
          openModal(`<h3 class="card-title">📖 Từ vựng Bài ${i + 1}</h3><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${lw.map((w) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--border);border-radius:10px"><div><strong class="hanzi-md">${w.hanzi}</strong> <span style="color:var(--primary)">${w.pinyin}</span><div style="font-size:0.85rem;color:var(--text-muted)">${w.meaning}</div></div><button class="btn btn-outline btn-sm" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊</button></div>`).join('')}</div>`);
        };
      });
    };
    renderJourney();
  } else if (tab === 'practice') {
    let filterLevel = 0, statusTab = 'all', page = 1;
    const pageSize = 30;
    main.innerHTML = `
      <div class="card">
        <div class="card-header"><h2 class="card-title">📜 Sổ Từ Vựng (${allWords.length.toLocaleString()} từ)</h2></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <button class="btn btn-primary btn-sm" data-st-tab="all">📚 Tất cả</button>
          <button class="btn btn-outline btn-sm" data-st-tab="unlearned">🆕 Chưa học</button>
          <button class="btn btn-outline btn-sm" data-st-tab="learning">🔁 Đang ôn</button>
          <button class="btn btn-outline btn-sm" data-st-tab="mastered">✅ Đã thuộc</button>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:14px">
          <input type="search" id="vocab-search" placeholder="Tìm chữ Hán, pinyin hoặc nghĩa..." />
          <select id="vocab-level-filter" style="width:160px;flex-shrink:0"><option value="0">Tất cả cấp</option>${LEVELS.map((l) => `<option value="${l}">${levelLabel(l)}</option>`).join('')}</select>
        </div>
        <div id="vocab-summary" style="font-size:0.84rem;color:var(--text-muted);margin-bottom:10px"></div>
        <div id="vocab-list" class="deck-grid"></div>
        <div id="vocab-pagination" style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px"></div>
      </div>`;
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
            <div style="display:flex;justify-content:space-between;align-items:center"><span class="badge-pill">${levelLabel(w.level)}</span><button class="btn btn-outline btn-sm" data-say="${w.hanzi}">🔊</button></div>
            <div class="hanzi-md" style="margin-top:6px">${w.hanzi} <span style="font-size:0.9rem;color:var(--primary)">${w.pinyin}</span></div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">${w.meaning}</div>
          </div>
          <span class="badge-pill" style="align-self:flex-start">${getWordStatus(store.state.srs[w.hanzi])}</span>
        </div>`).join('');
      document.getElementById('vocab-pagination').innerHTML = `<button class="btn btn-outline btn-sm" id="btn-v-prev" ${page <= 1 ? 'disabled' : ''}>⬅️ Trước</button><span>Trang ${page}/${totalPages}</span><button class="btn btn-outline btn-sm" id="btn-v-next" ${page >= totalPages ? 'disabled' : ''}>Sau ➡️</button>`;
      document.getElementById('btn-v-prev').onclick = () => { page--; renderVocab(); };
      document.getElementById('btn-v-next').onclick = () => { page++; renderVocab(); };
      document.querySelectorAll('[data-say]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); speakZh(b.dataset.say); }; });
    };
    document.querySelectorAll('[data-st-tab]').forEach((b) => {
      b.onclick = () => { statusTab = b.dataset.stTab; page = 1; document.querySelectorAll('[data-st-tab]').forEach((x) => { x.className = 'btn btn-outline btn-sm'; }); b.className = 'btn btn-primary btn-sm'; renderVocab(); };
    });
    document.getElementById('vocab-search').oninput = () => { page = 1; renderVocab(); };
    document.getElementById('vocab-level-filter').onchange = (e) => { filterLevel = Number(e.target.value); page = 1; renderVocab(); };
    renderVocab();
  } else if (tab === 'exam') {
    const history = store.state.examHistory || [];
    const draft = store.state.inProgressExam;
    main.innerHTML = `
      <div class="card">
        <div class="card-header"><h2 class="card-title">📋 Phòng Thi Thử Panda HSK (HSK 1 – HSK 9)</h2></div>
        ${draft ? `<div style="padding:12px;border-radius:12px;background:var(--surface-alt);border:1.5px solid var(--primary);display:flex;justify-content:space-between;align-items:center;margin:12px 0"><div><strong>📝 Bài thi đang làm dở:</strong> HSK ${draft.level} (<code>${draft.examId}</code>)</div><button class="btn btn-primary btn-sm" id="btn-resume-draft">▶️ Tiếp tục</button></div>` : ''}
        <div class="deck-grid" style="margin-top:12px">
          ${LEVELS.map((l) => { const c = EXAM_CONFIGS[l]; return `<div class="deck-card" data-start-exam="${l}"><div><div style="display:flex;justify-content:space-between"><strong style="color:var(--primary)">${c.label}</strong><span class="badge-pill">${c.totalQ} câu · ${c.minutes}p</span></div><p style="font-size:0.8rem;color:var(--text-muted);margin:6px 0 0">${c.desc}</p></div><button class="btn btn-primary btn-sm btn-block">📝 Vào phòng thi</button></div>`; }).join('')}
        </div>
      </div>
      ${history.length ? `<div class="card"><h3 class="card-title">🏅 Lịch Sử Thi (${p.name})</h3><div class="rank-list">${history.slice(0, 10).map((h) => `<div class="rank-row"><span><strong>HSK ${h.level}</strong> · <code>${h.examId}</code> (${h.date})</span><span style="font-weight:800;color:${h.passed ? 'var(--green)' : 'var(--primary)'}">${h.score}/${h.maxScore} · ${h.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</span></div>`).join('')}</div></div>` : ''}`;
    if (document.getElementById('btn-resume-draft')) document.getElementById('btn-resume-draft').onclick = () => launchExamUI(main, draft.level, allWords, () => renderView('exam'), draft);
    document.querySelectorAll('[data-start-exam]').forEach((card) => { card.onclick = () => launchExamUI(main, Number(card.dataset.startExam), allWords, () => renderView('exam')); });
  } else if (tab === 'speak') renderSpeakModule(main, allWords);
  else if (tab === 'video') renderVideoModule(main, (lvl, title) => startQuickQuiz(allWords.filter((w) => w.level === lvl).sort(() => Math.random() - 0.5).slice(0, 10), `Củng cố: ${title}`, 'video'), openModal, closeModal);
  else if (tab === 'placement') renderPlacementModule(main, allWords, (recLvl) => { p.activeWorld = recLvl; store.save(); updateTopbar(); switchTab('journey'); });
  else if (tab === 'writing') renderWritingModule(main, allWords);
  else if (tab === 'dictionary') renderDictionaryModule(main, allWords, openModal, closeModal);
  else if (tab === 'stats') renderStatsModule(main, allWords);
  else if (tab === 'arena') renderArenaModule(main, allWords, updateTopbar);
  else if (tab === 'review') startQuickQuiz(due.length ? due : fresh, 'Ôn tập từ vựng SRS', 'home');
}

function switchTab(tab) {
  const exec = () => {
    currentTab = tab;
    document.querySelectorAll('.side-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('sidebar').classList.remove('open');
    renderView(tab);
  };
  if (PUBLIC_TABS.has(tab)) exec(); else requireAuth(exec);
}

async function boot() {
  store.onSyncStatus(renderSyncBadge);
  updateTopbar();
  document.querySelectorAll('.side-item').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
  document.querySelectorAll('[data-pub-link]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); switchTab(a.dataset.pubLink); }; });
  document.getElementById('btn-home').onclick = () => switchTab('home');
  document.getElementById('btn-ai-tutor').onclick = openAITutorModal;
  document.getElementById('btn-auth-sidebar').onclick = () => openAuthModal('login');
  document.getElementById('ui-user-badge').onclick = () => openAuthModal('login');
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('btn-toggle-sidebar').onclick = () => document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('btn-mobile-menu').onclick = () => document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('btn-theme-top').onclick = () => { store.state.settings.theme = store.state.settings.theme === 'light' ? 'dark' : 'light'; store.save(); updateTopbar(); };

  const searchInp = document.getElementById('global-dict-search');
  const drop = document.getElementById('global-search-dropdown');
  searchInp.oninput = () => {
    const q = searchInp.value.trim().toLowerCase();
    if (!q) { drop.classList.add('hidden'); return; }
    const hits = ALL_WORDS.filter((w) => w.hanzi.includes(q) || w.pinyin.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)).slice(0, 8);
    drop.classList.remove('hidden');
    drop.innerHTML = hits.length ? hits.map((w) => `<div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><div><strong>${w.hanzi}</strong> <span style="color:var(--primary)">${w.pinyin}</span> · ${w.meaning}</div><button class="btn btn-outline btn-sm" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊</button></div>`).join('') : `<div style="padding:10px;font-size:0.85rem;color:var(--text-muted)">Không tìm thấy "${q}"</div>`;
  };
  document.addEventListener('click', (e) => { if (!e.target.closest('.dict-search-wrap')) drop.classList.add('hidden'); });

  const sb = await getSupabase();
  if (sb) {
    const { data } = await sb.auth.getSession();
    if (data?.session?.user) { await store.bindUser(data.session.user); updateTopbar(); }
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { await store.bindUser(null); updateTopbar(); }
      else if (event === 'TOKEN_REFRESHED' && session?.user) { store.user = session.user; }
    });
  }

  cloudLeaderboard = await fetchLeaderboard();
  await dataLoader.init();
  ALL_WORDS = await dataLoader.getAllLoadedWords();
  renderView('home');
  if (store.user) await checkLegacyMigrationPrompt();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

boot();