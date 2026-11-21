import { store } from '../storage/db.js';

class SoundFX {
  constructor() {
    this.ctx = null;
  }

  ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  tone(freq, duration = 0.14, type = 'sine', delay = 0, vol = 0.15) {
    if (!store.state.settings.sfx) return;
    this.ensureCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playCorrect(combo = 1) {
    const boost = Math.min(combo, 6) * 35;
    this.tone(523.25 + boost, 0.12, 'triangle', 0, 0.16);
    this.tone(659.25 + boost, 0.18, 'triangle', 0.08, 0.16);
  }

  playWrong() {
    this.tone(220, 0.16, 'sawtooth', 0, 0.14);
    this.tone(175, 0.24, 'sawtooth', 0.12, 0.14);
    if (store.state.settings.vibrate && navigator.vibrate) {
      navigator.vibrate(120);
    }
  }

  playWin() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.tone(f, 0.22, 'triangle', idx * 0.09, 0.18);
    });
  }
}

export const sfx = new SoundFX();