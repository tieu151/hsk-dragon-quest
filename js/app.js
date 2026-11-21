import { store } from './storage/db.js';
import { dataLoader } from './data/loader.js';
import { getDueWords, getNewWords, recordReview, getWordStatus, getTodayStr } from './memory/srs.js';
import { tts } from './audio/tts.js';

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
  document.getElementById('ui-level').textContent = `Cấp ${lvl} · HSK ${p.activeWorld}`;
  document.getElementById('ui-xp-bar').style.width = `${p.xp % 100}%`;
  document.getElementById('ui-xp-text').textContent = `${p.xp % 100} / 100 XP`;
  document.getElementById('ui-streak').textContent = `🔥 ${p.streak}`;
  document.getElementById('ui-freeze').textContent = `❄️ ${p.freezes}`;
  document.getElementById('ui-coins').textContent = `🪙 ${p.coins}`;
  document.documentElement.setAttribute('data-theme', store.state.settings.theme);
  document.documentElement.setAttribute('data-world', String(p.activeWorld));
}

function openModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function openAITutorModal() {
  const lvl = store.state.profile.activeWorld;
  openModal(`
    <h3 class="card-title">🧙‍♂️ Sư Phụ AI (HSK ${lvl})</h3>
    <p style="font-size:0.85rem;color:var(--text-muted)">Hỏi cách dùng từ, đặt câu hoặc hội thoại thực tế theo cấp HSK ${lvl}.</p>
    <div id="ai-chat-box" style="min-height:140px;max-height:260px;overflow-y:auto;background:var(--surface-alt);padding:10px;border-radius:10px;margin-bottom:10px;font-size:0.92rem">
      <div><strong>Sư phụ:</strong> 你好！(Nǐ hǎo!) Hôm nay con muốn luyện từ vựng hay đặt câu nào?</div>
    </div>
    <div style="display:flex;gap:8px">
      <input type="text" id="ai-input" placeholder="Ví dụ: Phân biệt 二 và 两..." maxlength="300" />
      <button class="btn btn-primary" id="ai-send">Gửi</button>
    </div>
  `);
  const send = async () => {
    const inp = document.getElementById('ai-input');
    const box = document.getElementById('ai-chat-box');
    const msg = inp.value.trim();
    if (!msg) return;
    inp.value = '';
    box.innerHTML += `<div style="margin-top:8px"><strong>Bạn:</strong> ${msg}</div>`;
    const loadingId = 'ai-load-' + Date.now();
    box.innerHTML += `<div id="${loadingId}" style="margin-top:6px;color:var(--text-muted)">Sư phụ đang viết...</div>`;
    box.scrollTop = box.scrollHeight;
    try {
      const res = await fetch('./api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, level: lvl })
      });
      const data = await res.json();
      document.getElementById(loadingId).innerHTML = `<strong>Sư phụ:</strong> ${(data.reply || data.error || '').replace(/\n/g, '<br>')}`;
    } catch {
      document.getElementById(loadingId).textContent = 'Lỗi kết nối máy chủ AI.';
    }
    box.scrollTop = box.scrollHeight;
  };
  document.getElementById('ai-send').onclick = send;
  document.getElementById('ai-input').onkeydown = (e) => { if (e.key === 'Enter') send(); };
}

async function startQuickQuiz(words) {
  if (!words.length) return alert('Chưa có từ vựng trong mục này!');
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
        <div class="card" style="text-align:center">
          <h2>🎉 Hoàn thành phiên học!</h2>
          <p>Đúng <strong>${score}/${words.length}</strong> câu · Nhận <strong>+${score * 15} XP</strong></p>
          <button class="btn btn-primary btn-block" id="btn-back-home">Về Trang Chủ</button>
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
      <div class="card" style="text-align:center">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted)">
          <span>Câu ${idx + 1}/${words.length}</span>
          <span>HSK ${target.level}</span>
        </div>
        <div class="hanzi-xl" style="margin:14px 0 4px">${target.hanzi}</div>
        <div style="color:var(--primary);font-weight:700;margin-bottom:10px">${target.pinyin}</div>
        <button class="btn btn-outline btn-sm" id="btn-replay">🔊 Nghe lại</button>
      </div>
      <div class="options-grid">
        ${options.map((o, i) => `<button class="option-btn" data-hanzi="${o.hanzi}"><strong>${i + 1}.</strong> ${o.meaning}</button>`).join('')}
      </div>
    `;
    document.getElementById('btn-replay').onclick = () => tts.speak(target.hanzi);
    document.querySelectorAll('.option-btn').forEach((btn) => {
      btn.onclick = () => {
        const isOk = btn.dataset.hanzi === target.hanzi;
        const rt = Math.round(performance.now() - t0);
        recordReview(target.hanzi, isOk, rt);
        if (isOk) { score++; btn.classList.add('correct'); }
        else { btn.classList.add('wrong'); }
        setTimeout(() => { idx++; renderQ(); }, 650);
      };
    });
  };
  renderQ();
}

async function renderView(tab) {
  const main = document.getElementById('main-view');
  const p = store.state.profile;
  const allWords = await dataLoader.getAllLoadedWords();

  if (tab === 'home') {
    const due = getDueWords(allWords);
    const fresh = getNewWords(allWords, p.activeWorld, 6);
    main.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">🐉 Chào mừng trở lại Long Môn!</h2>
          <span class="badge-pill">${aiEnabled ? '🟢 AI Online' : '⚪ Offline Mode'}</span>
        </div>
        <p style="margin:0 0 12px;font-size:0.92rem">Kho từ hiện có: <strong>${allWords.length}</strong> từ HSK 1–5 · Cần ôn hôm nay: <strong>${due.length}</strong> từ.</p>
        <div class="grid-2">
          <button class="btn btn-primary" id="btn-learn-new">⚡ Học ${fresh.length} từ mới</button>
          <button class="btn btn-gold" id="btn-review-due">🔁 Ôn tập (${due.length})</button>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Chọn cấp độ HSK đang luyện</h3>
        <div class="grid-3" style="margin-top:10px">
          ${[1,2,3,4,5].map((l) => `<button class="btn ${p.activeWorld === l ? 'btn-primary' : 'btn-outline'} btn-sm" data-set-world="${l}">HSK ${l}</button>`).join('')}
        </div>
      </div>
    `;
    document.getElementById('btn-learn-new').onclick = () => startQuickQuiz(fresh);
    document.getElementById('btn-review-due').onclick = () => startQuickQuiz(due.length ? due : fresh);
    document.querySelectorAll('[data-set-world]').forEach((b) => {
      b.onclick = () => { p.activeWorld = Number(b.dataset.setWorld); store.save(); updateTopbar(); renderView('home'); };
    });
  } else if (tab === 'map') {
    const levelWords = allWords.filter((w) => w.level === p.activeWorld);
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">🗺️ Hành Trình Thế Giới ${p.activeWorld} (HSK ${p.activeWorld})</h2>
        <p style="font-size:0.88rem;color:var(--text-muted)">Tổng ${levelWords.length} từ vựng. Chọn chặng để chinh phục:</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${Array.from({ length: Math.ceil(levelWords.length / 8) }, (_, idx) => {
            const slice = levelWords.slice(idx * 8, idx * 8 + 8);
            return `<button class="btn btn-outline" style="justify-content:space-between" data-stage="${idx}">
              <span>🏯 Chặng ${idx + 1}: ${slice[0]?.hanzi} ... (${slice.length} từ)</span>
              <span>▶️</span>
            </button>`;
          }).join('')}
        </div>
      </div>`;
    document.querySelectorAll('[data-stage]').forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.stage);
        startQuickQuiz(levelWords.slice(i * 8, i * 8 + 8));
      };
    });
  } else if (tab === 'arcade') {
    const sample = allWords.filter((w) => w.level === p.activeWorld).sort(() => Math.random() - 0.5).slice(0, 10);
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">🎮 Đấu Trường Luyện Phản Xạ</h2>
        <p style="font-size:0.9rem">Luyện phản xạ nhanh 10 từ ngẫu nhiên cấp HSK ${p.activeWorld}.</p>
        <button class="btn btn-primary btn-block" id="btn-start-arcade">🚀 Bắt đầu ngay</button>
      </div>`;
    document.getElementById('btn-start-arcade').onclick = () => startQuickQuiz(sample);
  } else if (tab === 'vocab') {
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">📜 Sổ Từ Vựng (${allWords.length} từ)</h2>
        <input type="search" id="vocab-search" placeholder="Tìm chữ Hán, pinyin hoặc nghĩa Việt..." style="margin:10px 0" />
        <div id="vocab-list" style="display:flex;flex-direction:column;gap:8px;max-height:55dvh;overflow-y:auto"></div>
      </div>`;
    const renderList = (q = '') => {
      const k = q.toLowerCase();
      const filtered = allWords.filter((w) => !k || w.hanzi.includes(k) || w.pinyin.toLowerCase().includes(k) || w.meaning.toLowerCase().includes(k)).slice(0, 60);
      document.getElementById('vocab-list').innerHTML = filtered.map((w) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--border);border-radius:10px">
          <div>
            <strong class="hanzi-md">${w.hanzi}</strong> <span style="color:var(--primary)">${w.pinyin}</span>
            <div style="font-size:0.85rem;color:var(--text-muted)">${w.meaning}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge-pill">${getWordStatus(store.state.srs[w.hanzi])}</span>
            <button class="btn btn-outline btn-sm" data-say="${w.hanzi}">🔊</button>
          </div>
        </div>`).join('');
      document.querySelectorAll('[data-say]').forEach((b) => { b.onclick = () => tts.speak(b.dataset.say); });
    };
    renderList();
    document.getElementById('vocab-search').oninput = (e) => renderList(e.target.value);
  } else if (tab === 'stats') {
    const learned = Object.keys(store.state.srs).length;
    const mastered = Object.values(store.state.srs).filter((r) => r.streak >= 3).length;
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">📊 Thống Kê Trí Nhớ</h2>
        <div class="grid-2" style="margin-top:10px">
          <div class="card"><strong>${learned}</strong><div style="font-size:0.82rem;color:var(--text-muted)">Từ đã tiếp xúc</div></div>
          <div class="card"><strong>${mastered}</strong><div style="font-size:0.82rem;color:var(--text-muted)">Từ đã thuộc</div></div>
        </div>
      </div>`;
  } else if (tab === 'profile') {
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">🏅 Hồ Sơ & Cài Đặt</h2>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
          <button class="btn btn-outline" id="btn-toggle-theme">🌓 Đổi giao diện Sáng / Tối</button>
          <button class="btn btn-outline" id="btn-export">📤 Xuất bản sao lưu JSON</button>
          <button class="btn btn-danger" id="btn-reset">🗑️ Xóa toàn bộ dữ liệu học</button>
        </div>
      </div>`;
    document.getElementById('btn-toggle-theme').onclick = () => {
      store.state.settings.theme = store.state.settings.theme === 'light' ? 'dark' : 'light';
      store.save(); updateTopbar();
    };
    document.getElementById('btn-export').onclick = () => {
      const blob = new Blob([store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'longmon-hsk-backup.json'; a.click();
    };
    document.getElementById('btn-reset').onclick = () => {
      if (confirm('Xóa toàn bộ tiến độ?')) { store.resetAll(); updateTopbar(); renderView('home'); }
    };
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  renderView(tab);
}

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  updateTopbar();
  await dataLoader.init();
  await checkAIBackend();
  document.querySelectorAll('.nav-btn').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
  document.getElementById('btn-home').onclick = () => switchTab('home');
  document.getElementById('btn-ai-tutor').onclick = openAITutorModal;
  document.getElementById('modal-close').onclick = closeModal;
  renderView('home');
}
boot();