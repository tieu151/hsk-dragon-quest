const LS_KEY = 'longmon_hsk_state_v1';
const DB_NAME = 'LongMonHSK_DB';
const DB_VERSION = 1;

const DEFAULT_STATE = {
  profile: {
    xp: 0,
    coins: 50,
    streak: 0,
    freezes: 1,
    lastStudyDate: null,
    activeWorld: 1,
    unlockedWorlds: [1, 2, 3, 4, 5],
    unlockedSkins: ['default'],
    activeSkin: 'default',
    unlockedMascots: ['dragon'],
    activeMascot: 'dragon',
    badges: [],
    stageStars: {},
    bossDefeated: {},
    dailyChallengeDate: null,
    dailyChallengeScore: 0,
    dailyTasks: { date: null, reviewsDone: 0, newLearned: 0, gameWon: false }
  },
  settings: {
    theme: 'light',
    hanziScale: 1,
    sfx: true,
    bgm: false,
    vibrate: true,
    ttsRate: 1.0,
    privacyConsentMic: false
  },
  srs: {},
  phoneticErrors: {},
  weeklyRtLog: [],
  hardWords: []
};

class StorageManager {
  constructor() {
    this.state = this.loadLocal();
    this.db = null;
  }

  loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_STATE),
        ...parsed,
        profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) }
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  async initIndexedDB() {
    if (!('indexedDB' in window)) return;
    return new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('snapshot')) {
          db.createObjectStore('snapshot', { keyPath: 'key' });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      req.onerror = () => resolve();
    });
  }

  save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('LocalStorage đầy, chỉ lưu vào IndexedDB:', e);
    }
    if (this.db) {
      try {
        const tx = this.db.transaction('snapshot', 'readwrite');
        tx.objectStore('snapshot').put({ key: 'main', data: this.state, updatedAt: Date.now() });
      } catch {}
    }
  }

  logSessionEvent(event) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('logs', 'readwrite');
      tx.objectStore('logs').add({ ...event, ts: Date.now() });
    } catch {}
  }

  exportJSON() {
    const payload = {
      app: 'LongMonHSK',
      version: 1,
      exportedAt: new Date().toISOString(),
      state: this.state
    };
    return JSON.stringify(payload, null, 2);
  }

  importJSON(jsonText) {
    const parsed = JSON.parse(jsonText);
    const incoming = parsed.state || parsed;
    if (!incoming.profile || !incoming.srs) {
      throw new Error('Tệp JSON không đúng định dạng sao lưu Long Môn HSK.');
    }
    this.state = {
      ...structuredClone(DEFAULT_STATE),
      ...incoming,
      profile: { ...DEFAULT_STATE.profile, ...incoming.profile },
      settings: { ...DEFAULT_STATE.settings, ...(incoming.settings || {}) }
    };
    this.save();
    return this.state;
  }

  resetAll() {
    this.state = structuredClone(DEFAULT_STATE);
    this.save();
  }
}

export const store = new StorageManager();