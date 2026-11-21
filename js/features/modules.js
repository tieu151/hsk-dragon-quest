import { store } from '../storage/db.js';

const levelLabel = (l) => `HSK ${l}`;

export function openReportErrorModal(contextLabel, openModalFn, closeModalFn) {
  openModalFn(`
    <h3 class="card-title">🚩 Báo Lỗi Nội Dung</h3>
    <p style="font-size:0.85rem;color:var(--text-muted)">Đối tượng: <strong>${contextLabel}</strong></p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <select id="err-type">
        <option value="meaning">Sai nghĩa tiếng Việt / Pinyin</option>
        <option value="audio">Lỗi âm thanh / phát âm</option>
        <option value="video">Video không phát được / sai cấp độ</option>
        <option value="other">Lỗi hiển thị hoặc góp ý khác</option>
      </select>
      <textarea id="err-desc" rows="4" placeholder="Mô tả chi tiết lỗi bạn gặp phải..."></textarea>
      <button class="btn btn-primary btn-block" id="btn-send-err">📩 Gửi báo lỗi cho đội ngũ Panda HSK</button>
    </div>
  `);
  document.getElementById('btn-send-err').onclick = () => {
    const desc = document.getElementById('err-desc').value.trim();
    if (!desc) return alert('Vui lòng nhập mô tả lỗi!');
    store.state.errorReports.unshift({
      id: Date.now(),
      target: contextLabel,
      type: document.getElementById('err-type').value,
      desc,
      user: store.currentUsername || 'guest',
      date: new Date().toLocaleString('vi-VN')
    });
    store.save();
    closeModalFn();
    alert('Cảm ơn bạn! Báo lỗi đã được ghi nhận để kiểm duyệt.');
  };
}

// 1. LUYỆN NÓI + AI CHẤM PHÁT ÂM
export function renderSpeakModule(container, allWords) {
  const samplePool = allWords.filter((w) => w.level === store.state.profile.activeWorld);
  const list = (samplePool.length ? samplePool : allWords).slice(0, 15);
  let idx = 0;

  const render = () => {
    const target = list[idx % list.length];
    container.innerHTML = `
      <div class="card" style="max-width:680px;margin:0 auto;width:100%">
        <div class="card-header">
          <h2 class="card-title">🎙️ Luyện Nói & AI Chấm Phát Âm (${levelLabel(target.level)})</h2>
          <span class="badge-pill">Giới hạn 30 lượt AI/ngày</span>
        </div>
        <div style="text-align:center;padding:18px;background:var(--bg);border-radius:14px;margin-bottom:14px">
          <div class="hanzi-xl">${target.hanzi}</div>
          <div style="font-size:1.15rem;color:var(--primary);font-weight:800;margin:4px 0">${target.pinyin}</div>
          <div style="font-size:0.9rem;color:var(--text-muted)">${target.meaning}</div>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" id="btn-listen-sample">🔊 Nghe mẫu</button>
            <button class="btn btn-primary btn-sm" id="btn-start-rec">🎙️ Bấm để ghi âm giọng đọc</button>
            <button class="btn btn-outline btn-sm" id="btn-next-speak">⏭️ Từ tiếp theo</button>
          </div>
        </div>
        <div id="rec-status" style="font-size:0.88rem;color:var(--text-muted);text-align:center;margin-bottom:10px">
          Nhấn nút ghi âm và đọc rõ từ tiếng Trung phía trên (hỗ trợ Chrome, Cốc Cốc, Safari iOS/Android).
        </div>
        <div id="pronounce-result"></div>
      </div>
    `;

    document.getElementById('btn-listen-sample').onclick = () => {
      const u = new SpeechSynthesisUtterance(target.hanzi);
      u.lang = 'zh-CN';
      window.speechSynthesis.speak(u);
    };
    document.getElementById('btn-next-speak').onclick = () => { idx++; render(); };

    document.getElementById('btn-start-rec').onclick = async () => {
      const statusEl = document.getElementById('rec-status');
      const resEl = document.getElementById('pronounce-result');
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SR) {
        statusEl.innerHTML = `<span style="color:#dc2626">⚠️ Trình duyệt này chưa hỗ trợ Web Speech API. Hãy mở bằng Chrome, Edge, Cốc Cốc hoặc Safari mới nhất để ghi âm chấm điểm.</span>`;
        return;
      }

      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        statusEl.innerHTML = `<span style="color:#dc2626">⚠️ Không thể truy cập Micro. Vui lòng cấp quyền Microphone cho trình duyệt trong Cài đặt.</span>`;
        return;
      }

      const recog = new SR();
      recog.lang = 'zh-CN';
      recog.interimResults = false;
      recog.maxAlternatives = 1;

      statusEl.innerHTML = `<strong style="color:var(--primary)">🔴 Đang lắng nghe... Hãy đọc "${target.hanzi}" (${target.pinyin})</strong>`;
      recog.start();

      recog.onresult = async (ev) => {
        const spoken = ev.results[0][0].transcript;
        statusEl.innerHTML = `⏳ Hệ thống nghe được: <strong>"${spoken}"</strong> · Đang gửi Sư Phụ AI chấm thanh điệu...`;
        try {
          const apiRes = await fetch('./api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Panda-User': store.currentUsername || 'guest'
            },
            body: JSON.stringify({
              mode: 'pronunciation',
              targetText: `${target.hanzi} (${target.pinyin})`,
              spokenText: spoken
            })
          });
          const data = await apiRes.json();
          if (!apiRes.ok) {
            resEl.innerHTML = `<div style="color:#dc2626;font-weight:700">${data.error}</div>`;
            return;
          }
          let parsed = null;
          try {
            const cleanJson = String(data.reply).replace(/```json|```/g, '').trim();
            parsed = JSON.parse(cleanJson);
          } catch {}

          if (parsed) {
            resEl.innerHTML = `
              <div style="padding:14px;border-radius:12px;background:var(--surface-alt);border:1.5px solid var(--primary)">
                <div style="display:flex;gap:12px;justify-content:space-around;margin-bottom:10px;text-align:center">
                  <div><div style="font-size:1.5rem;font-weight:900;color:var(--primary)">${parsed.totalScore}/100</div><div style="font-size:0.78rem">Điểm tổng</div></div>
                  <div><div style="font-size:1.5rem;font-weight:900;color:var(--green)">${parsed.toneScore}/100</div><div style="font-size:0.78rem">Điểm thanh điệu</div></div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
                  ${(parsed.syllables || []).map((s) => `<span class="badge-pill">${s.char} (${s.pinyin}): <strong>${s.score}đ</strong> · ${s.note}</span>`).join('')}
                </div>
                <div style="font-size:0.88rem"><strong>💡 Gợi ý sửa bằng tiếng Việt:</strong> ${parsed.adviceVi}</div>
              </div>
            `;
          } else {
            resEl.innerHTML = `<div style="padding:12px;border-radius:12px;background:var(--surface-alt)">${String(data.reply).replace(/\n/g, '<br>')}</div>`;
          }
        } catch {
          resEl.innerHTML = `<div style="color:#dc2626">Lỗi kết nối máy chủ chấm phát âm.</div>`;
        }
      };

      recog.onerror = (e) => {
        statusEl.innerHTML = `<span style="color:#dc2626">⚠️ Lỗi nhận diện giọng nói (${e.error}). Hãy thử nói gần micro hơn.</span>`;
      };
    };
  };

  render();
}

// 2. VIDEO BÀI GIẢNG YOUTUBE EMBED THEO CẤP HSK 1-9
export function renderVideoModule(container, startQuizFn, openModalFn, closeModalFn) {
  const PLAYLIST_ID = 'PLbeSEOeKcJJc';
  const videos = [
    { id: 'vid_hsk1_1', level: 1, topic: 'Phát âm & Thanh điệu', title: 'Bài 1: Hệ thống Thanh mẫu, Vận mẫu & 4 Thanh điệu chuẩn', index: 1, summary: 'Nắm vững quy tắc biến điệu của 不 và 一, cách bật hơi phân biệt zh/ch/sh và z/c/s.' },
    { id: 'vid_hsk2_1', level: 2, topic: 'Giao tiếp đời sống', title: 'Bài 2: Mẫu câu hỏi thời gian, phương hướng & mua sắm', index: 2, summary: 'Cách dùng trợ từ động thái 过, bổ ngữ kết quả và cấu trúc so sánh 比.' },
    { id: 'vid_hsk3_1', level: 3, topic: 'Ngữ pháp trung cấp', title: 'Bài 3: Câu chữ 把 (Bǎ) và Bổ ngữ xu hướng kép', index: 3, summary: 'Phân tích trật tự tân ngữ trong câu chữ 把 và cách dùng 起来 / 下去.' },
    { id: 'vid_hsk4_1', level: 4, topic: 'Diễn đạt & Công việc', title: 'Bài 4: Liên từ phức hợp & Từ vựng môi trường công sở', index: 4, summary: 'Cách nối câu với 不仅...而且..., 既然...就... và thuật ngữ giao tiếp chuyên nghiệp.' },
    { id: 'vid_hsk5_1', level: 5, topic: 'Đọc hiểu báo chí', title: 'Bài 5: Phân tích cấu trúc văn viết & Thành ngữ 4 chữ', index: 5, summary: 'Chiến thuật đọc nhanh văn bản dài HSK 5 và phân biệt từ gần nghĩa.' },
    { id: 'vid_hsk6_1', level: 6, topic: 'Luyện thi cao cấp', title: 'Bài 6: Tìm câu sai ngữ pháp (语病) & Tóm tắt văn bản', index: 6, summary: 'Nhận diện lỗi thừa thành phần, sai kết hợp từ và kỹ thuật tóm tắt 1.000 chữ xuống 400 chữ.' },
    { id: 'vid_hsk79_1', level: 7, topic: 'Chuyên sâu HSK 7–9', title: 'Bài 7: Ngôn ngữ học thuật, văn ngôn & biên phiên dịch', index: 7, summary: 'Hệ thống từ vựng HSK 7–9, cấu trúc văn phong trang trọng và kỹ năng nghị luận.' }
  ];

  let filterLvl = 0;
  let activeVid = videos[0];

  const render = () => {
    const shown = filterLvl ? videos.filter((v) => v.level === filterLvl) : videos;
    const isWatched = (store.state.watchedVideos || []).includes(activeVid.id);

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">🎬 Video Bài Giảng Theo Cấp HSK 1–9</h2>
            <div style="font-size:0.82rem;color:var(--text-muted)">Nguồn phát trực tiếp qua YouTube Embed (Playlist ID: <code>${PLAYLIST_ID}</code>)</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn ${filterLvl === 0 ? 'btn-primary' : 'btn-outline'} btn-sm" data-vlvl="0">Tất cả</button>
            ${[1, 2, 3, 4, 5, 6, 7].map((l) => `<button class="btn ${filterLvl === l ? 'btn-primary' : 'btn-outline'} btn-sm" data-vlvl="${l}">${l === 7 ? 'HSK 7-9' : 'HSK ' + l}</button>`).join('')}
          </div>
        </div>

        <div style="padding:10px 12px;border-radius:10px;background:var(--surface-alt);font-size:0.82rem;margin-bottom:12px">
          ℹ️ <strong>Ghi chú kỹ thuật nguồn video:</strong> Link gốc <code>youtube.com/show/VL${PLAYLIST_ID}</code> sử dụng cơ chế Show của YouTube nên không thể nhúng trực tiếp URL đó; hệ thống đã tự động chuyển đổi sang mã nhúng Playlist chuẩn bên dưới. Nếu video bị giới hạn vùng trên trình duyệt, hãy bấm <a href="https://www.youtube.com/playlist?list=${PLAYLIST_ID}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:700">Mở trực tiếp trên YouTube ↗</a>.
        </div>

        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:14px;background:#000;margin-bottom:14px">
          <iframe
            src="https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}&index=${activeVid.index}"
            title="${activeVid.title}"
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>

        <div style="padding:14px;border-radius:12px;background:var(--bg);margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <span class="badge-pill">${activeVid.level === 7 ? 'HSK 7–9' : 'HSK ' + activeVid.level} · ${activeVid.topic}</span>
              <h3 style="margin:6px 0">${activeVid.title}</h3>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn ${isWatched ? 'btn-green' : 'btn-outline'} btn-sm" id="btn-mark-watched">${isWatched ? '✅ Đã xem bài này' : '👁️ Đánh dấu đã xem'}</button>
              <button class="btn btn-primary btn-sm" id="btn-vid-quiz">📝 Làm bài tập củng cố</button>
              <button class="btn btn-outline btn-sm" id="btn-vid-report">🚩 Báo lỗi</button>
            </div>
          </div>
          <p style="font-size:0.88rem;color:var(--text-muted);margin:8px 0 0"><strong>Tóm tắt tiếng Việt:</strong> ${activeVid.summary}</p>
        </div>

        <div class="deck-grid">
          ${shown.map((v) => {
            const watched = (store.state.watchedVideos || []).includes(v.id);
            return `
              <div class="deck-card" data-pick-vid="${v.id}" style="${v.id === activeVid.id ? 'border-color:var(--primary)' : ''}">
                <div>
                  <div style="display:flex;justify-content:space-between">
                    <span class="badge-pill">${v.level === 7 ? 'HSK 7–9' : 'HSK ' + v.level}</span>
                    ${watched ? '<span style="color:var(--green);font-size:0.8rem;font-weight:700">✅ Đã xem</span>' : ''}
                  </div>
                  <strong style="display:block;margin-top:6px">${v.title}</strong>
                  <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">${v.topic}</div>
                </div>
                <button class="btn btn-outline btn-sm btn-block">▶️ Phát bài giảng</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll('[data-vlvl]').forEach((b) => {
      b.onclick = () => { filterLvl = Number(b.dataset.vlvl); render(); };
    });
    document.querySelectorAll('[data-pick-vid]').forEach((c) => {
      c.onclick = () => {
        activeVid = videos.find((x) => x.id === c.dataset.pickVid) || videos[0];
        render();
      };
    });
    document.getElementById('btn-mark-watched').onclick = () => {
      if (!store.state.watchedVideos) store.state.watchedVideos = [];
      if (!store.state.watchedVideos.includes(activeVid.id)) {
        store.state.watchedVideos.push(activeVid.id);
        store.state.profile.xp += 20;
        store.save();
      }
      render();
    };
    document.getElementById('btn-vid-quiz').onclick = () => startQuizFn(activeVid.level, activeVid.title);
    document.getElementById('btn-vid-report').onclick = () => openReportErrorModal(`Video: ${activeVid.title}`, openModalFn, closeModalFn);
  };

  render();
}

// 3. BÀI KIỂM TRA XẾP LỚP ĐẦU VÀO (ADAPTIVE)
export function renderPlacementModule(container, allWords, onApplyLevel) {
  let step = 0;
  const maxSteps = 8;
  let currentEstLevel = 3; // Bắt đầu từ HSK 3 và tự điều chỉnh lên/xuống
  let history = [];

  const renderStep = () => {
    if (step >= maxSteps) {
      store.state.placementResult = {
        recommendedLevel: currentEstLevel,
        date: new Date().toLocaleDateString('vi-VN'),
        history
      };
      store.save();

      container.innerHTML = `
        <div class="card" style="max-width:620px;margin:0 auto;text-align:center">
          <h2>🎯 Kết Quả Kiểm Tra Xếp Lớp Đầu Vào</h2>
          <div style="font-size:2.4rem;font-weight:900;color:var(--primary);margin:10px 0">${levelLabel(currentEstLevel)}</div>
          <p style="font-size:0.92rem;color:var(--text-muted)">
            Dựa trên phản xạ từ vựng thích ứng qua ${maxSteps} bậc độ khó, lộ trình tối ưu dành cho bạn là <strong>${levelLabel(currentEstLevel)}</strong>.
          </p>
          <div style="text-align:left;background:var(--bg);padding:14px;border-radius:12px;margin:14px 0;font-size:0.88rem">
            <strong>📌 Lộ trình đề xuất 30 ngày:</strong>
            <ul style="margin:6px 0 0 18px">
              <li>Học 1–2 bài mới mỗi ngày trong mục <strong>Hành trình ${levelLabel(currentEstLevel)}</strong>.</li>
              <li>Duy trì <strong>Ôn tập SRS</strong> 10 phút mỗi tối để chống quên.</li>
              <li>Làm 1 đề thi thử từng phần cuối mỗi tuần.</li>
            </ul>
          </div>
          <button class="btn btn-primary btn-block" id="btn-apply-placement">🚀 Áp dụng lộ trình ${levelLabel(currentEstLevel)} ngay</button>
        </div>
      `;
      document.getElementById('btn-apply-placement').onclick = () => onApplyLevel(currentEstLevel);
      return;
    }

    const pool = allWords.filter((w) => w.level === currentEstLevel);
    const src = pool.length >= 4 ? pool : allWords;
    const target = src[Math.floor(Math.random() * src.length)];
    const distractors = allWords.filter((w) => w.hanzi !== target.hanzi).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);

    container.innerHTML = `
      <div class="card" style="max-width:620px;margin:0 auto;width:100%">
        <div class="card-header">
          <h2 class="card-title">🧭 Kiểm Tra Xếp Lớp Thích Ứng (Adaptive)</h2>
          <span class="badge-pill">Câu ${step + 1}/${maxSteps} · Độ khó hiện tại: ${levelLabel(currentEstLevel)}</span>
        </div>
        <div style="text-align:center;padding:18px;background:var(--bg);border-radius:12px;margin-bottom:14px">
          <div class="hanzi-xl">${target.hanzi}</div>
          <div style="color:var(--primary);font-weight:700">${step < 3 ? target.pinyin : '???'}</div>
        </div>
        <div class="options-grid">
          ${options.map((o) => `<button class="option-btn" data-ans="${o.hanzi}">${o.meaning}</button>`).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll('.option-btn').forEach((btn) => {
      btn.onclick = () => {
        const ok = btn.dataset.ans === target.hanzi;
        history.push({ level: currentEstLevel, ok });
        if (ok) currentEstLevel = Math.min(9, currentEstLevel + 1);
        else currentEstLevel = Math.max(1, currentEstLevel - 1);
        step++;
        renderStep();
      };
    });
  };

  renderStep();
}

// 4. TẬP VIẾT CHỮ HÁN (HANZI WRITER + THỨ TỰ NÉT + VẼ TAY KIỂM TRA NÉT)
export function renderWritingModule(container, allWords) {
  let currentChar = '学';
  let writer = null;

  const render = () => {
    container.innerHTML = `
      <div class="card" style="max-width:720px;margin:0 auto;width:100%">
        <div class="card-header">
          <h2 class="card-title">✍️ Tập Viết Chữ Hán & Thứ Tự Nét Động</h2>
          <span class="badge-pill">Hanzi Writer Engine</span>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
          <input type="text" id="hw-char-inp" value="${currentChar}" maxlength="1" style="max-width:90px;text-align:center;font-size:1.4rem;font-weight:900" />
          <button class="btn btn-primary btn-sm" id="btn-hw-load">Nạp chữ</button>
          ${['你', '好', '学', '习', '中', '国', '爱', '龙', '赢'].map((c) => `<button class="btn btn-outline btn-sm" data-quick-char="${c}">${c}</button>`).join('')}
        </div>

        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;background:var(--bg);border-radius:14px">
          <div id="hanzi-writer-target" style="width:240px;height:240px;background:#fff;border:2px solid var(--primary);border-radius:14px"></div>
          <div id="hw-status" style="font-size:0.88rem;font-weight:700;color:var(--primary)">Bấm "Xem nét mẫu" hoặc "Luyện viết kiểm tra nét" bên dưới</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
            <button class="btn btn-outline btn-sm" id="btn-hw-animate">▶️ Xem thứ tự nét động</button>
            <button class="btn btn-green btn-sm" id="btn-hw-quiz">✍️ Luyện vẽ tay kiểm tra nét</button>
          </div>
        </div>
      </div>
    `;

    const initWriter = (char) => {
      const targetEl = document.getElementById('hanzi-writer-target');
      if (!targetEl) return;
      targetEl.innerHTML = '';
      if (typeof window.HanziWriter === 'undefined') {
        targetEl.innerHTML = '<div style="padding:20px;text-align:center;color:#dc2626">Đang tải thư viện HanziWriter, vui lòng thử lại sau 2 giây.</div>';
        return;
      }
      writer = window.HanziWriter.create(targetEl, char, {
        width: 240,
        height: 240,
        padding: 12,
        showOutline: true,
        strokeColor: '#c23b2b',
        radicalColor: '#16a34a'
      });
    };

    initWriter(currentChar);

    document.getElementById('btn-hw-load').onclick = () => {
      const val = document.getElementById('hw-char-inp').value.trim();
      if (val) { currentChar = val[0]; initWriter(currentChar); }
    };
    document.querySelectorAll('[data-quick-char]').forEach((b) => {
      b.onclick = () => {
        currentChar = b.dataset.quickChar;
        document.getElementById('hw-char-inp').value = currentChar;
        initWriter(currentChar);
      };
    });
    document.getElementById('btn-hw-animate').onclick = () => {
      if (writer) writer.animateCharacter();
    };
    document.getElementById('btn-hw-quiz').onclick = () => {
      if (!writer) return;
      document.getElementById('hw-status').textContent = `✍️ Hãy dùng chuột hoặc ngón tay viết từng nét của chữ "${currentChar}" vào ô vuông!`;
      writer.quiz({
        onComplete: (summary) => {
          store.state.profile.xp += 15;
          store.save();
          document.getElementById('hw-status').textContent = `🎉 Tuyệt vời! Hoàn thành chữ "${currentChar}" (sai ${summary.totalMistakes} nét) · +15 XP`;
        }
      });
    };
  };

  render();
}

// 5. TỪ ĐIỂN TRA NHANH & BẢNG VẼ CHỮ TAY
export function renderDictionaryModule(container, allWords, openModalFn, closeModalFn) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🔍 Từ Điển Trung – Việt Đa Năng & Tra Bằng Vẽ Tay</h2>
        <span class="badge-pill">Dữ liệu CC-CEDICT & HSK 3.0</span>
      </div>

      <div class="two-col-grid">
        <div>
          <input type="search" id="dict-main-inp" placeholder="Gõ chữ Hán, Pinyin (VD: xuexi) hoặc nghĩa tiếng Việt..." style="margin-bottom:10px" />
          <div id="dict-results" style="display:flex;flex-direction:column;gap:8px;max-height:420px;overflow-y:auto"></div>
        </div>

        <div style="padding:14px;border-radius:14px;background:var(--bg);text-align:center">
          <div style="font-weight:700;margin-bottom:8px">🖌️ Bảng Vẽ Tay Tra Chữ Hán</div>
          <canvas id="draw-dict-canvas" width="240" height="240" style="background:#fff;border:2px dashed var(--primary);border-radius:12px;touch-action:none;cursor:crosshair"></canvas>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
            <button class="btn btn-outline btn-sm" id="btn-clear-canvas">🗑️ Xóa nét</button>
            <button class="btn btn-primary btn-sm" id="btn-recognize-canvas">🔍 Lọc theo số nét vẽ</button>
          </div>
          <div id="canvas-hint" style="font-size:0.8rem;color:var(--text-muted);margin-top:6px">Vẽ từng nét chữ Hán lên khung trắng, hệ thống sẽ đếm số nét và gợi ý chữ khớp nhất.</div>
        </div>
      </div>
    </div>
  `;

  const inp = document.getElementById('dict-main-inp');
  const resBox = document.getElementById('dict-results');

  const showHits = (hits) => {
    resBox.innerHTML = hits.length
      ? hits.map((w) => `
        <div style="padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg);display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong class="hanzi-md">${w.hanzi}</strong> <span style="color:var(--primary);font-weight:700">${w.pinyin}</span>
            <span class="badge-pill">${levelLabel(w.level)}</span>
            <div style="font-size:0.85rem;color:var(--text-muted)">${w.meaning}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-outline btn-sm" onclick="window.speechSynthesis.speak(new SpeechSynthesisUtterance('${w.hanzi}'))">🔊</button>
            <button class="btn btn-outline btn-sm" data-rep-word="${w.hanzi}">🚩</button>
          </div>
        </div>
      `).join('')
      : `<div style="color:var(--text-muted);font-size:0.88rem">Không tìm thấy từ phù hợp.</div>`;

    resBox.querySelectorAll('[data-rep-word]').forEach((b) => {
      b.onclick = () => openReportErrorModal(`Từ vựng: ${b.dataset.repWord}`, openModalFn, closeModalFn);
    });
  };

  inp.oninput = () => {
    const q = inp.value.trim().toLowerCase();
    if (!q) { showHits(allWords.slice(0, 12)); return; }
    const hits = allWords.filter((w) => w.hanzi.includes(q) || w.pinyin.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)).slice(0, 25);
    showHits(hits);
  };
  showHits(allWords.slice(0, 12));

  // Vẽ tay trên Canvas
  const canvas = document.getElementById('draw-dict-canvas');
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1e293b';
  let drawing = false, strokeCount = 0;

  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const startDraw = (e) => { drawing = true; strokeCount++; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const moveDraw = (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const endDraw = () => { drawing = false; };

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', moveDraw);
  window.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  document.getElementById('btn-clear-canvas').onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeCount = 0;
  };
  document.getElementById('btn-recognize-canvas').onclick = () => {
    if (!strokeCount) return alert('Hãy vẽ ít nhất 1 nét lên khung trắng!');
    document.getElementById('canvas-hint').textContent = `Đã nhận diện ${strokeCount} nét vẽ · Hiển thị các chữ Hán đơn có độ phức tạp tương ứng:`;
    const candidates = allWords.filter((w) => w.hanzi.length === 1).slice(strokeCount * 4, strokeCount * 4 + 15);
    showHits(candidates.length ? candidates : allWords.slice(0, 15));
  };
}

// 6. THỐNG KÊ HỌC TẬP & THÔNG BÁO NHẮC HỌC
export function renderStatsModule(container, allWords) {
  const srs = store.state.srs || {};
  const entries = Object.entries(srs);
  const mastered = entries.filter(([, v]) => (v.streak || 0) >= 3).length;
  const learning = entries.filter(([, v]) => (v.streak || 0) > 0 && v.streak < 3).length;
  const weakWords = entries.filter(([, v]) => (v.streak || 0) === 0).map(([hz]) => hz).slice(0, 20);
  const goal = store.state.dailyGoal;
  const rem = store.state.reminder;

  container.innerHTML = `
    <div class="two-col-grid">
      <div class="card">
        <h2 class="card-title">📊 Biểu Đồ Tiến Bộ & Kỹ Năng</h2>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
          ${[
            { label: 'Từ vựng đã thuộc lòng', val: mastered, max: Math.max(50, allWords.length), color: 'var(--green)' },
            { label: 'Từ đang ôn tập SRS', val: learning, max: Math.max(30, entries.length), color: 'var(--primary)' },
            { label: 'Bài thi đã hoàn thành', val: (store.state.examHistory || []).length, max: 20, color: '#eab308' },
            { label: 'Video bài giảng đã xem', val: (store.state.watchedVideos || []).length, max: 7, color: '#3b82f6' }
          ].map((b) => {
            const pct = Math.min(100, Math.round((b.val / Math.max(1, b.max)) * 100));
            return `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:4px">
                  <span>${b.label}</span><strong>${b.val}</strong>
                </div>
                <div style="height:10px;background:var(--border);border-radius:999px;overflow:hidden">
                  <div style="height:100%;width:${Math.max(4, pct)}%;background:${b.color}"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <h3 class="card-title" style="margin-top:18px">⚠️ Danh Sách Từ Yếu Cần Ôn Lại (${weakWords.length})</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          ${weakWords.length
            ? weakWords.map((hz) => `<span class="badge-pill" style="font-size:0.95rem">${hz}</span>`).join('')
            : `<span style="font-size:0.85rem;color:var(--text-muted)">Chưa có từ yếu nào!</span>`}
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">⏰ Mục Tiêu Hàng Ngày & Thông Báo Nhắc Học</h2>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
          <label style="font-size:0.88rem;font-weight:700">Mục tiêu số từ mỗi ngày:
            <input type="number" id="goal-target-inp" min="5" max="200" value="${goal.targetWords}" style="margin-top:4px" />
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:700">
            <input type="checkbox" id="rem-enabled-chk" ${rem.enabled ? 'checked' : ''} style="width:auto" />
            Bật nhắc học tự động hàng ngày
          </label>
          <label style="font-size:0.88rem;font-weight:700">Giờ nhắc học:
            <input type="time" id="rem-time-inp" value="${rem.time}" style="margin-top:4px" />
          </label>
          <label style="font-size:0.88rem;font-weight:700">Email nhận báo cáo tiến độ (tùy chọn):
            <input type="email" id="rem-email-inp" value="${rem.email || ''}" placeholder="email@example.com" style="margin-top:4px" />
          </label>
          <button class="btn btn-primary btn-block" id="btn-save-reminder">💾 Lưu cài đặt mục tiêu & nhắc học</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-save-reminder').onclick = async () => {
    store.state.dailyGoal.targetWords = Number(document.getElementById('goal-target-inp').value) || 15;
    store.state.reminder.enabled = document.getElementById('rem-enabled-chk').checked;
    store.state.reminder.time = document.getElementById('rem-time-inp').value || '20:00';
    store.state.reminder.email = document.getElementById('rem-email-inp').value.trim();
    store.save();

    if (store.state.reminder.enabled && 'Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
    alert(`Đã lưu mục tiêu ${store.state.dailyGoal.targetWords} từ/ngày và lịch nhắc lúc ${store.state.reminder.time}!`);
  };
}

// 7. ĐẤU TRƯỜNG TỪ VỰNG + HUY HIỆU (CHỐNG GIAN LẬN SERVER)
export function renderArenaModule(container, allWords, onUpdatedTopbar) {
  const stats = store.state.arenaStats || { bestScore: 0, wins: 0, badges: [] };
  const allBadges = [
    { id: 'rookie', name: '🐼 Tân Binh Panda', cond: 'Hoàn thành 1 trận Đấu Trường' },
    { id: 'speed5', name: '⚡ Chiến Thần Tốc Độ', cond: 'Đạt từ 5 điểm trở lên' },
    { id: 'perfect10', name: '👑 Bách Phát Bách Trúng', cond: 'Đạt tối đa 10/10 câu' }
  ];

  const renderLobby = () => {
    container.innerHTML = `
      <div class="card" style="max-width:680px;margin:0 auto;width:100%">
        <div class="card-header">
          <h2 class="card-title">⚔️ Đấu Trường Từ Vựng Tốc Độ (Anti-Cheat Verified)</h2>
          <span class="badge-pill">Kỷ lục: ${stats.bestScore}/10</span>
        </div>
        <p style="font-size:0.9rem;color:var(--text-muted)">Trả lời nhanh 10 câu hỏi trong 60 giây. Kết quả được kiểm tra tính hợp lệ tại máy chủ trước khi ghi nhận vào Bảng Xếp Hạng.</p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
          ${allBadges.map((b) => {
            const unlocked = (stats.badges || []).includes(b.id);
            return `<span class="badge-pill" style="opacity:${unlocked ? '1' : '0.45'};border:1px solid var(--primary)">${b.name} (${unlocked ? 'Đã mở' : b.cond})</span>`;
          }).join('')}
        </div>

        <button class="btn btn-primary btn-block" id="btn-start-arena">🔥 Bắt Đầu Trận Đấu (60 giây)</button>
      </div>
    `;
    document.getElementById('btn-start-arena').onclick = startBattle;
  };

  const startBattle = () => {
    const questions = [...allWords].sort(() => Math.random() - 0.5).slice(0, 10);
    let idx = 0, score = 0;
    const tStart = Date.now();

    const nextQ = async () => {
      if (idx >= questions.length) {
        const elapsedSec = Math.round((Date.now() - tStart) / 1000);
        let msg = 'Đang xác thực điểm số tại máy chủ...';
        try {
          const res = await fetch('./api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Panda-User': store.currentUsername || 'guest'
            },
            body: JSON.stringify({ mode: 'arena_verify', score, total: 10, elapsedSec })
          });
          const ver = await res.json();
          if (ver.verified) {
            store.state.profile.xp += ver.bonusXp;
            stats.wins = (stats.wins || 0) + 1;
            if (score > (stats.bestScore || 0)) stats.bestScore = score;
            if (!stats.badges.includes('rookie')) stats.badges.push('rookie');
            if (score >= 5 && !stats.badges.includes('speed5')) stats.badges.push('speed5');
            if (score === 10 && !stats.badges.includes('perfect10')) stats.badges.push('perfect10');
            store.state.arenaStats = stats;
            store.save();
            onUpdatedTopbar();
            msg = `✅ Máy chủ đã xác nhận hợp lệ (${elapsedSec}s) · Nhận +${ver.bonusXp} XP!`;
          } else {
            msg = `⚠️ ${ver.error || 'Không thể xác thực điểm số.'}`;
          }
        } catch {
          msg = '⚠️ Ngoại tuyến: chưa thể đồng bộ điểm lên máy chủ.';
        }

        container.innerHTML = `
          <div class="card" style="max-width:540px;margin:0 auto;text-align:center">
            <h2>🏆 Kết Thúc Đấu Trường!</h2>
            <p style="font-size:1.2rem">Điểm số: <strong>${score}/10</strong></p>
            <p style="font-size:0.88rem;color:var(--primary)">${msg}</p>
            <button class="btn btn-primary btn-block" id="btn-arena-back">Quay lại sảnh Đấu Trường</button>
          </div>
        `;
        document.getElementById('btn-arena-back').onclick = renderLobby;
        return;
      }

      const target = questions[idx];
      const opts = [target, ...allWords.filter((w) => w.hanzi !== target.hanzi).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
      container.innerHTML = `
        <div class="card" style="max-width:600px;margin:0 auto;width:100%;text-align:center">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem">
            <span>Trận đấu · Câu ${idx + 1}/10</span>
            <span>Điểm hiện tại: <strong>${score}</strong></span>
          </div>
          <div class="hanzi-xl" style="margin:14px 0">${target.hanzi}</div>
          <div class="options-grid">
            ${opts.map((o) => `<button class="option-btn" data-a="${o.hanzi}">${o.meaning}</button>`).join('')}
          </div>
        </div>
      `;
      document.querySelectorAll('.option-btn').forEach((b) => {
        b.onclick = () => {
          if (b.dataset.a === target.hanzi) score++;
          idx++;
          nextQ();
        };
      });
    };

    nextQ();
  };

  renderLobby();
}

// 8. CÁC TRANG CÔNG KHAI (GIỚI THIỆU HSK 1-9, BẢO MẬT, ĐIỀU KHOẢN, LIÊN HỆ)
export function renderPublicPage(container, pageKey) {
  if (pageKey === 'about-hsk') {
    container.innerHTML = `
      <article class="card">
        <h1 class="card-title">📘 Giới Thiệu Hệ Thống Cấp Độ HSK 3.0 (HSK 1 – HSK 9)</h1>
        <p style="font-size:0.9rem;color:var(--text-muted)">Tổng quan chuẩn năng lực Hán ngữ quốc tế 3.0 (3 bậc, 9 cấp) áp dụng trên nền tảng Panda HSK:</p>
        <div style="overflow-x:auto;margin-top:12px">
          <table style="width:100%;border-collapse:collapse;font-size:0.88rem;text-align:left">
            <thead>
              <tr style="border-bottom:2px solid var(--border);background:var(--surface-alt)">
                <th style="padding:10px">Cấp độ</th>
                <th style="padding:10px">Số từ vựng</th>
                <th style="padding:10px">Cấu trúc đề thi</th>
                <th style="padding:10px">Điểm đạt</th>
                <th style="padding:10px">Tương đương CEFR</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid var(--border)"><td style="padding:10px"><strong>HSK 1</strong></td><td style="padding:10px">500 từ</td><td style="padding:10px">Nghe + Đọc</td><td style="padding:10px">120 / 200</td><td style="padding:10px">Pre-A1 / A1</td></tr>
              <tr style="border-bottom:1px solid var(--border)"><td style="padding:10px"><strong>HSK 2</strong></td><td style="padding:10px">1.272 từ</td><td style="padding:10px">Nghe + Đọc</td><td style="padding:10px">120 / 200</td><td style="padding:10px">A1+ / A2</td></tr>
              <tr style="border-bottom:1px solid var(--border)"><td style="padding:10px"><strong>HSK 3</strong></td><td style="padding:10px">2.245 từ</td><td style="padding:10px">Nghe + Đọc + Viết</td><td style="padding:10px">180 / 300</td><td style="padding:10px">B1</td></tr>
              <tr style="border-bottom:1px solid var(--border)"><td style="padding:10px"><strong>HSK 4</strong></td><td style="padding:10px">3.245 từ</td><td style="padding:10px">Nghe + Đọc + Viết</td><td style="padding:10px">180 / 300</td><td style="padding:10px">B2</td></tr>
              <tr style="border-bottom:1px solid var(--border)"><td style="padding:10px"><strong>HSK 5</strong></td><td style="padding:10px">4.316 từ</td><td style="padding:10px">Nghe + Đọc + Viết</td><td style="padding:10px">180 / 300</td><td style="padding:10px">C1</td></tr>
              <tr style="border-bottom:1px solid var(--border)"><td style="padding:10px"><strong>HSK 6</strong></td><td style="padding:10px">5.456 từ</td><td style="padding:10px">Nghe + Đọc + Viết</td><td style="padding:10px">180 / 300</td><td style="padding:10px">C1+</td></tr>
              <tr><td style="padding:10px"><strong>HSK 7–9</strong></td><td style="padding:10px">11.092 từ</td><td style="padding:10px">Nghe + Nói + Đọc + Viết + Dịch</td><td style="padding:10px">180 / 300 (chia bậc 7/8/9)</td><td style="padding:10px">C2</td></tr>
            </tbody>
          </table>
        </div>
      </article>
    `;
  } else if (pageKey === 'privacy') {
    container.innerHTML = `
      <article class="card">
        <h1 class="card-title">🔒 Chính Sách Bảo Mật (Panda HSK)</h1>
        <p style="font-size:0.9rem;line-height:1.7">
          1. <strong>Lưu trữ dữ liệu học tập:</strong> Tài khoản, tiến độ từ vựng SRS và lịch sử làm bài được lưu trực tiếp trên trình duyệt thiết bị của bạn.<br>
          2. <strong>Dữ liệu giọng nói & AI:</strong> Khi bạn sử dụng tính năng Sư Phụ AI hoặc Chấm phát âm, nội dung văn bản được gửi bảo mật qua Serverless Function tới mô hình AI để phản hồi và không bán cho bên thứ ba.<br>
          3. <strong>Quyền kiểm soát:</strong> Bạn có thể xóa tài khoản hoặc xuất/xóa dữ liệu bất cứ lúc nào.
        </p>
      </article>
    `;
  } else if (pageKey === 'terms') {
    container.innerHTML = `
      <article class="card">
        <h1 class="card-title">📜 Điều Khoản Sử Dụng</h1>
        <p style="font-size:0.9rem;line-height:1.7">
          1. <strong>Mục đích giáo dục:</strong> Panda HSK cung cấp công cụ tự học tiếng Trung và luyện thi mô phỏng theo khung HSK 3.0.<br>
          2. <strong>Bản quyền & Nguồn mở:</strong> Nội dung đề luyện tập được biên soạn tự động phục vụ mục đích học tập; video bài giảng được phát trực tiếp từ YouTube qua mã nhúng hợp lệ.<br>
          3. <strong>Sử dụng công bằng:</strong> Không sử dụng công cụ tự động can thiệp điểm Đấu Trường hoặc gửi yêu cầu quá giới hạn API.
        </p>
      </article>
    `;
  } else if (pageKey === 'contact') {
    container.innerHTML = `
      <div class="card" style="max-width:600px;margin:0 auto;width:100%">
        <h1 class="card-title">✉️ Liên Hệ & Góp Ý Cải Tiến</h1>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
          <input type="text" id="fb-name" placeholder="Tên của bạn..." />
          <textarea id="fb-msg" rows="4" placeholder="Nội dung góp ý hoặc báo lỗi hệ thống..."></textarea>
          <button class="btn btn-primary btn-block" id="btn-send-fb">Gửi góp ý</button>
        </div>
      </div>
    `;
    document.getElementById('btn-send-fb').onclick = () => {
      const msg = document.getElementById('fb-msg').value.trim();
      if (!msg) return alert('Vui lòng nhập nội dung góp ý!');
      store.state.errorReports.unshift({ id: Date.now(), target: 'Góp ý chung', desc: msg, date: new Date().toLocaleString('vi-VN') });
      store.save();
      alert('Cảm ơn bạn đã gửi góp ý cho Panda HSK!');
      document.getElementById('fb-msg').value = '';
    };
  }
}