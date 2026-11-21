import { store } from '../storage/db.js';
import { dataLoader } from '../data/loader.js';
import { getDueWords, getWordStatus, median, getTodayStr } from '../memory/srs.js';
import { renderMascotSVG } from './mascot.js';
import { renderWeeklyReactionChart } from './charts.js';
import { ACHIEVEMENTS, SessionTracker } from '../game/engine.js';
import {
  startSmartSession,
  runQuizStage,
  startMatchMode,
  startFallingMode,
  startAudioHunterMode,
  startToneDojoMode,
  startHanziBuilderMode,
  startSentenceOrderMode,
  startBossBattleMode,
  startDailyChallengeMode,
  startPronunciationArena,
  renderStoryReader
} from '../game/modes.js';
import { tts } from '../audio/tts.js';
import { stripToneMarks } from '../scoring/pinyin-util.js';

export function renderHomeView(container, allWords, onResult) {
  const p = store.state.profile;
  const due = getDueWords(allWords, Date.now(), 50);
  const world = p.activeWorld || 1;

  const task1 = Math.min(10, p.dailyTasks.reviewsDone);
  const task2 = Math.min(5, p.dailyTasks.newLearned);
  const task3 = p.dailyTasks.gameWon ? 1 : 0;

  container.innerHTML = `
    <div class="card" style="display:flex;align-items:center;gap:14px;background:linear-gradient(135deg, var(--surface), var(--gold-light))">
      <div style="flex-shrink:0">${renderMascotSVG(due.length > 0 ? 'excited' : 'happy', p.activeMascot, 86)}</div>
      <div style="flex:1">
        <div style="font-weight:800;font-size:1.05rem;color:var(--primary)">
          ${due.length > 0 ? `Có ${due.length} từ đang chờ ôn tập!` : 'Trí nhớ đang ở đỉnh cao!'}
        </div>
        <p style="margin:4px 0 10px;font-size:0.88rem;color:var(--text-muted)">
          Phiên 5 phút: Ôn từ yếu → Học tối đa 5 từ mới → Thử thách phản xạ.
        </p>
        <button class="btn btn-primary btn-block" id="btn-play-now">🚀 Chơi Ngay (HSK ${world})</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">📋 Nhiệm vụ hôm nay</h2>
        <span class="badge-pill">Thưởng +30 Xu</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:0.9rem">
        <div>${task1 >= 10 ? '✅' : '⬜'} Ôn tập 10 lượt từ vựng (${task1}/10)</div>
        <div>${task2 >= 5 ? '✅' : '⬜'} Học 5 từ vựng mới (${task2}/5)</div>
        <div>${task3 ? '✅' : '⬜'} Hoàn thành 1 màn chơi bất kỳ (${task3}/1)</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">⚡ Truy cập nhanh chế độ nổi bật</h2>
      </div>
      <div class="grid-2">
        <button class="btn btn-outline" id="quick-daily">📅 Thử thách ngày</button>
        <button class="btn btn-outline" id="quick-pron">🎙️ Đấu trường phát âm</button>
        <button class="btn btn-outline" id="quick-boss">🐉 Đấu Boss HSK ${world}</button>
        <button class="btn btn-outline" id="quick-story">📖 Truyện ngắn HSK ${world}</button>
      </div>
    </div>
  `;

  container.querySelector('#btn-play-now').onclick = () => startSmartSession(container, world, onResult);
  container.querySelector('#quick-daily').onclick = () => startDailyChallengeMode(container, onResult);
  container.querySelector('#quick-pron').onclick = () => startPronunciationArena(container, world);
  container.querySelector('#quick-boss').onclick = () => startBossBattleMode(container, world, onResult);
  container.querySelector('#quick-story').onclick = () => {
    const story = dataLoader.stories.find((s) => s.level === world) || dataLoader.stories[0];
    renderStoryReader(container, story, () => renderHomeView(container, allWords, onResult), openWordModal);
  };
}

export function renderMapView(container, allWords, onResult) {
  const p = store.state.profile;
  const world = p.activeWorld || 1;
  const stages = dataLoader.getTopicsForLevel(world);

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🗺️ Bản Đồ Hành Trình</h2>
        <select id="world-select" aria-label="Chọn thế giới HSK" style="width:auto">
          ${[1, 2, 3, 4, 5].map((w) => `<option value="${w}" ${w === world ? 'selected' : ''}>Thế giới HSK ${w}</option>`).join('')}
        </select>
      </div>
      <p style="margin:0;font-size:0.86rem;color:var(--text-muted)">
        Chinh phục từng chặng chủ đề (~8 từ/màn) hoặc thi nhảy cấp nếu bạn đã nắm vững kiến thức.
      </p>
      <button class="btn btn-gold btn-sm" id="btn-skip-test" style="margin-top:8px">⚡ Thi nhảy cấp HSK ${world}</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px">
      ${stages
        .map((st, i) => {
          const key = `${world}_${i}`;
          const stars = p.stageStars[key] || 0;
          const prevStars = i === 0 ? 1 : p.stageStars[`${world}_${i - 1}`] || 0;
          const unlocked = prevStars > 0 || stars > 0;
          return `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;opacity:${unlocked ? 1 : 0.6}">
              <div>
                <div style="font-weight:800">Màn ${i + 1}: ${st.title}</div>
                <div style="font-size:0.85rem;color:var(--gold)">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
              </div>
              <button class="btn ${unlocked ? 'btn-primary' : 'btn-outline'} btn-sm" data-stage="${i}" ${unlocked ? '' : 'disabled'}>
                ${unlocked ? 'Chơi' : '🔒 Khóa'}
              </button>
            </div>
          `;
        })
        .join('')}

      <div class="card" style="border:2px solid var(--primary);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:800;color:var(--primary)">🐉 BOSS CUỐI THẾ GIỚI HSK ${world}</div>
          <div style="font-size:0.82rem">${p.bossDefeated[world] ? '✅ Đã hạ gục!' : 'Tổng ôn từ yếu nhất của cấp độ'}</div>
        </div>
        <button class="btn btn-danger btn-sm" id="btn-map-boss">Khiêu chiến</button>
      </div>
    </div>
  `;

  container.querySelector('#world-select').onchange = (e) => {
    const newW = Number(e.target.value);
    p.activeWorld = newW;
    document.documentElement.setAttribute('data-world', String(newW));
    store.save();
    renderMapView(container, allWords, onResult);
  };

  container.querySelector('#btn-skip-test').onclick = () => {
    const testWords = allWords.filter((w) => w.level === world).slice(0, 10);
    const tracker = new SessionTracker(`Thi Nhảy Cấp HSK ${world}`);
    runQuizStage(container, {
      title: `⚡ Thi Nhảy Cấp HSK ${world}`,
      words: testWords,
      allWords,
      tracker,
      onStageDone: () => {
        const res = tracker.finish();
        if (res.accuracy >= 80) {
          stages.forEach((_, idx) => {
            p.stageStars[`${world}_${idx}`] = Math.max(p.stageStars[`${world}_${idx}`] || 0, 2);
          });
          store.save();
        }
        onResult(res);
      }
    });
  };

  container.querySelectorAll('[data-stage]').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.stage);
      const st = stages[idx];
      const tracker = new SessionTracker(`Hành Trình HSK ${world} - Màn ${idx + 1}`);
      runQuizStage(container, {
        title: `Màn ${idx + 1} · ${st.title}`,
        words: st.words,
        allWords,
        tracker,
        onStageDone: () => onResult(tracker.finish({ stageKey: `${world}_${idx}` }))
      });
    };
  });

  container.querySelector('#btn-map-boss').onclick = () => startBossBattleMode(container, world, onResult);
}

export function renderArcadeView(container, allWords, onResult) {
  const world = store.state.profile.activeWorld || 1;
  const modes = [
    { id: 'smart', icon: '🧠', title: 'Phiên Học Thông Minh', desc: 'Ôn SRS + 5 từ mới + Tổng hợp' },
    { id: 'match', icon: '⚡', title: 'Ghép Nhanh', desc: 'Ghép cặp Hán – Pinyin – Nghĩa' },
    { id: 'falling', icon: '☄️', title: 'Từ Rơi', desc: 'Chọn nghĩa trước khi chữ chạm đáy' },
    { id: 'audio', icon: '🎧', title: 'Thợ Săn Âm Thanh', desc: 'Luyện phản xạ nghe nhận diện từ' },
    { id: 'tone', icon: '🎵', title: 'Đạo Trường Thanh Điệu', desc: 'Thanh 1–5 & biến điệu 3+3, 不, 一' },
    { id: 'hanzi', icon: '🖌️', title: 'Xếp Chữ & Luyện Nét', desc: 'Viết đúng thứ tự nét & bộ thủ' },
    { id: 'sentence', icon: '🧱', title: 'Xếp Câu', desc: 'Ghép các chữ thành câu hoàn chỉnh' },
    { id: 'boss', icon: '🐉', title: 'Đấu Boss', desc: 'Tổng ôn các từ yếu nhất của bạn' },
    { id: 'daily', icon: '📅', title: 'Thử Thách Hằng Ngày', desc: 'Bộ đề cố định theo ngày cho mọi người' },
    { id: 'pron', icon: '🎙️', title: 'Đấu Trường Phát Âm', desc: 'Chấm điểm từng âm tiết & đường pitch' },
    { id: 'story', icon: '📖', title: 'Truyện Ngắn', desc: 'Đọc hiểu song ngữ & luyện đọc to' }
  ];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🎮 11 Chế Độ Luyện Tập (HSK ${world})</h2>
        <select id="arcade-lvl" style="width:auto" aria-label="Cấp độ luyện tập">
          ${[1, 2, 3, 4, 5].map((l) => `<option value="${l}" ${l === world ? 'selected' : ''}>HSK ${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid-2">
      ${modes
        .map(
          (m) => `
        <button class="card" data-mode="${m.id}" style="text-align:left;cursor:pointer;border:1.5px solid var(--border)">
          <div style="font-size:1.5rem">${m.icon}</div>
          <div style="font-weight:800;margin:4px 0">${m.title}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${m.desc}</div>
        </button>
      `
        )
        .join('')}
    </div>
  `;

  container.querySelector('#arcade-lvl').onchange = (e) => {
    store.state.profile.activeWorld = Number(e.target.value);
    document.documentElement.setAttribute('data-world', e.target.value);
    store.save();
  };

  container.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.onclick = () => {
      const lvl = store.state.profile.activeWorld || 1;
      const m = btn.dataset.mode;
      if (m === 'smart') startSmartSession(container, lvl, onResult);
      else if (m === 'match') startMatchMode(container, lvl, onResult);
      else if (m === 'falling') startFallingMode(container, lvl, onResult);
      else if (m === 'audio') startAudioHunterMode(container, lvl, onResult);
      else if (m === 'tone') startToneDojoMode(container, lvl, onResult);
      else if (m === 'hanzi') startHanziBuilderMode(container, lvl, onResult);
      else if (m === 'sentence') startSentenceOrderMode(container, lvl, onResult);
      else if (m === 'boss') startBossBattleMode(container, lvl, onResult);
      else if (m === 'daily') startDailyChallengeMode(container, onResult);
      else if (m === 'pron') startPronunciationArena(container, lvl);
      else if (m === 'story') renderStoryListView(container, allWords);
    };
  });
}

function renderStoryListView(container, allWords) {
  const stories = dataLoader.stories;
  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">📖 Thư Viện Truyện Ngắn HSK 1–5</h2>
      <p style="margin:4px 0 0;font-size:0.85rem;color:var(--text-muted)">Bấm vào bất kỳ chữ Hán nào để tra nghĩa, hoặc dùng chế độ "Bạn đọc to" để chấm phát âm.</p>
    </div>
    ${stories
      .map((s) => {
        const chk = dataLoader.checkStoryVocabulary(s);
        return `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div>
            <span class="badge-pill">HSK ${s.level} · ${chk.ratio}% từ trong cấp</span>
            <div style="font-weight:800;margin-top:4px">${s.title} — ${s.titleVi}</div>
          </div>
          <button class="btn btn-primary btn-sm" data-open-story="${s.id}">Đọc</button>
        </div>
      `;
      })
      .join('')}
  `;

  container.querySelectorAll('[data-open-story]').forEach((b) => {
    b.onclick = () => {
      const s = stories.find((x) => x.id === b.dataset.openStory);
      renderStoryReader(container, s, () => renderStoryListView(container, allWords), openWordModal);
    };
  });
}

export function renderVocabBookView(container, allWords) {
  let query = '';
  let filterLvl = 'all';
  let filterStatus = 'all';

  function drawList() {
    const srs = store.state.srs;
    const filtered = allWords.filter((w) => {
      if (filterLvl !== 'all' && w.level !== Number(filterLvl)) return false;
      const st = getWordStatus(srs[w.hanzi]);
      if (filterStatus !== 'all' && st !== filterStatus) return false;
      if (query) {
        const q = query.toLowerCase();
        const pyNoTone = stripToneMarks(w.pinyin);
        return (
          w.hanzi.includes(q) ||
          w.pinyin.toLowerCase().includes(q) ||
          pyNoTone.includes(q) ||
          w.meaning.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const listEl = container.querySelector('#vocab-list-box');
    listEl.innerHTML = filtered
      .slice(0, 80)
      .map((w) => {
        const rec = srs[w.hanzi];
        const st = getWordStatus(rec);
        const rtText = rec && rec.rtHistory?.length ? `${(median(rec.rtHistory) / 1000).toFixed(2)}s` : '-';
        return `
          <div class="card" data-word="${w.hanzi}" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:10px 14px">
            <div>
              <span class="hanzi-md">${w.hanzi}</span>
              <span style="color:var(--primary);font-weight:700;margin-left:6px">${w.pinyin}</span>
              <div style="font-size:0.88rem">${w.meaning}</div>
            </div>
            <div style="text-align:right">
              <span class="badge-pill">${st}</span>
              <div style="font-size:0.74rem;color:var(--text-muted);margin-top:4px">HSK ${w.level} · ⚡ ${rtText}</div>
            </div>
          </div>
        `;
      })
      .join('') || `<p style="text-align:center;color:var(--text-muted)">Không tìm thấy từ phù hợp.</p>`;

    listEl.querySelectorAll('[data-word]').forEach((card) => {
      card.onclick = () => {
        const w = allWords.find((x) => x.hanzi === card.dataset.word);
        if (w) openWordModal(w);
      };
    });
  }

  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">📜 Sổ Từ Vựng (${allWords.length} từ đã nạp)</h2>
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
        <input type="search" id="vb-search" placeholder="Tìm Hán tự, pinyin không dấu (vd: nihao) hoặc nghĩa Việt..." />
        <div class="grid-2">
          <select id="vb-lvl">
            <option value="all">Tất cả cấp HSK</option>
            ${[1, 2, 3, 4, 5].map((l) => `<option value="${l}">HSK ${l}</option>`).join('')}
          </select>
          <select id="vb-status">
            <option value="all">Tất cả trạng thái</option>
            <option value="Mới">Mới</option>
            <option value="Đang học">Đang học</option>
            <option value="Quen">Quen</option>
            <option value="Thuộc">Thuộc</option>
            <option value="Thuộc lâu">Thuộc lâu</option>
          </select>
        </div>
      </div>
    </div>
    <div id="vocab-list-box" style="display:flex;flex-direction:column;gap:8px"></div>
  `;

  container.querySelector('#vb-search').oninput = (e) => { query = e.target.value.trim(); drawList(); };
  container.querySelector('#vb-lvl').onchange = (e) => { filterLvl = e.target.value; drawList(); };
  container.querySelector('#vb-status').onchange = (e) => { filterStatus = e.target.value; drawList(); };
  drawList();
}

export function renderStatsView(container, allWords) {
  const srs = store.state.srs;
  const counts = { Mới: 0, 'Đang học': 0, Quen: 0, Thuộc: 0, 'Thuộc lâu': 0 };
  allWords.forEach((w) => {
    counts[getWordStatus(srs[w.hanzi])]++;
  });

  const masteredCards = allWords.filter((w) => ['Thuộc', 'Thuộc lâu'].includes(getWordStatus(srs[w.hanzi])));

  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">⚡ Chỉ Số Phản Xạ Theo Tuần</h2>
      <div id="rt-chart-box"></div>
    </div>

    <div class="card">
      <h2 class="card-title">📈 Phân Bố Trí Nhớ</h2>
      <div class="grid-3" style="margin-top:8px;text-align:center">
        ${Object.entries(counts)
          .map(
            ([k, v]) => `
          <div style="background:var(--surface-alt);padding:10px;border-radius:10px">
            <div style="font-size:1.3rem;font-weight:800;color:var(--primary)">${v}</div>
            <div style="font-size:0.78rem">${k}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">🃏 Bộ Sưu Tập Thẻ Từ Đã Thuộc (${masteredCards.length})</h2>
      <p style="font-size:0.84rem;color:var(--text-muted)">Mỗi từ đạt trạng thái "Thuộc" (≥3 ngày & phản xạ ≤2.5s) sẽ mở khóa một thẻ vàng.</p>
      <div class="grid-3">
        ${masteredCards
          .map(
            (w) => `
          <div style="border:2px solid var(--gold);border-radius:10px;padding:8px;text-align:center;background:var(--gold-light)">
            <div class="hanzi-md">${w.hanzi}</div>
            <div style="font-size:0.78rem;font-weight:700">${w.pinyin}</div>
            <div style="font-size:0.75rem">${w.meaning}</div>
          </div>
        `
          )
          .join('') || `<p style="grid-column:1/-1;color:var(--text-muted);font-size:0.85rem">Chưa có thẻ vàng nào. Hãy luyện tập qua các ngày để mở khóa!</p>`}
      </div>
    </div>
  `;

  renderWeeklyReactionChart(container.querySelector('#rt-chart-box'), store.state.weeklyRtLog);
}

export function renderProfileView(container, onRefreshUI) {
  const p = store.state.profile;
  const s = store.state.settings;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🏪 Cửa Hàng Linh Vật & Giao Diện</h2>
        <span>🪙 ${p.coins} Xu</span>
      </div>
      <div class="grid-2">
        <button class="btn btn-outline" id="buy-panda">
          🐼 Linh vật Gấu Trúc ${p.unlockedMascots.includes('panda') ? '(Đang có · Chọn)' : '(80 Xu)'}
        </button>
        <button class="btn btn-outline" id="buy-jade">
          🌿 Giao diện Ngọc Bích ${p.unlockedSkins.includes('jade') ? '(Đang có · Chọn)' : '(100 Xu)'}
        </button>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">🏅 Huy Hiệu Thành Tựu (${p.badges.length}/${ACHIEVEMENTS.length})</h2>
      <div class="grid-2" style="margin-top:8px">
        ${ACHIEVEMENTS.map((a) => {
          const got = p.badges.includes(a.id);
          return `
            <div style="padding:8px;border-radius:10px;border:1px solid var(--border);opacity:${got ? 1 : 0.45};background:${got ? 'var(--gold-light)' : 'var(--surface)'}">
              <div style="font-weight:800;font-size:0.85rem">${got ? '🏆' : '🔒'} ${a.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${a.desc}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">⚙️ Cài Đặt & Sao Lưu Dữ Liệu</h2>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>Chế độ tối (Dark Mode)</span>
          <input type="checkbox" id="set-dark" ${s.theme === 'dark' ? 'checked' : ''} />
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>Âm thanh hiệu ứng (Web Audio)</span>
          <input type="checkbox" id="set-sfx" ${s.sfx ? 'checked' : ''} />
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>Rung phản hồi trên điện thoại</span>
          <input type="checkbox" id="set-vib" ${s.vibrate ? 'checked' : ''} />
        </label>
        <label>
          <span>Cỡ chữ Hán (${Math.round(s.hanziScale * 100)}%)</span>
          <input type="range" id="set-scale" min="0.8" max="1.4" step="0.1" value="${s.hanziScale}" style="width:100%" />
        </label>

        <div class="grid-2" style="margin-top:6px">
          <button class="btn btn-outline btn-sm" id="btn-export">📤 Xuất file JSON</button>
          <label class="btn btn-outline btn-sm" style="cursor:pointer">
            📥 Nhập file JSON
            <input type="file" id="inp-import" accept=".json" class="hidden" />
          </label>
        </div>
        <button class="btn btn-outline btn-sm" id="btn-share-card">🖼️ Chia sẻ thẻ thành tích</button>
      </div>
    </div>
  `;

  container.querySelector('#buy-panda').onclick = () => {
    if (p.unlockedMascots.includes('panda')) {
      p.activeMascot = p.activeMascot === 'panda' ? 'dragon' : 'panda';
    } else if (p.coins >= 80) {
      p.coins -= 80;
      p.unlockedMascots.push('panda');
      p.activeMascot = 'panda';
    } else {
      alert('Bạn chưa đủ 80 Xu Long Châu!');
      return;
    }
    store.save();
    onRefreshUI();
    renderProfileView(container, onRefreshUI);
  };

  container.querySelector('#buy-jade').onclick = () => {
    if (p.unlockedSkins.includes('jade')) {
      p.activeSkin = p.activeSkin === 'jade' ? 'default' : 'jade';
    } else if (p.coins >= 100) {
      p.coins -= 100;
      p.unlockedSkins.push('jade');
      p.activeSkin = 'jade';
    } else {
      alert('Bạn chưa đủ 100 Xu Long Châu!');
      return;
    }
    document.documentElement.setAttribute('data-skin', p.activeSkin);
    store.save();
    onRefreshUI();
    renderProfileView(container, onRefreshUI);
  };

  container.querySelector('#set-dark').onchange = (e) => {
    s.theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', s.theme);
    store.save();
  };
  container.querySelector('#set-sfx').onchange = (e) => { s.sfx = e.target.checked; store.save(); };
  container.querySelector('#set-vib').onchange = (e) => { s.vibrate = e.target.checked; store.save(); };
  container.querySelector('#set-scale').oninput = (e) => {
    s.hanziScale = Number(e.target.value);
    document.documentElement.style.setProperty('--hanzi-scale', String(s.hanziScale));
    store.save();
  };

  container.querySelector('#btn-export').onclick = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `longmon-hsk-backup-${getTodayStr()}.json`;
    a.click();
  };

  container.querySelector('#inp-import').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const txt = await file.text();
      store.importJSON(txt);
      alert('✅ Khôi phục dữ liệu thành công!');
      onRefreshUI();
    } catch (err) {
      alert(`❌ Lỗi nhập dữ liệu: ${err.message}`);
    }
  };

  container.querySelector('#btn-share-card').onclick = () => {
    const text = `🐉 Long Môn HSK · Thành tích của tôi:\n- XP: ${p.xp}\n- Chuỗi ngày học: ${p.streak} ngày 🔥\n- Số từ đã học: ${Object.keys(store.state.srs).length} từ\n- Huy hiệu: ${p.badges.length}/${ACHIEVEMENTS.length}`;
    if (navigator.share) {
      navigator.share({ title: 'Thành tích Long Môn HSK', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('📋 Đã sao chép bảng thành tích vào khay nhớ tạm!');
    }
  };
}

export function renderResultScreen(container, summary, onContinue) {
  container.innerHTML = `
    <div class="card" style="text-align:center;border:2px solid var(--gold)">
      ${renderMascotSVG(summary.stars >= 2 ? 'excited' : 'happy', store.state.profile.activeMascot, 90)}
      <h2 class="card-title" style="font-size:1.3rem;margin-top:6px">${summary.modeName}</h2>
      <div style="font-size:1.8rem;margin:6px 0">${'⭐'.repeat(summary.stars)}${'☆'.repeat(3 - summary.stars)}</div>

      <div class="grid-2" style="margin:12px 0;text-align:left;background:var(--surface-alt);padding:12px;border-radius:12px">
        <div>🎯 Độ chính xác: <strong>${summary.accuracy}%</strong></div>
        <div>⚡ Phản xạ TB: <strong>${(summary.avgRt / 1000).toFixed(2)}s</strong></div>
        <div>✨ Kinh nghiệm: <strong>+${summary.xpEarned} XP</strong></div>
        <div>🪙 Xu nhận được: <strong>+${summary.coinsEarned}</strong></div>
      </div>

      ${summary.newlyMastered.length ? `
        <div style="margin:8px 0;color:var(--success);font-weight:700">
          🎉 Từ mới đạt trạng thái Thuộc: ${summary.newlyMastered.join(', ')}
        </div>
      ` : ''}

      ${summary.newBadges.length ? `
        <div style="background:var(--gold-light);padding:8px;border-radius:10px;margin:8px 0">
          🏆 <strong>Mở khóa huy hiệu:</strong> ${summary.newBadges.map((b) => b.name).join(', ')}
        </div>
      ` : ''}

      ${summary.wrongWords.length ? `
        <div style="text-align:left;margin-top:10px;font-size:0.86rem">
          <strong>📌 Từ cần ôn thêm:</strong>
          ${summary.wrongWords.map((w) => `<span class="badge-pill">${w.hanzi} (${w.meaning})</span>`).join(' ')}
        </div>
      ` : ''}

      <button class="btn btn-primary btn-block" id="btn-res-done" style="margin-top:14px">Hoàn tất</button>
    </div>
  `;

  container.querySelector('#btn-res-done').onclick = onContinue;
}

export function openWordModal(word) {
  const backdrop = document.getElementById('modal-backdrop');
  const body = document.getElementById('modal-body');
  if (!backdrop || !body) return;

  body.innerHTML = `
    <div style="text-align:center">
      <span class="badge-pill">HSK ${word.level || 1} · ${word.pos || 'Từ vựng'}</span>
      <div class="hanzi-xl" style="margin:8px 0">${word.hanzi}</div>
      <div style="color:var(--primary);font-weight:700;font-size:1.15rem">${word.pinyin}</div>
      <div style="font-weight:800;font-size:1.1rem;margin:6px 0">${word.meaning}</div>
      <button class="btn btn-outline btn-sm" id="modal-tts-btn">🔊 Nghe phát âm</button>
    </div>
    ${word.exZh ? `
      <div style="background:var(--surface-alt);padding:10px;border-radius:10px;margin-top:12px;font-size:0.9rem">
        <div><strong>${word.exZh}</strong></div>
        <div style="color:var(--text-muted)">${word.exPy}</div>
        <div>${word.exVi}</div>
      </div>
    ` : ''}
    ${word.mnemonic ? `<p style="font-size:0.88rem;margin-top:10px">💡 <strong>Mẹo nhớ:</strong> ${word.mnemonic}</p>` : ''}
    <button class="btn btn-primary btn-block" id="modal-add-hard" style="margin-top:12px">📌 Thêm vào Sổ từ khó</button>
  `;

  backdrop.classList.remove('hidden');
  tts.speak(word.hanzi);
  body.querySelector('#modal-tts-btn').onclick = () => tts.speak(word.hanzi);
  body.querySelector('#modal-add-hard').onclick = () => {
    if (!store.state.hardWords.includes(word.hanzi)) {
      store.state.hardWords.push(word.hanzi);
      store.save();
    }
    alert(`Đã lưu "${word.hanzi}" vào Sổ từ khó!`);
  };
}