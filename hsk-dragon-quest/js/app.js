import { store } from './storage/db.js';
import { dataLoader } from './data/loader.js';
import {
  renderHomeView,
  renderMapView,
  renderArcadeView,
  renderVocabBookView,
  renderStatsView,
  renderProfileView,
  renderResultScreen
} from './ui/views.js';

let currentTab = 'home';
let allWordsCache = [];

async function bootstrap() {
  const { settings, profile } = store.state;
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.setAttribute('data-world', String(profile.activeWorld || 1));
  document.documentElement.setAttribute('data-skin', profile.activeSkin || 'default');
  document.documentElement.style.setProperty('--hanzi-scale', String(settings.hanziScale || 1));

  await store.initIndexedDB();
  await dataLoader.init();
  allWordsCache = await dataLoader.getAllLoadedWords();

  registerServiceWorker();
  setupNavigation();
  setupModal();
  checkAiTutorAvailability();
  refreshTopBar();
  navigate('home');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function refreshTopBar() {
  const p = store.state.profile;
  const level = Math.floor(p.xp / 100) + 1;
  const currentLevelXp = p.xp % 100;

  document.getElementById('ui-level').textContent = `Cấp ${level} · HSK ${p.activeWorld}`;
  document.getElementById('ui-xp-bar').style.width = `${currentLevelXp}%`;
  document.getElementById('ui-xp-text').textContent = `${currentLevelXp} / 100 XP`;
  document.getElementById('ui-streak').textContent = `🔥 ${p.streak}`;
  document.getElementById('ui-freeze').textContent = `❄️ ${p.freezes}`;
  document.getElementById('ui-coins').textContent = `🪙 ${p.coins}`;
}

function navigate(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const main = document.getElementById('main-view');
  const handleResult = (summary) => {
    refreshTopBar();
    renderResultScreen(main, summary, () => navigate(currentTab));
  };

  if (tab === 'home') renderHomeView(main, allWordsCache, handleResult);
  else if (tab === 'map') renderMapView(main, allWordsCache, handleResult);
  else if (tab === 'arcade') renderArcadeView(main, allWordsCache, handleResult);
  else if (tab === 'vocab') renderVocabBookView(main, allWordsCache);
  else if (tab === 'stats') renderStatsView(main, allWordsCache);
  else if (tab === 'profile') renderProfileView(main, () => {
    refreshTopBar();
    navigate('profile');
  });
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });
  document.getElementById('btn-home').addEventListener('click', () => navigate('home'));
}

function setupModal() {
  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('modal-close');
  closeBtn.onclick = () => backdrop.classList.add('hidden');
  backdrop.onclick = (e) => {
    if (e.target === backdrop) backdrop.classList.add('hidden');
  };
}

async function checkAiTutorAvailability() {
  if (!location.protocol.startsWith('http')) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const fab = document.getElementById('btn-ai-tutor');
      fab.classList.remove('hidden');
      fab.onclick = openAiTutorModal;
    }
  } catch {}
}

function openAiTutorModal() {
  const backdrop = document.getElementById('modal-backdrop');
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h3 class="card-title">🧙‍♂️ Hỏi Sư Phụ AI</h3>
    <p style="font-size:0.84rem;color:var(--text-muted)">Hỏi ngữ pháp, phân biệt từ đồng nghĩa hoặc luyện hội thoại HSK.</p>
    <div id="ai-chat-log" style="max-height:220px;overflow-y:auto;background:var(--surface-alt);padding:10px;border-radius:10px;margin:8px 0;font-size:0.9rem">
      <div><strong>Sư Phụ:</strong> Xin chào đệ tử! Hôm nay con muốn hỏi chữ Hán hay mẫu câu nào?</div>
    </div>
    <div style="display:flex;gap:8px">
      <input type="text" id="ai-chat-input" placeholder="Nhập câu hỏi tiếng Việt hoặc tiếng Trung..." />
      <button class="btn btn-primary" id="ai-chat-send">Gửi</button>
    </div>
  `;
  backdrop.classList.remove('hidden');

  body.querySelector('#ai-chat-send').onclick = async () => {
    const inp = body.querySelector('#ai-chat-input');
    const log = body.querySelector('#ai-chat-log');
    const q = inp.value.trim();
    if (!q) return;
    inp.value = '';
    log.innerHTML += `<div style="margin-top:6px"><strong>Bạn:</strong> ${q}</div>`;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, level: store.state.profile.activeWorld })
      });
      const data = await res.json();
      log.innerHTML += `<div style="margin-top:6px;color:var(--primary)"><strong>Sư Phụ:</strong> ${data.reply || 'Ta đã nhận được câu hỏi.'}</div>`;
    } catch {
      log.innerHTML += `<div style="margin-top:6px;color:var(--danger)">Không thể kết nối tới Sư Phụ AI.</div>`;
    }
    log.scrollTop = log.scrollHeight;
  };
}

bootstrap();