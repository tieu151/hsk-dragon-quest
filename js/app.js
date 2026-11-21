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
  document.getElementById('ui-level').textContent = `Cáº¥p ${lvl} Â· ${levelLabel(p.activeWorld)}`;
  document.getElementById('ui-xp-bar').style.width = `${p.xp % 100}%`;
  document.getElementById('ui-xp-text').textContent = `${p.xp % 100} / 100 XP`;
  document.getElementById('ui-streak').textContent = `ðŸ”¥ ${p.streak}`;
  document.getElementById('ui-freeze').textContent = `â„ï¸ ${p.freezes}`;
  document.getElementById('ui-coins').textContent = `ðŸª™ ${p.coins}`;
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
  openModal(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="width:40px;height:40px;border-radius:12px;background:var(--primary-grad);display:flex;align-items:center;justify-content:center;font-size:1.3rem">🧙‍♂️</div>
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

async function startQuickQuiz(words) {
  if (!words.length) return alert('ChÆ°a cÃ³ tá»« vá»±ng trong má»¥c nÃ y!');
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
          <h2>ðŸŽ‰ HoÃ n thÃ nh phiÃªn há»c!</h2>
          <p>ÄÃºng <strong>${score}/${words.length}</strong> cÃ¢u Â· Nháº­n <strong>+${score * 15} XP</strong></p>
          <button class="btn btn-primary btn-block" id="btn-back-home">Vá» Trang Chá»§</button>
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
          <span>CÃ¢u ${idx + 1}/${words.length}</span>
          <span>${levelLabel(target.level)}</span>
        </div>
        <div class="hanzi-xl" style="margin:14px 0 4px">${target.hanzi}</div>
        <div style="color:var(--primary);font-weight:700;margin-bottom:10px">${target.pinyin}</div>
        <button class="btn btn-outline btn-sm" id="btn-replay">ðŸ”Š Nghe láº¡i</button>
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
    const countCurrent = allWords.filter((w) => w.level === p.activeWorld).length;
    main.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">ðŸ‰ ChÃ o má»«ng trá»Ÿ láº¡i Long MÃ´n!</h2>
          <span class="badge-pill">${aiEnabled ? 'ðŸŸ¢ AI Online' : 'âšª Offline Mode'}</span>
        </div>
        <p style="margin:0 0 12px;font-size:0.92rem">Tá»•ng kho: <strong>${allWords.length.toLocaleString()}</strong> tá»« (HSK 1â€“9) Â· Cáº¥p <strong>${levelLabel(p.activeWorld)}</strong>: <strong>${countCurrent.toLocaleString()}</strong> tá»« Â· Cáº§n Ã´n: <strong>${due.length}</strong> tá»«.</p>
        <div class="grid-2">
          <button class="btn btn-primary" id="btn-learn-new">âš¡ Há»c ${fresh.length} tá»« má»›i</button>
          <button class="btn btn-gold" id="btn-review-due">ðŸ” Ã”n táº­p (${due.length})</button>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Chá»n cáº¥p Ä‘á»™ HSK Ä‘ang luyá»‡n (HSK 1 â€“ 9)</h3>
        <div class="grid-4" style="margin-top:10px">
          ${LEVELS.map((l) => `<button class="btn ${p.activeWorld === l ? 'btn-primary' : 'btn-outline'} btn-sm" data-set-world="${l}">${levelLabel(l)}</button>`).join('')}
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
    const totalStages = Math.ceil(levelWords.length / 10);
    const showStages = Math.min(totalStages, 50);
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">ðŸ—ºï¸ HÃ nh TrÃ¬nh ${levelLabel(p.activeWorld)} (${levelWords.length.toLocaleString()} tá»«)</h2>
        <p style="font-size:0.88rem;color:var(--text-muted)">Hiá»ƒn thá»‹ ${showStages}/${totalStages} cháº·ng Ä‘áº§u (10 tá»«/cháº·ng). Chá»n cháº·ng Ä‘á»ƒ chinh phá»¥c:</p>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:58dvh;overflow-y:auto">
          ${Array.from({ length: showStages }, (_, idx) => {
            const slice = levelWords.slice(idx * 10, idx * 10 + 10);
            return `<button class="btn btn-outline" style="justify-content:space-between" data-stage="${idx}">
              <span>ðŸ¯ Cháº·ng ${idx + 1}: ${slice[0]?.hanzi} Â· ${slice[1]?.hanzi || ''} (${slice.length} tá»«)</span>
              <span>â–¶ï¸</span>
            </button>`;
          }).join('')}
        </div>
      </div>`;
    document.querySelectorAll('[data-stage]').forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.stage);
        startQuickQuiz(levelWords.slice(i * 10, i * 10 + 10));
      };
    });
  } else if (tab === 'arcade') {
    const sample = allWords.filter((w) => w.level === p.activeWorld).sort(() => Math.random() - 0.5).slice(0, 10);
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">ðŸŽ® Äáº¥u TrÆ°á»ng Luyá»‡n Pháº£n Xáº¡</h2>
        <p style="font-size:0.9rem">Luyá»‡n pháº£n xáº¡ nhanh 10 tá»« ngáº«u nhiÃªn cáº¥p <strong>${levelLabel(p.activeWorld)}</strong>.</p>
        <button class="btn btn-primary btn-block" id="btn-start-arcade">ðŸš€ Báº¯t Ä‘áº§u ngay</button>
      </div>`;
    document.getElementById('btn-start-arcade').onclick = () => startQuickQuiz(sample);
  } else if (tab === 'vocab') {
    let filterLevel = 0;
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">ðŸ“œ Sá»• Tá»« Vá»±ng (${allWords.length.toLocaleString()} tá»«)</h2>
        <div style="display:flex;gap:8px;margin:10px 0">
          <input type="search" id="vocab-search" placeholder="TÃ¬m chá»¯ HÃ¡n, pinyin hoáº·c nghÄ©a..." />
          <select id="vocab-level-filter" style="width:130px;flex-shrink:0">
            <option value="0">Táº¥t cáº£ cáº¥p</option>
            ${LEVELS.map((l) => `<option value="${l}">${levelLabel(l)}</option>`).join('')}
          </select>
        </div>
        <div id="vocab-list" style="display:flex;flex-direction:column;gap:8px;max-height:55dvh;overflow-y:auto"></div>
      </div>`;
    const renderList = () => {
      const k = document.getElementById('vocab-search').value.trim().toLowerCase();
      const filtered = allWords.filter((w) => {
        if (filterLevel && w.level !== filterLevel) return false;
        return !k || w.hanzi.includes(k) || w.pinyin.toLowerCase().includes(k) || w.meaning.toLowerCase().includes(k);
      }).slice(0, 80);
      document.getElementById('vocab-list').innerHTML = filtered.map((w) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--border);border-radius:10px">
          <div>
            <span class="badge-pill" style="margin-right:4px">${levelLabel(w.level)}</span>
            <strong class="hanzi-md">${w.hanzi}</strong> <span style="color:var(--primary)">${w.pinyin}</span>
            <div style="font-size:0.85rem;color:var(--text-muted)">${w.meaning}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge-pill">${getWordStatus(store.state.srs[w.hanzi])}</span>
            <button class="btn btn-outline btn-sm" data-say="${w.hanzi}">ðŸ”Š</button>
          </div>
        </div>`).join('');
      document.querySelectorAll('[data-say]').forEach((b) => { b.onclick = () => tts.speak(b.dataset.say); });
    };
    renderList();
    document.getElementById('vocab-search').oninput = renderList;
    document.getElementById('vocab-level-filter').onchange = (e) => { filterLevel = Number(e.target.value); renderList(); };
  } else if (tab === 'stats') {
    const learned = Object.keys(store.state.srs).length;
    const mastered = Object.values(store.state.srs).filter((r) => r.streak >= 3).length;
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">ðŸ“Š Thá»‘ng KÃª TrÃ­ Nhá»›</h2>
        <div class="grid-2" style="margin-top:10px">
          <div class="card"><strong>${learned}</strong><div style="font-size:0.82rem;color:var(--text-muted)">Tá»« Ä‘Ã£ tiáº¿p xÃºc</div></div>
          <div class="card"><strong>${mastered}</strong><div style="font-size:0.82rem;color:var(--text-muted)">Tá»« Ä‘Ã£ thuá»™c</div></div>
        </div>
      </div>`;
  } else if (tab === 'profile') {
    main.innerHTML = `
      <div class="card">
        <h2 class="card-title">ðŸ… Há»“ SÆ¡ & CÃ i Äáº·t</h2>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
          <button class="btn btn-outline" id="btn-toggle-theme">ðŸŒ“ Äá»•i giao diá»‡n SÃ¡ng / Tá»‘i</button>
          <button class="btn btn-outline" id="btn-export">ðŸ“¤ Xuáº¥t báº£n sao lÆ°u JSON</button>
          <button class="btn btn-danger" id="btn-reset">ðŸ—‘ï¸ XÃ³a toÃ n bá»™ dá»¯ liá»‡u há»c</button>
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
      if (confirm('XÃ³a toÃ n bá»™ tiáº¿n Ä‘á»™?')) { store.resetAll(); updateTopbar(); renderView('home'); }
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