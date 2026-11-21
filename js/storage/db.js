import { getSupabase, extractUsernameFromUser } from '../services/supabase-client.js';

const CACHE_PREFIX = 'panda_hsk_cloud_cache_v1_';
const LEGACY_ACCOUNTS_KEY = 'panda_hsk_accounts_v1';
const MIGRATION_DONE_KEY = 'panda_hsk_migrated_flag_v1';

function createDefaultState(name = 'Khách', avatar = '🐼') {
  return {
    profile: { name, avatar, xp: 0, coins: 0, streak: 0, longestStreak: 0, activeWorld: 1, lastStudyDate: null, hideOnLeaderboard: false, dailyGoalMinutes: 15 },
    srs: {}, customDecks: [], examHistory: [], inProgressExam: null, badges: [], dailyStats: [], settings: { theme: 'light' }, errorReports: []
  };
}

class CloudStore {
  constructor() {
    this.user = null;
    this.currentUsername = null;
    this.state = createDefaultState();
    this.syncStatus = 'idle';
    this.syncListeners = new Set();
    this.dirtyWords = new Set();
    this.lastSyncedSnapshot = { xp: 0, coins: 0, examCount: 0, reportCount: 0 };
    this.saveTimer = null;
    this.pendingSync = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.pendingSync || this.dirtyWords.size > 0) this.flushToCloud();
        else if (this.user) this.setSyncStatus('saved');
      });
      window.addEventListener('offline', () => {
        if (this.user) this.setSyncStatus('offline');
      });
    }
  }

  onSyncStatus(fn) {
    this.syncListeners.add(fn);
    fn(this.syncStatus);
    return () => this.syncListeners.delete(fn);
  }

  setSyncStatus(status) {
    this.syncStatus = status;
    this.syncListeners.forEach((fn) => { try { fn(status); } catch {} });
  }

  getCacheKey(uid) { return `${CACHE_PREFIX}${uid}`; }
  saveLocalCache() {
    if (!this.user) return;
    try { localStorage.setItem(this.getCacheKey(this.user.id), JSON.stringify(this.state)); } catch {}
  }
  loadLocalCache(uid) {
    try { const r = localStorage.getItem(this.getCacheKey(uid)); return r ? JSON.parse(r) : null; } catch { return null; }
  }
  clearUserLocalCache(uid) {
    try { if (uid) localStorage.removeItem(this.getCacheKey(uid)); } catch {}
  }

  async bindUser(user) {
    this.user = user;
    if (!user) {
      this.currentUsername = null;
      this.state = createDefaultState();
      this.setSyncStatus('idle');
      return;
    }
    this.currentUsername = extractUsernameFromUser(user);
    const metaName = user.user_metadata?.display_name || this.currentUsername;
    const metaAvatar = user.user_metadata?.avatar_url || '🐼';
    const cached = this.loadLocalCache(user.id);
    this.state = cached ? { ...createDefaultState(metaName, metaAvatar), ...cached } : createDefaultState(metaName, metaAvatar);
    await this.loadFromCloud();
  }

  async loadFromCloud() {
    if (!this.user) return;
    const sb = await getSupabase();
    if (!sb) return;
    if (!navigator.onLine) { this.setSyncStatus('offline'); return; }

    this.setSyncStatus('syncing');
    const uid = this.user.id;
    try {
      const [profRes, progRes, vocabRes, decksRes, examsRes, badgesRes, statsRes] = await Promise.all([
        sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
        sb.from('user_progress').select('*').eq('user_id', uid).maybeSingle(),
        sb.from('vocab_progress').select('*').eq('user_id', uid),
        sb.from('custom_decks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        sb.from('exam_attempts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        sb.from('user_badges').select('badge_code, awarded_at, badges(name, icon, description)').eq('user_id', uid),
        sb.from('daily_stats').select('*').eq('user_id', uid).order('stat_date', { ascending: false }).limit(30)
      ]);

      if (profRes.data) {
        this.state.profile.name = profRes.data.display_name || this.state.profile.name;
        this.state.profile.avatar = profRes.data.avatar_url || this.state.profile.avatar;
        this.state.profile.activeWorld = profRes.data.current_hsk_level || 1;
        this.state.profile.hideOnLeaderboard = Boolean(profRes.data.hide_on_leaderboard);
        this.state.settings.theme = profRes.data.theme || 'light';
      }
      if (progRes.data) {
        this.state.profile.xp = Number(progRes.data.xp || 0);
        this.state.profile.coins = Number(progRes.data.coins || 0);
        this.state.profile.streak = Number(progRes.data.current_streak || 0);
        this.state.profile.longestStreak = Number(progRes.data.longest_streak || 0);
        this.state.profile.lastStudyDate = progRes.data.last_study_date || null;
      }

      const cloudSrs = {};
      if (Array.isArray(vocabRes.data)) {
        vocabRes.data.forEach((row) => {
          cloudSrs[row.word_id] = {
            streak: row.srs_streak || 0,
            reviews: (row.correct_count || 0) + (row.wrong_count || 0),
            lastReview: row.last_reviewed_at ? row.last_reviewed_at.slice(0, 10) : null,
            status: row.status
          };
        });
      }
      Object.entries(this.state.srs || {}).forEach(([hz, localRec]) => {
        const cRec = cloudSrs[hz];
        if (!cRec || (localRec.streak || 0) > (cRec.streak || 0)) {
          cloudSrs[hz] = localRec;
          this.dirtyWords.add(hz);
        }
      });
      this.state.srs = cloudSrs;

      if (Array.isArray(decksRes.data)) {
        this.state.customDecks = decksRes.data.map((d) => ({
          id: d.client_deck_id || d.id, dbId: d.id, title: d.title, words: Array.isArray(d.words) ? d.words : []
        }));
      }
      if (Array.isArray(examsRes.data)) {
        const submitted = examsRes.data.filter((e) => e.status === 'submitted');
        const draft = examsRes.data.find((e) => e.status === 'in_progress' && e.draft_state);
        this.state.examHistory = submitted.map((e) => ({
          level: e.hsk_level, examId: e.exam_code, score: Number(e.total_score || 0),
          maxScore: Number(e.max_score || 100), passed: Boolean(e.passed),
          date: e.submitted_at ? new Date(e.submitted_at).toLocaleDateString('vi-VN') : ''
        }));
        if (draft?.draft_state) this.state.inProgressExam = draft.draft_state;
      }
      if (Array.isArray(badgesRes.data)) this.state.badges = badgesRes.data;
      if (Array.isArray(statsRes.data)) this.state.dailyStats = statsRes.data;

      this.lastSyncedSnapshot = {
        xp: this.state.profile.xp, coins: this.state.profile.coins,
        examCount: this.state.examHistory.length, reportCount: (this.state.errorReports || []).length
      };
      this.saveLocalCache();
      this.setSyncStatus('saved');
      if (this.dirtyWords.size > 0) this.flushToCloud();
    } catch {
      this.setSyncStatus('error');
    }
  }

  save() {
    if (!this.user) return;
    Object.keys(this.state.srs || {}).forEach((hz) => this.dirtyWords.add(hz));
    this.saveLocalCache();
    this.pendingSync = true;
    if (!navigator.onLine) { this.setSyncStatus('offline'); return; }
    this.setSyncStatus('syncing');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushToCloud(), 1000);
  }

  async flushToCloud() {
    if (!this.user) return;
    const sb = await getSupabase();
    if (!sb) return;
    if (!navigator.onLine) { this.setSyncStatus('offline'); return; }

    const uid = this.user.id;
    this.setSyncStatus('syncing');
    try {
      await sb.from('profiles').update({
        display_name: String(this.state.profile.name || this.currentUsername).slice(0, 60),
        avatar_url: this.state.profile.avatar || '🐼',
        current_hsk_level: Number(this.state.profile.activeWorld || 1),
        hide_on_leaderboard: Boolean(this.state.profile.hideOnLeaderboard),
        theme: this.state.settings.theme || 'light'
      }).eq('id', uid);

      const xpDelta = Math.max(0, (this.state.profile.xp || 0) - (this.lastSyncedSnapshot.xp || 0));
      const coinsDelta = Math.max(0, (this.state.profile.coins || 0) - (this.lastSyncedSnapshot.coins || 0));
      if (xpDelta > 0 || coinsDelta > 0) {
        const { data: progRow } = await sb.rpc('rpc_record_study_reward', {
          p_xp_delta: Math.min(xpDelta, 500), p_coins_delta: Math.min(coinsDelta, 200),
          p_study_minutes: 1, p_words_learned: 0, p_words_reviewed: this.dirtyWords.size
        });
        if (progRow) {
          this.state.profile.xp = Number(progRow.xp || this.state.profile.xp);
          this.state.profile.coins = Number(progRow.coins || this.state.profile.coins);
          this.state.profile.streak = Number(progRow.current_streak || this.state.profile.streak);
        }
        this.lastSyncedSnapshot.xp = this.state.profile.xp;
        this.lastSyncedSnapshot.coins = this.state.profile.coins;
      }

      if (this.dirtyWords.size > 0) {
        const batch = Array.from(this.dirtyWords).slice(0, 200).map((hz) => {
          const rec = this.state.srs[hz] || { streak: 0, reviews: 1 };
          const streak = Number(rec.streak || 0);
          return {
            user_id: uid, word_id: hz, status: streak >= 3 ? 'mastered' : 'learning',
            correct_count: streak, wrong_count: Math.max(0, Number(rec.reviews || 1) - streak),
            srs_streak: streak, srs_interval_days: streak >= 3 ? 7 : 1, last_reviewed_at: new Date().toISOString()
          };
        });
        const { error: vocabErr } = await sb.from('vocab_progress').upsert(batch, { onConflict: 'user_id,word_id' });
        if (!vocabErr) batch.forEach((b) => this.dirtyWords.delete(b.word_id));
      }

      if (Array.isArray(this.state.customDecks) && this.state.customDecks.length > 0) {
        const deckRows = this.state.customDecks.map((d) => ({
          user_id: uid, client_deck_id: String(d.id), title: String(d.title || 'Bộ thẻ').slice(0, 120), words: d.words || []
        }));
        await sb.from('custom_decks').upsert(deckRows, { onConflict: 'user_id,client_deck_id' });
      }

      const exams = this.state.examHistory || [];
      if (exams.length > this.lastSyncedSnapshot.examCount) {
        const latest = exams[0];
        if (latest?.examId) {
          await sb.rpc('rpc_submit_exam_attempt', {
            p_hsk_level: Number(latest.level || 1), p_exam_code: String(latest.examId), p_exam_type: 'mock',
            p_skill_scores: latest.skillScores || {}, p_total_score: Number(latest.score || 0),
            p_max_score: Number(latest.maxScore || 100), p_passed: Boolean(latest.passed),
            p_duration_seconds: Number(latest.durationSeconds || 600), p_answers: latest.answers || {}
          });
        }
        this.lastSyncedSnapshot.examCount = exams.length;
      }

      if (this.state.inProgressExam?.examId) {
        const draft = this.state.inProgressExam;
        await sb.from('exam_attempts').upsert({
          user_id: uid, hsk_level: Number(draft.level || 1), exam_code: String(draft.examId),
          exam_type: 'mock', max_score: 100, draft_state: draft, status: 'in_progress'
        }, { onConflict: 'user_id,exam_code' });
      }

      const reports = this.state.errorReports || [];
      if (reports.length > this.lastSyncedSnapshot.reportCount) {
        const newest = reports[0];
        if (newest) {
          await sb.from('content_reports').insert({
            user_id: uid, target_ref: String(newest.target || 'Chung'), description: String(newest.desc || '')
          });
        }
        this.lastSyncedSnapshot.reportCount = reports.length;
      }

      this.pendingSync = false;
      this.saveLocalCache();
      this.setSyncStatus('saved');
    } catch {
      this.setSyncStatus('error');
    }
  }

  detectLegacyLocalData() {
    try {
      const doneFor = localStorage.getItem(MIGRATION_DONE_KEY);
      if (this.user && doneFor === this.user.id) return null;
      const rawAcc = localStorage.getItem(LEGACY_ACCOUNTS_KEY);
      const accounts = rawAcc ? JSON.parse(rawAcc) : [];
      const found = [];
      if (Array.isArray(accounts)) {
        accounts.forEach((acc) => {
          const stRaw = localStorage.getItem(`panda_hsk_state_${acc.username}`);
          if (stRaw) {
            const st = JSON.parse(stRaw);
            const wordCount = Object.keys(st.srs || {}).length;
            const xp = st.profile?.xp || 0;
            if (wordCount > 0 || xp > 0 || (st.customDecks || []).length > 0 || (st.examHistory || []).length > 0) {
              found.push({ username: acc.username, displayName: acc.displayName || acc.username, wordCount, xp, state: st });
            }
          }
        });
      }
      return found.length ? found : null;
    } catch { return null; }
  }

  async migrateLegacyState(legacyState) {
    if (!this.user || !legacyState) return { ok: false };
    const sb = await getSupabase();
    if (!sb) return { ok: false };
    const { data, error } = await sb.rpc('rpc_migrate_local_data', { p_payload: legacyState });
    if (error) return { ok: false, error: error.message };
    localStorage.setItem(MIGRATION_DONE_KEY, this.user.id);
    await this.loadFromCloud();
    return { ok: true, result: data };
  }

  markLegacySkipped() {
    if (this.user) localStorage.setItem(MIGRATION_DONE_KEY, this.user.id);
  }
}

export const store = new CloudStore();