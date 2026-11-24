import { store } from './storage/db.js';
import { dataLoader } from './data/loader.js';
import { EXAM_CONFIGS, launchExamUI, getExamCoverageStats } from './exam/exam-engine.js';
import {
  getSupabase,
  getSupabaseConnectionStatus,
  getRestoredUserSession,
  authRegister,
  authLogin,
  authChangePassword,
  authLogout,
  authResetPassword,
  authCreateRecoveryCode,
  authHasRecoveryCode,
  checkUsernameAvailability,
  validateUsername,
  validateNewPassword,
  scorePassword,
  MIN_PASSWORD,
  MAX_PASSWORD,
  fetchLeaderboard,
  exportUserCloudData,
  deleteAccountOnServer
} from './services/supabase-client.js';
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

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c]);

let currentTab = 'home';
let ALL_WORDS = [];
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
  store.state.srs[hanzi] = {
    streak: isCorrect ? prev.streak + 1 : 0,
    reviews: prev.reviews + 1,
    lastReview: new Date().toISOString().slice(0, 10)
  };
  store.dirtyWords.add(hanzi);
  store.save();
}

function renderSyncBadge(status) {
  const el = document.getElementById('ui-sync-status');
  if (!el) return;
  if (!store.user) {
    el.textContent = '☁️ Chế độ Khách';
    el.style.color = 'var(--text-muted)';
    el.title = 'Tiến độ đang lưu tạm trên trình duyệt. Bấm để đăng nhập và đồng bộ đám mây.';
    return;
  }
  const map = {
    guest: ['☁️ Chế độ Khách', 'var(--text-muted)'],
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
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTxt('ui-level', `Cấp ${lvl} · ${levelLabel(p.activeWorld)}`);
  setTxt('ui-streak', `🔥 ${p.streak}`);
  setTxt('ui-coins', `🪙 ${p.coins}`);
  setTxt('ui-user-badge', store.user ? `${p.avatar || '🐼'} ${p.name}` : '🐼 Khách');
  const sideAuthBtn = document.getElementById('btn-auth-sidebar');
  if (sideAuthBtn) {
    sideAuthBtn.innerHTML = store.user
      ? `<span>${esc(p.avatar || '🐼')}</span> <span class="side-txt">${esc(p.name)}</span>`
      : `<span>👤</span> <span class="side-txt">ĐĂNG NHẬP / ĐĂNG KÝ</span>`;
  }
  renderSyncBadge(store.syncStatus);
  document.documentElement.setAttribute('data-theme', store.state.settings.theme || 'light');
}

// Hook cho modal: modalBeforeClose trả về false để chặn đóng; modalAfterClose chạy sau khi đóng
let modalBeforeClose = null;
let modalAfterClose = null;

function openModal(html) {
  modalBeforeClose = null;
  modalAfterClose = null;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function closeModal() {
  if (modalBeforeClose && !modalBeforeClose()) return;
  const after = modalAfterClose;
  modalBeforeClose = null;
  modalAfterClose = null;
  document.getElementById('modal-backdrop').classList.add('hidden');
  if (typeof after === 'function') after();
}

async function checkGuestAndLegacyMigrationPrompt() {
  if (!store.user) return;
  const pendingList = store.detectPendingLocalProgress();
  if (!pendingList || !pendingList.length) return;

  openModal(`
    <h3 class="card-title">📦 Đồng bộ tiến độ học tập trên máy này?</h3>
    <p style="font-size:0.88rem;color:var(--text-muted);margin:8px 0">
      Hệ thống phát hiện dữ liệu học tập cục bộ chưa đồng bộ. Bạn có muốn gộp vào tài khoản <strong>@${store.currentUsername}</strong> không?
    </p>
    <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">
      ${pendingList.map((item, idx) => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:10px">
          <div style="font-size:0.86rem">
            <strong>${esc(item.displayName)}</strong>
            <div style="color:var(--text-muted)">${item.wordCount} từ đã luyện · ${item.xp} XP</div>
          </div>
          <button class="btn btn-primary btn-sm" data-mig-idx="${idx}">Đồng bộ ngay</button>
        </div>`).join('')}
    </div>
    <button class="btn btn-outline btn-block btn-sm" id="btn-skip-mig">Bỏ qua (Giữ nguyên dữ liệu tài khoản)</button>
  `);

  document.querySelectorAll('[data-mig-idx]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      b.innerHTML = `<span class="panda-spinner"></span>Đang gộp...`;
      const target = pendingList[Number(b.dataset.migIdx)];
      const res = await store.mergeLocalProgressIntoCloud(target);
      closeModal();
      if (res.ok) {
        updateTopbar();
        renderView(currentTab);
        alert('Đã đồng bộ tiến độ cục bộ lên tài khoản thành công!');
      }
    };
  });

  document.getElementById('btn-skip-mig').onclick = () => {
    store.markLegacySkipped(true);
    closeModal();
  };
}

function wirePasswordToggles(root = document) {
  root.querySelectorAll('[data-toggle-target]').forEach((btn) => {
    btn.onclick = () => {
      const inp = document.getElementById(btn.dataset.toggleTarget);
      if (!inp) return;
      const willShow = inp.type === 'password';
      inp.type = willShow ? 'text' : 'password';
      btn.textContent = willShow ? '🙈' : '👁️';
      btn.setAttribute('aria-pressed', String(willShow));
      btn.setAttribute('aria-label', willShow ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    };
  });
}

function wireCapsLockWarning(root = document) {
  const warn = root.querySelector('[data-caps-warn]');
  if (!warn) return;
  root.querySelectorAll('input[type="password"]').forEach((inp) => {
    const check = (e) => {
      if (typeof e.getModifierState !== 'function') return;
      warn.classList.toggle('hidden', !e.getModifierState('CapsLock'));
    };
    inp.addEventListener('keydown', check);
    inp.addEventListener('keyup', check);
    inp.addEventListener('blur', () => warn.classList.add('hidden'));
  });
}

function wireStrengthMeter(inputId, meterId) {
  const inp = document.getElementById(inputId);
  const meter = document.getElementById(meterId);
  if (!inp || !meter) return;
  const colors = ['#dc2626', '#dc2626', '#d97706', '#16a34a', '#15803d'];
  const update = () => {
    const { score, label } = scorePassword(inp.value);
    meter.classList.toggle('hidden', !inp.value);
    meter.querySelector('.panda-strength-fill').style.width = `${Math.max(1, score) * 25}%`;
    meter.querySelector('.panda-strength-fill').style.background = colors[score];
    meter.querySelector('.panda-strength-label').textContent = `Độ mạnh: ${label}`;
    meter.querySelector('.panda-strength-label').style.color = colors[score];
  };
  inp.addEventListener('input', update);
  update();
}

const strengthMeterHtml = (id) => `
  <div class="panda-strength hidden" id="${id}">
    <div class="panda-strength-track"><div class="panda-strength-fill"></div></div>
    <div class="panda-strength-label"></div>
  </div>`;

const passwordFieldHtml = (id, label, placeholder, autocomplete) => `
  <div class="panda-field-group">
    <label class="panda-field-label" for="${id}">${label}</label>
    <div class="panda-pass-wrap">
      <input class="panda-pass-input" type="password" id="${id}" name="${id}" placeholder="${placeholder}" autocomplete="${autocomplete}" maxlength="${MAX_PASSWORD}" />
      <button type="button" class="panda-eye-btn" data-toggle-target="${id}" aria-label="Hiện mật khẩu" aria-pressed="false">👁️</button>
    </div>
  </div>`;

function showRecoveryCodeScreen(code, { username = '', title = '🔐 Lưu mã khôi phục của bạn', intro = '', onDone } = {}) {
  openModal(`
    <h3 class="card-title" style="margin-bottom:6px;padding-right:28px">${title}</h3>
    ${intro ? `<p style="font-size:0.84rem;margin:0 0 8px">${intro}</p>` : ''}
    <p style="font-size:0.83rem;color:var(--text-muted);margin:0 0 12px">
      Đây là cách <strong>duy nhất</strong> để lấy lại tài khoản nếu bạn quên mật khẩu. Mã <strong>chỉ hiển thị một lần</strong> và chỉ dùng được một lần.
      Hãy chụp màn hình, sao chép hoặc tải file về và cất ở nơi an toàn.
    </p>
    <div class="panda-recovery-code" id="rc-code">${esc(code)}</div>
    <div style="display:flex;gap:8px;margin:10px 0">
      <button type="button" class="btn btn-outline btn-sm" style="flex:1" id="rc-copy">📋 Sao chép mã</button>
      <button type="button" class="btn btn-outline btn-sm" style="flex:1" id="rc-download">📥 Tải file .txt</button>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;margin:6px 0 12px">
      <input type="checkbox" id="rc-ack" style="width:auto" /> Tôi đã lưu mã khôi phục ở nơi an toàn
    </label>
    <button type="button" class="btn btn-primary btn-block" id="rc-done" disabled>Tiếp tục vào học 🚀</button>
  `);
  const ack = document.getElementById('rc-ack');
  const done = document.getElementById('rc-done');
  ack.onchange = () => { done.disabled = !ack.checked; };
  document.getElementById('rc-copy').onclick = async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = '✅ Đã sao chép';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('rc-code'));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = 'Đã chọn mã — nhấn Ctrl+C';
    }
  };
  document.getElementById('rc-download').onclick = () => {
    const text = [
      'PANDA HSK — MÃ KHÔI PHỤC TÀI KHOẢN',
      '',
      `Tên đăng nhập: ${username ? '@' + username : '(tài khoản của bạn)'}`,
      `Mã khôi phục : ${code}`,
      `Tạo lúc      : ${new Date().toLocaleString('vi-VN')}`,
      '',
      'Dùng mã này tại "Quên mật khẩu?" trong cửa sổ Đăng nhập.',
      'Mã chỉ dùng được 1 lần. Không chia sẻ mã này cho bất kỳ ai.'
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    a.download = `panda-hsk-ma-khoi-phuc${username ? '-' + username : ''}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  modalBeforeClose = () => ack.checked
    || confirm('Bạn chưa xác nhận đã lưu mã khôi phục. Sau khi đóng, mã sẽ KHÔNG hiển thị lại. Vẫn đóng?');
  modalAfterClose = onDone || null;
  done.onclick = () => closeModal();
}

async function renderRecoveryStatus() {
  const el = document.getElementById('prof-rc-status');
  if (!el) return;
  const has = await authHasRecoveryCode();
  if (!document.body.contains(el)) return;
  if (has === true) {
    el.innerHTML = '✅ Tài khoản đã có mã khôi phục. Tạo mã mới sẽ làm mã cũ mất hiệu lực.';
    el.style.color = '#16a34a';
  } else if (has === false) {
    el.innerHTML = '⚠️ Tài khoản <strong>chưa có mã khôi phục</strong>. Hãy tạo ngay để không bị mất tài khoản khi quên mật khẩu.';
    el.style.color = '#b45309';
  } else {
    el.textContent = 'Không kiểm tra được trạng thái mã khôi phục.';
    el.style.color = 'var(--text-muted)';
  }
}

function openProfileAccountModal() {
  const p = store.state.profile;
  openModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-right:30px">
      <div>
        <h3 class="card-title" style="margin:0">${esc(p.avatar || '🐼')} Hồ Sơ &amp; Bảo Mật Tài Khoản</h3>
        <div style="font-size:0.8rem;color:var(--text-muted)">Tên đăng nhập: <strong>@${esc(store.currentUsername)}</strong></div>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-logout-now">Đăng xuất</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-alt);margin-bottom:12px">
      <div style="font-weight:700;font-size:0.88rem">✏️ Thông tin hiển thị &amp; Bảng xếp hạng</div>
      <input class="panda-input" type="text" id="prof-display-name" value="${esc(p.name)}" maxlength="60" placeholder="Tên hiển thị..." />
      <label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;cursor:pointer">
        <input type="checkbox" id="prof-hide-lb" ${p.hideOnLeaderboard ? 'checked' : ''} style="width:auto" />
        Ẩn tên và điểm trên Bảng xếp hạng công khai
      </label>
      <button class="btn btn-primary btn-sm" id="btn-save-prof">💾 Lưu thay đổi hồ sơ</button>
    </div>
    <form id="form-change-pass" class="panda-auth-form" novalidate style="gap:8px;padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:12px">
      <div style="font-weight:700;font-size:0.88rem">🔑 Đổi mật khẩu</div>
      <input type="text" name="username" value="${esc(store.currentUsername)}" autocomplete="username" hidden />
      ${passwordFieldHtml('prof-cur-pass', 'Mật khẩu hiện tại', 'Nhập mật khẩu hiện tại...', 'current-password')}
      ${passwordFieldHtml('prof-new-pass', `Mật khẩu mới (≥ ${MIN_PASSWORD} ký tự, có chữ và số)`, 'Nhập mật khẩu mới...', 'new-password')}
      ${strengthMeterHtml('prof-strength')}
      <div class="panda-caps-warn hidden" data-caps-warn>⇪ Caps Lock đang bật</div>
      <button type="submit" class="btn btn-outline btn-sm" id="btn-change-pass">Cập nhật mật khẩu</button>
      <div id="prof-pass-msg" style="font-size:0.8rem"></div>
    </form>
    <div style="display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:12px">
      <div style="font-weight:700;font-size:0.88rem">🛟 Mã khôi phục (dùng khi quên mật khẩu)</div>
      <div id="prof-rc-status" style="font-size:0.8rem;color:var(--text-muted)">Đang kiểm tra...</div>
      <div class="panda-pass-wrap">
        <input class="panda-pass-input" type="password" id="prof-rc-pass" placeholder="Nhập mật khẩu hiện tại để tạo mã mới..." autocomplete="current-password" />
        <button type="button" class="panda-eye-btn" data-toggle-target="prof-rc-pass" aria-label="Hiện mật khẩu" aria-pressed="false">👁️</button>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-new-rc">🔄 Tạo mã khôi phục mới</button>
      <div id="prof-rc-msg" style="font-size:0.8rem;color:#dc2626"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <button class="btn btn-green btn-sm" style="flex:1" id="btn-export-data">📥 Xuất dữ liệu (JSON)</button>
      <button class="btn btn-outline btn-sm" style="flex:1;color:#dc2626;border-color:#fecaca" id="btn-toggle-del">🗑️ Xóa vĩnh viễn tài khoản</button>
    </div>
    <div id="del-account-box" class="hidden" style="padding:12px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca">
      <div style="font-size:0.82rem;color:#b91c1c;font-weight:700;margin-bottom:8px">⚠️ Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu học tập, không thể khôi phục!</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input class="panda-input" type="password" id="del-confirm-pass" placeholder="Nhập mật khẩu hiện tại..." autocomplete="current-password" />
        <button class="btn btn-primary btn-sm" id="btn-confirm-del" style="background:#dc2626">Xác nhận xóa tài khoản</button>
      </div>
      <div id="del-err-msg" style="font-size:0.8rem;color:#dc2626;margin-top:6px"></div>
    </div>
  `);

  const body = document.getElementById('modal-body');
  wirePasswordToggles(body);
  wireCapsLockWarning(body);
  wireStrengthMeter('prof-new-pass', 'prof-strength');
  renderRecoveryStatus();

  document.getElementById('btn-logout-now').onclick = async () => {
    await authLogout();
    await store.bindUser(null);
    updateTopbar();
    closeModal();
    renderView(currentTab);
  };
  document.getElementById('btn-save-prof').onclick = async () => {
    const newName = document.getElementById('prof-display-name').value.replace(/[<>"'`]/g, '').trim().slice(0, 60);
    if (newName) store.state.profile.name = newName;
    store.state.profile.hideOnLeaderboard = document.getElementById('prof-hide-lb').checked;
    store.save();
    await store.flushToCloud();
    updateTopbar();
    cloudLeaderboard = await fetchLeaderboard();
    renderView(currentTab);
    alert('Đã lưu thông tin hồ sơ!');
  };
  document.getElementById('form-change-pass').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-change-pass');
    const msgEl = document.getElementById('prof-pass-msg');
    btn.disabled = true;
    btn.innerHTML = '<span class="panda-spinner" style="border-top-color:var(--primary)"></span>Đang cập nhật...';
    const res = await authChangePassword(
      document.getElementById('prof-cur-pass').value,
      document.getElementById('prof-new-pass').value
    );
    btn.disabled = false;
    btn.textContent = 'Cập nhật mật khẩu';
    msgEl.style.color = res.ok ? '#16a34a' : '#dc2626';
    msgEl.textContent = res.ok ? '✅ Đã đổi mật khẩu thành công!' : res.error;
    if (res.ok) {
      document.getElementById('prof-cur-pass').value = '';
      document.getElementById('prof-new-pass').value = '';
    }
  };
  document.getElementById('btn-new-rc').onclick = async (e) => {
    const btn = e.currentTarget;
    const msgEl = document.getElementById('prof-rc-msg');
    msgEl.textContent = '';
    btn.disabled = true;
    btn.innerHTML = '<span class="panda-spinner" style="border-top-color:var(--primary)"></span>Đang tạo mã...';
    const res = await authCreateRecoveryCode(document.getElementById('prof-rc-pass').value);
    btn.disabled = false;
    btn.textContent = '🔄 Tạo mã khôi phục mới';
    if (!res.ok) {
      msgEl.textContent = res.error;
      return;
    }
    showRecoveryCodeScreen(res.recoveryCode, {
      username: store.currentUsername,
      title: '🔐 Mã khôi phục mới của bạn',
      intro: 'Mã khôi phục cũ (nếu có) đã mất hiệu lực.',
      onDone: openProfileAccountModal
    });
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
    if (!res.ok) {
      document.getElementById('del-err-msg').textContent = res.error;
      return;
    }
    store.clearUserLocalCache(uid);
    await store.bindUser(null);
    updateTopbar();
    closeModal();
    renderView(currentTab);
    alert('Tài khoản đã được xóa vĩnh viễn.');
  };
}

const LAST_USERNAME_KEY = 'panda_hsk_last_username';
const readLastUsername = () => { try { return localStorage.getItem(LAST_USERNAME_KEY) || ''; } catch { return ''; } };
const rememberUsername = (u) => { try { if (u) localStorage.setItem(LAST_USERNAME_KEY, u); } catch {} };

function openAuthModal(defaultMode = 'login') {
  if (store.user) {
    openProfileAccountModal();
    return;
  }
  let selectedAvatar = '🐼';
  let isSubmitting = false;
  let userCheckTimer = null;
  let userCheckSeq = 0;

  const finalizeAuth = async () => {
    cloudLeaderboard = await fetchLeaderboard();
    await checkGuestAndLegacyMigrationPrompt();
    renderView(currentTab);
  };

  const onAuthSuccess = async (user, recoveryCode = null, intro = '') => {
    if (user) {
      await store.bindUser(user);
      updateTopbar();
      rememberUsername(store.currentUsername);
    }
    if (recoveryCode) {
      showRecoveryCodeScreen(recoveryCode, {
        username: store.currentUsername || '',
        intro,
        onDone: user ? finalizeAuth : () => openAuthModal('login')
      });
      return;
    }
    closeModal();
    await finalizeAuth();
  };

  const runSubmit = async (btnId, busyText, idleText, task) => {
    if (isSubmitting) return;
    const btn = document.getElementById(btnId);
    isSubmitting = true;
    btn.disabled = true;
    btn.innerHTML = `<span class="panda-spinner"></span>${busyText}`;
    try {
      await task();
    } finally {
      isSubmitting = false;
      if (document.body.contains(btn)) {
        btn.disabled = false;
        btn.textContent = idleText;
      }
    }
  };

  const renderAuth = (mode) => {
    const envNotice = '';
    const guestBtn = `<button type="button" class="btn btn-outline btn-block btn-sm" id="btn-continue-guest">Tiếp tục học ở Chế độ Khách</button>`;
    const capsWarn = `<div class="panda-caps-warn hidden" data-caps-warn>⇪ Caps Lock đang bật</div>`;

    let formHtml = '';
    if (mode === 'login') {
      formHtml = `
        <form class="panda-auth-form" id="form-login" novalidate>
          <div class="panda-field-group">
            <label class="panda-field-label" for="auth-user">Tên đăng nhập</label>
            <input class="panda-input" type="text" id="auth-user" name="username" placeholder="VD: tieu1710" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(readLastUsername())}" />
          </div>
          ${passwordFieldHtml('auth-pass', 'Mật khẩu', 'Nhập mật khẩu...', 'current-password')}
          ${capsWarn}
          <div style="display:flex;justify-content:flex-end;margin-top:-4px">
            <button type="button" class="panda-link-btn" id="btn-go-forgot">Quên mật khẩu?</button>
          </div>
          <div id="auth-err" class="panda-auth-error hidden" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-block" id="btn-submit-login">Đăng nhập vào Panda HSK</button>
          ${guestBtn}
        </form>`;
    } else if (mode === 'register') {
      formHtml = `
        <form class="panda-auth-form" id="form-register" novalidate>
          <div class="panda-field-group">
            <span class="panda-field-label">Chọn biểu tượng đại diện</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${AVATARS.map((av) => `<button type="button" class="btn btn-outline btn-sm" data-pick-av="${av}" style="font-size:1.15rem;border-color:${av === selectedAvatar ? 'var(--primary)' : 'var(--border)'}">${av}</button>`).join('')}
            </div>
          </div>
          <div class="panda-field-group">
            <label class="panda-field-label" for="reg-name">Tên hiển thị</label>
            <input class="panda-input" type="text" id="reg-name" name="name" placeholder="VD: Lê Tiêu" autocomplete="nickname" maxlength="60" />
          </div>
          <div class="panda-field-group">
            <label class="panda-field-label" for="reg-user">Tên đăng nhập (không dấu)</label>
            <input class="panda-input" type="text" id="reg-user" name="username" placeholder="VD: tieu1710" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="24" />
            <div class="panda-hint" id="reg-user-hint"></div>
          </div>
          ${passwordFieldHtml('reg-pass', `Mật khẩu (≥ ${MIN_PASSWORD} ký tự, có chữ và số)`, 'Nhập mật khẩu...', 'new-password')}
          ${strengthMeterHtml('reg-strength')}
          ${passwordFieldHtml('reg-pass2', 'Nhập lại mật khẩu', 'Nhập lại mật khẩu...', 'new-password')}
          ${capsWarn}
          <input type="text" name="website" id="reg-website" class="panda-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <div id="auth-err" class="panda-auth-error hidden" role="alert"></div>
          <div style="font-size:0.76rem;color:var(--text-muted);line-height:1.4">
            Bằng việc tạo tài khoản, bạn đồng ý với <a href="#terms" id="lnk-terms" style="color:var(--primary)">Điều khoản sử dụng</a> và
            <a href="#privacy" id="lnk-privacy" style="color:var(--primary)">Chính sách bảo mật</a>. Không cần email — sau khi tạo, bạn sẽ nhận <strong>mã khôi phục</strong> để lấy lại tài khoản khi quên mật khẩu.
          </div>
          <button type="submit" class="btn btn-green btn-block" id="btn-submit-reg">🚀 Tạo tài khoản &amp; Vào học ngay</button>
          ${guestBtn}
        </form>`;
    } else {
      formHtml = `
        <form class="panda-auth-form" id="form-forgot" novalidate>
          <p style="font-size:0.82rem;color:var(--text-muted);margin:0">
            Nhập tên đăng nhập và <strong>mã khôi phục</strong> bạn đã lưu khi tạo tài khoản để đặt mật khẩu mới.
          </p>
          <div class="panda-field-group">
            <label class="panda-field-label" for="fg-user">Tên đăng nhập</label>
            <input class="panda-input" type="text" id="fg-user" name="username" placeholder="VD: tieu1710" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(readLastUsername())}" />
          </div>
          <div class="panda-field-group">
            <label class="panda-field-label" for="fg-code">Mã khôi phục</label>
            <input class="panda-input" type="text" id="fg-code" name="recovery-code" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="24" style="font-family:ui-monospace,Consolas,monospace;letter-spacing:1px" />
          </div>
          ${passwordFieldHtml('fg-pass', `Mật khẩu mới (≥ ${MIN_PASSWORD} ký tự, có chữ và số)`, 'Nhập mật khẩu mới...', 'new-password')}
          ${strengthMeterHtml('fg-strength')}
          ${passwordFieldHtml('fg-pass2', 'Nhập lại mật khẩu mới', 'Nhập lại mật khẩu mới...', 'new-password')}
          ${capsWarn}
          <div id="auth-err" class="panda-auth-error hidden" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-block" id="btn-submit-forgot">🔓 Đặt lại mật khẩu &amp; Đăng nhập</button>
          <button type="button" class="btn btn-outline btn-block btn-sm" id="btn-back-login">← Quay lại Đăng nhập</button>
          <div style="font-size:0.76rem;color:var(--text-muted);line-height:1.4">
            Mất cả mã khôi phục? Hãy gửi yêu cầu qua trang <a href="#contact" id="lnk-contact" style="color:var(--primary)">Liên hệ &amp; Góp ý</a> kèm tên đăng nhập.
          </div>
        </form>`;
    }

    openModal(`
      <h3 class="card-title" style="margin-bottom:6px;padding-right:28px">${mode === 'forgot' ? '🔓 Khôi Phục Mật Khẩu' : '🐼 Tài Khoản Panda HSK'}</h3>
      ${mode === 'forgot' ? '' : `<p style="font-size:0.83rem;color:var(--text-muted);margin:0 0 12px">
        Đăng nhập để đồng bộ tiến độ đa thiết bị, hoặc đóng cửa sổ này để tiếp tục học ở <strong>Chế độ Khách</strong>.
      </p>`}
      ${envNotice}
      ${mode === 'forgot' ? '' : `<div style="display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:10px">
        <button type="button" class="btn ${mode === 'login' ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1" id="tab-mode-login">🔑 Đăng nhập</button>
        <button type="button" class="btn ${mode === 'register' ? 'btn-primary' : 'btn-outline'} btn-sm" style="flex:1" id="tab-mode-reg">✨ Tạo tài khoản mới</button>
      </div>`}
      ${formHtml}
    `);

    const body = document.getElementById('modal-body');
    const errEl = document.getElementById('auth-err');
    const showError = (msg) => {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    };
    const clearError = () => {
      if (!errEl) return;
      errEl.textContent = '';
      errEl.classList.add('hidden');
    };
    const val = (id) => document.getElementById(id)?.value || '';
    const goPublic = (id, tab) => {
      const el = document.getElementById(id);
      if (el) el.onclick = (e) => { e.preventDefault(); closeModal(); switchTab(tab); };
    };

    body.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', clearError));
    wirePasswordToggles(body);
    wireCapsLockWarning(body);
    goPublic('lnk-terms', 'terms');
    goPublic('lnk-privacy', 'privacy');
    goPublic('lnk-contact', 'contact');

    const tabLogin = document.getElementById('tab-mode-login');
    const tabReg = document.getElementById('tab-mode-reg');
    if (tabLogin) tabLogin.onclick = () => { if (!isSubmitting) renderAuth('login'); };
    if (tabReg) tabReg.onclick = () => { if (!isSubmitting) renderAuth('register'); };
    const guest = document.getElementById('btn-continue-guest');
    if (guest) guest.onclick = closeModal;

    // ----- Đăng nhập -----
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
      const userInp = document.getElementById('auth-user');
      (userInp.value ? document.getElementById('auth-pass') : userInp).focus();
      document.getElementById('btn-go-forgot').onclick = () => { if (!isSubmitting) renderAuth('forgot'); };
      loginForm.onsubmit = (e) => {
        e.preventDefault();
        clearError();
        runSubmit('btn-submit-login', 'Đang đăng nhập...', 'Đăng nhập vào Panda HSK', async () => {
          const res = await authLogin({ username: val('auth-user'), password: val('auth-pass') });
          if (!res.ok) return showError(res.error);
          await onAuthSuccess(res.user);
        });
      };
    }

    // ----- Đăng ký -----
    const regForm = document.getElementById('form-register');
    if (regForm) {
      document.getElementById('reg-name').focus();
      wireStrengthMeter('reg-pass', 'reg-strength');
      document.querySelectorAll('[data-pick-av]').forEach((b) => {
        b.onclick = () => {
          selectedAvatar = b.dataset.pickAv;
          document.querySelectorAll('[data-pick-av]').forEach((x) => { x.style.borderColor = 'var(--border)'; });
          b.style.borderColor = 'var(--primary)';
        };
      });

      const regUser = document.getElementById('reg-user');
      const hint = document.getElementById('reg-user-hint');
      const setHint = (text, tone = '') => {
        hint.textContent = text;
        hint.dataset.tone = tone;
      };
      regUser.addEventListener('input', () => {
        const lower = regUser.value.toLowerCase().replace(/\s+/g, '');
        if (lower !== regUser.value) regUser.value = lower;
        clearTimeout(userCheckTimer);
        const seq = ++userCheckSeq;
        if (!lower) return setHint('');
        const local = validateUsername(lower);
        if (!local.ok) return setHint(local.error, 'bad');
        setHint('Đang kiểm tra tên đăng nhập...', 'muted');
        userCheckTimer = setTimeout(async () => {
          const r = await checkUsernameAvailability(lower);
          if (seq !== userCheckSeq) return;
          if (r.available === true) setHint('✅ Tên đăng nhập có thể sử dụng', 'ok');
          else if (r.available === false) setHint(`❌ ${r.reason || 'Tên đăng nhập đã có người sử dụng.'}`, 'bad');
          else setHint('');
        }, 450);
      });

      regForm.onsubmit = (e) => {
        e.preventDefault();
        clearError();
        const p1 = val('reg-pass');
        const pCheck = validateNewPassword(p1, val('reg-user'));
        if (!pCheck.ok) return showError(pCheck.error);
        if (p1 !== val('reg-pass2')) return showError('Mật khẩu nhập lại không khớp.');
        runSubmit('btn-submit-reg', 'Đang tạo tài khoản...', '🚀 Tạo tài khoản & Vào học ngay', async () => {
          const res = await authRegister({
            displayName: val('reg-name'),
            username: val('reg-user'),
            password: p1,
            avatar: selectedAvatar,
            website: val('reg-website')
          });
          if (!res.ok) return showError(res.error);
          await onAuthSuccess(res.user, res.recoveryCode, '🎉 Tạo tài khoản thành công!');
        });
      };
    }

    // ----- Quên mật khẩu -----
    const forgotForm = document.getElementById('form-forgot');
    if (forgotForm) {
      wireStrengthMeter('fg-pass', 'fg-strength');
      const userInp = document.getElementById('fg-user');
      (userInp.value ? document.getElementById('fg-code') : userInp).focus();
      const codeInp = document.getElementById('fg-code');
      codeInp.addEventListener('input', () => {
        const raw = codeInp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
        const formatted = raw.match(/.{1,4}/g)?.join('-') || '';
        if (formatted !== codeInp.value) codeInp.value = formatted;
      });
      document.getElementById('btn-back-login').onclick = () => { if (!isSubmitting) renderAuth('login'); };
      forgotForm.onsubmit = (e) => {
        e.preventDefault();
        clearError();
        const p1 = val('fg-pass');
        const pCheck = validateNewPassword(p1, val('fg-user'));
        if (!pCheck.ok) return showError(pCheck.error);
        if (p1 !== val('fg-pass2')) return showError('Mật khẩu nhập lại không khớp.');
        runSubmit('btn-submit-forgot', 'Đang đặt lại mật khẩu...', '🔓 Đặt lại mật khẩu & Đăng nhập', async () => {
          const res = await authResetPassword({
            username: val('fg-user'),
            recoveryCode: val('fg-code'),
            newPassword: p1
          });
          if (!res.ok) return showError(res.error);
          rememberUsername(validateUsername(val('fg-user')).username);
          await onAuthSuccess(res.user, res.recoveryCode, '✅ Đã đặt lại mật khẩu! Mã khôi phục cũ đã hết hiệu lực — đây là mã mới.');
        });
      };
    }
  };

  renderAuth(defaultMode);
}

function openAITutorModal() {
  openModal(`
    <h3 class="card-title">🐼 Sư Phụ AI Panda — Chuyên Gia Tiếng Trung</h3>
    <div id="ai-chat-box" class="chat-stream"><div class="chat-msg ai"><strong>Sư phụ Panda:</strong> 你好！Bạn muốn hỏi gì về tiếng Trung hôm nay?</div></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <input class="panda-input" type="text" id="ai-input" placeholder="Nhập câu hỏi..." maxlength="600" />
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
    } catch {
      document.getElementById(lid).textContent = 'Lỗi kết nối AI.';
    }
    box.scrollTop = box.scrollHeight;
  };
  document.getElementById('ai-send').onclick = send;
  document.getElementById('ai-input').onkeydown = (e) => { if (e.key === 'Enter') send(); };
}

function openCreateDeckModal(onDone) {
  openModal(`
    <h3 class="card-title">➕ Tạo Bộ Thẻ Từ Vựng Mới</h3>
    <p style="font-size:0.85rem;color:var(--text-muted)">Mỗi từ 1 dòng: <strong>Chữ Hán | Pinyin | Nghĩa Việt</strong></p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <input class="panda-input" type="text" id="deck-title-inp" placeholder="Tên bộ thẻ..." />
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
            <span>${title} · Từ ${idx + 1}/${words.length}</span>
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
        if (isOk) {
          score++;
          btn.classList.add('correct');
        } else {
          btn.classList.add('wrong');
        }
        setTimeout(() => {
          idx++;
          renderQ();
        }, 550);
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
    const cloudRows = (cloudLeaderboard || []).map((r) => ({
      name: r.display_name,
      avatar: r.avatar_url || '🐼',
      lv: r.level || 1,
      xp: Number(r.xp || 0),
      isReal: true
    }));
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
            <p class="hero-sub">Kho từ vựng <strong>${allWords.length.toLocaleString()} từ</strong> (HSK 1–9) · ${store.user ? `Đã kết nối tài khoản <strong>@${store.currentUsername}</strong>` : 'Đang học ở <strong>Chế độ Khách</strong> (lưu tự động trên trình duyệt)'}</p>
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
              ${leaderboard.map((u, idx) => `<div class="rank-row" style="${u.isReal ? 'border:1px solid var(--primary);' : ''}"><span><strong>#${idx + 1}</strong> ${esc(u.avatar)} ${esc(u.name)} · Lv.${u.lv}</span><span class="rank-badge">${u.xp} XP</span></div>`).join('')}
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
            <div class="card-header"><h3 class="card-title">✨ LỘ TRÌNH 9 CẤP ĐỘ (HSK 1 – HSK 9)</h3><button class="btn btn-gold btn-sm" id="btn-quick-review">🔁 Ôn tập (${due.length} từ)</button></div>
            <div class="deck-grid">
              ${LEVELS.map((l) => {
                const lvlWords = allWords.filter((w) => w.level === l);
                const learnedCnt = lvlWords.filter((w) => store.state.srs[w.hanzi]).length;
                return `<div class="deck-card" data-open-journey="${l}"><div><div style="display:flex;justify-content:space-between;align-items:center"><strong style="color:var(--primary)">${levelLabel(l)}</strong><span class="badge-pill">${learnedCnt}/${lvlWords.length} từ</span></div><p style="font-size:0.8rem;color:var(--text-muted);margin:6px 0 0">Tổng ${lvlWords.length.toLocaleString()} từ · ${Math.max(1, Math.ceil(lvlWords.length / 50))} chương</p></div><button class="btn btn-primary btn-sm btn-block">🗺️ Học lộ trình</button></div>`;
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
      b.onclick = () => {
        p.activeWorld = Number(b.dataset.setWorld);
        store.save();
        updateTopbar();
        renderView('home');
      };
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
          <div><h1 class="hero-title">🗺️ Hành Trình ${levelLabel(p.activeWorld)} (${levelWords.length.toLocaleString()} từ)</h1><p class="hero-sub">Tiến độ: đã học <strong>${totalLearnedInLevel}/${levelWords.length.toLocaleString()} từ</strong></p></div>
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
                return `<button class="btn ${isAct ? 'btn-primary' : 'btn-outline'}" style="justify-content:space-between;width:100%" data-chap="${cIdx}"><span>Chương ${cIdx + 1}</span><span class="badge-pill" style="${isAct ? 'color:#1e293b' : ''}">${done}/${slice.length} từ</span></button>`;
              }).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3 class="card-title">🏯 Chương ${selectedChapter + 1} (${chapterWords.length} từ)</h3><button class="btn btn-gold btn-sm" id="btn-test-chapter">🎯 Kiểm tra Chương ${selectedChapter + 1}</button></div>
            <div style="display:flex;flex-direction:column;gap:12px">
              ${Array.from({ length: lessonsCount }, (_, lIdx) => {
                const lw = chapterWords.slice(lIdx * 10, (lIdx + 1) * 10);
                const doneCnt = lw.filter((w) => store.state.srs[w.hanzi]).length;
                const pct = Math.round((doneCnt / Math.max(1, lw.length)) * 100);
                return `<div style="padding:14px;border:1.5px solid var(--border);border-radius:14px;background:var(--bg)">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><strong>Bài ${lIdx + 1}: ${lw.slice(0, 4).map((x) => x.hanzi).join(' · ')}...</strong><span class="badge-pill">${doneCnt}/${lw.length} từ (${pct}%)</span></div>
                  <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:10px"><div style="height:100%;width:${pct}%;background:var(--green)"></div></div>
                  <div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm" data-preview-lesson="${lIdx}">👁️ Xem từ</button><button class="btn btn-primary btn-sm" data-study-lesson="${lIdx}">▶️ Vào học</button></div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>`;
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
        b.onclick = () => {
          selectedChapter = Number(b.dataset.chap);
          renderJourney();
        };
      });
      document.getElementById('btn-test-chapter').onclick = () => startQuickQuiz(chapterWords.slice(0, 15), `Kiểm tra Chương ${selectedChapter + 1}`, 'journey');
      document.querySelectorAll('[data-study-lesson]').forEach((b) => {
        b.onclick = () => {
          const i = Number(b.dataset.studyLesson);
          startQuickQuiz(chapterWords.slice(i * 10, (i + 1) * 10), `Chương ${selectedChapter + 1} - Bài ${i + 1}`, 'journey');
        };
      });
      document.querySelectorAll('[data-preview-lesson]').forEach((b) => {
        b.onclick = () => {
          const i = Number(b.dataset.previewLesson);
          const lw = chapterWords.slice(i * 10, (i + 1) * 10);
          openModal(`<h3 class="card-title">📖 Từ vựng Bài ${i + 1} (${lw.length} từ)</h3><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${lw.map((w) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--border);border-radius:10px"><div><strong class="hanzi-md">${w.hanzi}</strong> <span style="color:var(--primary)">${w.pinyin}</span><div style="font-size:0.85rem;color:var(--text-muted)">${w.meaning}</div></div><button class="btn btn-outline btn-sm" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊</button></div>`).join('')}</div>`);
        };
      });
    };
    renderJourney();
  } else if (tab === 'practice') {
    let filterLevel = 0, statusTab = 'all', page = 1;
    const pageSize = 30;
    const totalCount = allWords.length;
    const masteredCount = allWords.filter((w) => (store.state.srs[w.hanzi]?.streak || 0) >= 3).length;
    const learningCount = allWords.filter((w) => store.state.srs[w.hanzi] && (store.state.srs[w.hanzi].streak || 0) < 3).length;
    const unlearnedCount = Math.max(0, totalCount - masteredCount - learningCount);

    main.innerHTML = `
      <div class="card">
        <div class="card-header"><h2 class="card-title">📜 Sổ Từ Vựng (${totalCount.toLocaleString()} từ)</h2></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <button class="btn btn-primary btn-sm" data-st-tab="all">📚 Tất cả (${totalCount.toLocaleString()})</button>
          <button class="btn btn-outline btn-sm" data-st-tab="unlearned">🆕 Chưa học (${unlearnedCount.toLocaleString()})</button>
          <button class="btn btn-outline btn-sm" data-st-tab="learning">🔁 Đang ôn (${learningCount.toLocaleString()})</button>
          <button class="btn btn-outline btn-sm" data-st-tab="mastered">✅ Đã thuộc (${masteredCount.toLocaleString()})</button>
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
      document.getElementById('vocab-summary').innerHTML = `Tìm thấy <strong>${filtered.length.toLocaleString()} từ</strong> · Trang <strong>${page}/${totalPages}</strong>`;
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
      document.querySelectorAll('[data-say]').forEach((b) => {
        b.onclick = (e) => { e.stopPropagation(); speakZh(b.dataset.say); };
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
    const draft = store.state.inProgressExam;
    main.innerHTML = `
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:8px">
          <div>
            <h2 class="card-title">📋 Phòng Thi Thực Chiến Panda HSK (HSK 1 – HSK 9)</h2>
            <p style="font-size:0.84rem;color:var(--text-muted);margin:4px 0 0">
              Cấu trúc chuẩn 3 kỹ năng (🎧 Nghe hiểu · 📖 Đọc hiểu · ✍️ Viết &amp; Ngữ pháp) · 4 Bộ đề chuẩn tách biệt mỗi cấp + Sinh đề chống trùng lặp.
            </p>
          </div>
          <span class="badge-pill">Thang điểm 300 · Đạt ≥ 180</span>
        </div>
        ${draft ? `<div style="padding:12px;border-radius:12px;background:var(--surface-alt);border:1.5px solid var(--primary);display:flex;justify-content:space-between;align-items:center;margin:12px 0;flex-wrap:wrap;gap:8px"><div><strong>📝 Bài thi đang làm dở:</strong> HSK ${draft.level} (<code>${draft.examId}</code>)</div><button class="btn btn-primary btn-sm" id="btn-resume-draft">▶️ Tiếp tục làm bài</button></div>` : ''}
        <div class="deck-grid" style="margin-top:12px">
          ${LEVELS.map((l) => {
            const c = EXAM_CONFIGS[l];
            const cov = getExamCoverageStats(l);
            return `<div class="deck-card" data-start-exam="${l}">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                  <strong style="color:var(--primary);font-size:1.05rem">${c.label} <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600">· ${c.standard || ''}</span></strong>
                  <span class="badge-pill">${c.totalQ} câu · ${c.minutes}p</span>
                </div>
                <p style="font-size:0.8rem;color:var(--text-muted);margin:6px 0 8px;line-height:1.4">${c.desc}</p>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
                  ${(c.skillsMeta || []).map((sm) => `<span class="badge-pill" style="font-size:0.72rem;background:var(--surface-alt)">${sm}</span>`).join('')}
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted)">
                  Bộ đề chuẩn đã hoàn thành: <strong>${cov.completedSets.length}/4</strong> · Đã luyện: <strong>${cov.totalSeenItems}</strong> mục
                </div>
              </div>
              <button class="btn btn-primary btn-sm btn-block">📝 Chọn bộ đề &amp; Vào thi</button>
            </div>`;
          }).join('')}
        </div>
      </div>
      ${history.length ? `<div class="card"><h3 class="card-title">🏅 Lịch Sử Thi (${esc(p.name)})</h3><div class="rank-list">${history.slice(0, 12).map((h) => `<div class="rank-row"><span><strong>HSK ${h.level}</strong> · <code>${esc(h.examId)}</code> (${esc(h.date)})</span><span style="font-weight:800;color:${h.passed ? 'var(--green)' : 'var(--primary)'}">${h.hsk300Score ? `${h.hsk300Score}/300 đ (${h.score}%)` : `${h.score}/${h.maxScore}`} · ${h.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</span></div>`).join('')}</div></div>` : ''}`;
    if (document.getElementById('btn-resume-draft')) {
      document.getElementById('btn-resume-draft').onclick = () => launchExamUI(main, draft.level, allWords, () => renderView('exam'), draft);
    }
    document.querySelectorAll('[data-start-exam]').forEach((card) => {
      card.onclick = () => launchExamUI(main, Number(card.dataset.startExam), allWords, () => renderView('exam'));
    });
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
  currentTab = tab;
  document.querySelectorAll('.side-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('sidebar').classList.remove('open');
  renderView(tab);
}

async function boot() {
  store.onSyncStatus(renderSyncBadge);
  updateTopbar();
  document.querySelectorAll('.side-item').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
  document.querySelectorAll('[data-pub-link]').forEach((a) => {
    a.onclick = (e) => { e.preventDefault(); switchTab(a.dataset.pubLink); };
  });
  document.getElementById('btn-home').onclick = () => switchTab('home');
  document.getElementById('btn-ai-tutor').onclick = openAITutorModal;
  document.getElementById('btn-auth-sidebar').onclick = () => openAuthModal('login');
  document.getElementById('ui-user-badge').onclick = () => openAuthModal('login');
  document.getElementById('ui-sync-status').onclick = () => openAuthModal('login');
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-backdrop').onclick = (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  };
  document.getElementById('btn-toggle-sidebar').onclick = () => document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('btn-mobile-menu').onclick = () => document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('btn-theme-top').onclick = () => {
    store.state.settings.theme = store.state.settings.theme === 'light' ? 'dark' : 'light';
    store.save();
    updateTopbar();
  };

  const searchInp = document.getElementById('global-dict-search');
  const drop = document.getElementById('global-search-dropdown');
  searchInp.oninput = () => {
    const q = searchInp.value.trim().toLowerCase();
    if (!q) {
      drop.classList.add('hidden');
      return;
    }
    const hits = ALL_WORDS.filter((w) => w.hanzi.includes(q) || w.pinyin.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)).slice(0, 8);
    drop.classList.remove('hidden');
    drop.innerHTML = hits.length
      ? hits.map((w) => `<div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><div><strong>${w.hanzi}</strong> <span style="color:var(--primary)">${w.pinyin}</span> · ${w.meaning}</div><button class="btn btn-outline btn-sm" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊</button></div>`).join('')
      : `<div style="padding:10px;font-size:0.85rem;color:var(--text-muted)">Không tìm thấy "${q}"</div>`;
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dict-search-wrap')) drop.classList.add('hidden');
  });

  const restoredUser = await getRestoredUserSession();
  if (restoredUser) {
    await store.bindUser(restoredUser);
    updateTopbar();
  }
  const sb = await getSupabase();
  if (sb) {
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await store.bindUser(null);
        updateTopbar();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        store.user = session.user;
      }
    });
  }

  cloudLeaderboard = await fetchLeaderboard();
  await dataLoader.init();
  ALL_WORDS = await dataLoader.getAllLoadedWords();
  renderView('home');
  if (store.user) await checkGuestAndLegacyMigrationPrompt();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

boot();