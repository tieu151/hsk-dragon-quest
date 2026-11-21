export function extractPitchContour(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const frameSize = 2048;
  const hopSize = 512;
  const rawF0 = [];

  for (let start = 0; start + frameSize < data.length; start += hopSize) {
    const slice = data.subarray(start, start + frameSize);
    const f0 = autoCorrelate(slice, sampleRate);
    if (f0 > 75 && f0 < 480) {
      rawF0.push(f0);
    }
  }

  if (rawF0.length < 3) return [];

  const sorted = [...rawF0].sort((a, b) => a - b);
  const minF0 = sorted[Math.floor(sorted.length * 0.1)];
  const maxF0 = sorted[Math.floor(sorted.length * 0.9)];
  const span = Math.max(20, maxF0 - minF0);

  return rawF0.map((f) => {
    const norm = (f - minF0) / span;
    return Math.max(0.05, Math.min(0.95, norm));
  });
}

function autoCorrelate(buf, sampleRate) {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.015) return -1;

  const minLag = Math.floor(sampleRate / 480);
  const maxLag = Math.floor(sampleRate / 75);
  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < buf.length - lag; i++) {
      sum += buf[i] * buf[i + lag];
      normA += buf[i] * buf[i];
      normB += buf[i + lag] * buf[i + lag];
    }
    const corr = sum / (Math.sqrt(normA * normB) + 1e-9);
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  return bestCorr > 0.72 && bestLag > 0 ? sampleRate / bestLag : -1;
}

export const TONE_TEMPLATES = {
  1: [0.85, 0.85, 0.85, 0.85, 0.85],
  2: [0.45, 0.55, 0.68, 0.80, 0.90],
  3: [0.35, 0.20, 0.12, 0.22, 0.45],
  4: [0.92, 0.72, 0.50, 0.28, 0.10],
  5: [0.45, 0.42, 0.40, 0.38, 0.35]
};

export function drawPitchComparison(canvas, userContour, targetTones = [1]) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(120,113,108,0.25)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const y = h - (i / 5.5) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const expectedCurve = [];
  targetTones.forEach((t) => {
    const tpl = TONE_TEMPLATES[t] || TONE_TEMPLATES[1];
    expectedCurve.push(...tpl);
  });

  if (expectedCurve.length > 1) {
    ctx.save();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    expectedCurve.forEach((val, idx) => {
      const x = (idx / (expectedCurve.length - 1)) * (w - 20) + 10;
      const y = h - val * (h - 24) - 12;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  if (userContour && userContour.length > 1) {
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    userContour.forEach((val, idx) => {
      const x = (idx / (userContour.length - 1)) * (w - 20) + 10;
      const y = h - val * (h - 24) - 12;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}