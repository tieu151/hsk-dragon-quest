export function renderWeeklyReactionChart(container, weeklyLog) {
  if (!container) return;
  if (!weeklyLog || weeklyLog.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem">Chưa có dữ liệu phản xạ tuần. Hãy hoàn thành một phiên luyện tập để đo tốc độ phản xạ của bạn!</p>`;
    return;
  }

  const maxVal = Math.max(3500, ...weeklyLog.map((d) => d.medianMs));
  const bars = weeklyLog
    .map((d) => {
      const pct = Math.min(100, Math.round((d.medianMs / maxVal) * 100));
      const isFast = d.medianMs <= 2500;
      const color = isFast ? 'var(--success)' : 'var(--gold)';
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <span style="font-size:0.72rem;font-weight:700">${(d.medianMs / 1000).toFixed(2)}s</span>
          <div style="width:100%;max-width:36px;height:110px;background:var(--surface-alt);border-radius:8px;display:flex;align-items:flex-end;overflow:hidden">
            <div style="width:100%;height:${pct}%;background:${color};border-radius:8px;transition:height 0.3s"></div>
          </div>
          <span style="font-size:0.68rem;color:var(--text-muted)">${d.week.split('-')[1]}</span>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:8px;padding-top:8px">${bars}</div>
    <p style="margin:8px 0 0;font-size:0.78rem;color:var(--text-muted)">
      Mục tiêu đạt trạng thái <strong>Thuộc</strong>: trung vị phản xạ ≤ <strong>2.50s</strong> (cột màu xanh lá).
    </p>
  `;
}

export function triggerConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#eab308'];
  const pieces = Array.from({ length: 70 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 120,
    w: 8 + Math.random() * 6,
    h: 5 + Math.random() * 5,
    vy: 2.5 + Math.random() * 4,
    vx: (Math.random() - 0.5) * 3,
    rot: Math.random() * Math.PI,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  let frames = 0;
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.08;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frames++;
    if (frames < 95) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(step);
}