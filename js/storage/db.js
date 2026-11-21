const LS_KEY = 'longmon_hsk_state_v1';
const DEFAULT_STATE = {
  profile: {
    xp: 0, coins: 50, streak: 0, freezes: 1, lastStudyDate: null,
    activeWorld: 1, badges: [], stageStars: {}, bossDefeated: {},
    dailyTasks: { date: null, reviewsDone: 0, gameWon: false }
  },
  settings: { theme: 'light', hanziScale: 1, sfx: true, ttsRate: 1.0 },
  srs: {}, weeklyRtLog: []
};

class StorageManager {
  constructor() { this.state = this.loadLocal(); }
  loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...parsed, profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) } };
    } catch { return structuredClone(DEFAULT_STATE); }
  }
  save() { try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch {} }
  exportJSON() { return JSON.stringify({ app: 'LongMonHSK', state: this.state }, null, 2); }
  importJSON(txt) {
    const p = JSON.parse(txt);
    this.state = { ...structuredClone(DEFAULT_STATE), ...(p.state || p) };
    this.save();
  }
  resetAll() { this.state = structuredClone(DEFAULT_STATE); this.save(); }
}
export const store = new StorageManager();