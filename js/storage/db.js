const ACCOUNTS_INDEX_KEY = 'longmon_hsk_accounts_v1';
const ACTIVE_USER_KEY = 'longmon_hsk_active_user_v1';

function defaultState(displayName = 'Học viên Khách', avatar = '🐼') {
  return {
    profile: {
      name: displayName,
      avatar,
      xp: 0,
      coins: 50,
      streak: 0,
      freezes: 1,
      lastStudyDate: null,
      activeWorld: 1
    },
    srs: {},
    customDecks: [],
    examHistory: [],
    inProgressExam: null,
    watchedVideos: [],
    dailyGoal: { targetWords: 15, todayCount: 0, date: new Date().toISOString().slice(0, 10) },
    reminder: { enabled: false, time: '20:00', email: '' },
    arenaStats: { bestScore: 0, wins: 0, badges: [] },
    placementResult: null,
    errorReports: [],
    settings: { theme: 'light' }
  };
}

class MultiUserStore {
  constructor() {
    this.accounts = this._loadAccounts();
    this.currentUsername = localStorage.getItem(ACTIVE_USER_KEY) || null;
    this.state = this._loadUserState(this.currentUsername);
  }

  _loadAccounts() {
    try {
      const raw = JSON.parse(localStorage.getItem(ACCOUNTS_INDEX_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  }

  _saveAccounts() {
    localStorage.setItem(ACCOUNTS_INDEX_KEY, JSON.stringify(this.accounts));
  }

  _storageKey(username) {
    return username ? `longmon_hsk_data_${username}` : 'longmon_hsk_guest_data';
  }

  _loadUserState(username) {
    try {
      const raw = localStorage.getItem(this._storageKey(username));
      const acc = this.accounts.find((a) => a.username === username);
      const base = defaultState(acc ? acc.displayName : 'Học viên Khách', acc ? acc.avatar : '🐼');
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return {
        ...base,
        ...parsed,
        profile: { ...base.profile, ...(parsed.profile || {}) },
        dailyGoal: { ...base.dailyGoal, ...(parsed.dailyGoal || {}) },
        reminder: { ...base.reminder, ...(parsed.reminder || {}) },
        arenaStats: { ...base.arenaStats, ...(parsed.arenaStats || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) }
      };
    } catch {
      return defaultState();
    }
  }

  save() {
    localStorage.setItem(this._storageKey(this.currentUsername), JSON.stringify(this.state));
    if (this.currentUsername) {
      const idx = this.accounts.findIndex((a) => a.username === this.currentUsername);
      if (idx >= 0) {
        this.accounts[idx].xp = this.state.profile.xp;
        this.accounts[idx].level = Math.floor(this.state.profile.xp / 100) + 1;
        this.accounts[idx].displayName = this.state.profile.name;
        this.accounts[idx].avatar = this.state.profile.avatar;
        this._saveAccounts();
      }
    }
  }

  register({ username, password, displayName, avatar = '🐼' }) {
    const cleanUser = String(username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUser.length < 3) return { ok: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự (chữ không dấu hoặc số).' };
    if (!password || password.length < 4) return { ok: false, error: 'Mật khẩu phải có ít nhất 4 ký tự.' };
    if (this.accounts.length >= 10) return { ok: false, error: 'Thiết bị đã đạt tối đa 10 tài khoản.' };
    if (this.accounts.some((a) => a.username === cleanUser)) return { ok: false, error: 'Tên đăng nhập này đã tồn tại!' };

    const newAcc = {
      username: cleanUser,
      password,
      displayName: String(displayName || cleanUser).trim(),
      avatar,
      xp: 0,
      level: 1,
      createdAt: new Date().toLocaleDateString('vi-VN')
    };
    this.accounts.push(newAcc);
    this._saveAccounts();

    this.currentUsername = cleanUser;
    localStorage.setItem(ACTIVE_USER_KEY, cleanUser);
    this.state = defaultState(newAcc.displayName, avatar);
    this.save();
    return { ok: true };
  }

  login(username, password) {
    const cleanUser = String(username || '').trim().toLowerCase();
    const acc = this.accounts.find((a) => a.username === cleanUser && a.password === password);
    if (!acc) return { ok: false, error: 'Sai tên đăng nhập hoặc mật khẩu!' };
    this.currentUsername = acc.username;
    localStorage.setItem(ACTIVE_USER_KEY, acc.username);
    this.state = this._loadUserState(acc.username);
    return { ok: true };
  }

  quickSwitch(username) {
    const acc = this.accounts.find((a) => a.username === username);
    if (!acc) return false;
    this.currentUsername = acc.username;
    localStorage.setItem(ACTIVE_USER_KEY, acc.username);
    this.state = this._loadUserState(acc.username);
    return true;
  }

  logout() {
    this.currentUsername = null;
    localStorage.removeItem(ACTIVE_USER_KEY);
    this.state = this._loadUserState(null);
  }

  deleteAccount(username) {
    this.accounts = this.accounts.filter((a) => a.username !== username);
    this._saveAccounts();
    localStorage.removeItem(this._storageKey(username));
    if (this.currentUsername === username) this.logout();
  }
}

export const store = new MultiUserStore();