import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Gia lap moi truong trinh duyet (window, localStorage, navigator, fetch)
const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
  setItem: (k, v) => memStorage.set(String(k), String(v)),
  removeItem: (k) => memStorage.delete(String(k)),
  clear: () => memStorage.clear()
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  addEventListener: () => {}
};
// Node >= 21 co san globalThis.navigator chi-doc → ghi de bang defineProperty
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });

import configHandler from '../api/config.js';
import {
  getSupabase,
  getSupabaseConnectionStatus,
  validateUsername,
  usernameToInternalEmail,
  authLogin,
  authRegister
} from '../js/services/supabase-client.js';
import { store } from '../js/storage/db.js';
import { dataLoader } from '../js/data/loader.js';
import { computeVocabSummary, countWordsByLevel } from '../js/data/vocab-stats.js';

globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('/api/config')) {
    let statusCode = 200;
    let payload = {};
    const req = { method: 'GET' };
    const res = {
      setHeader: () => {},
      status: (c) => { statusCode = c; return res; },
      json: (obj) => { payload = obj; return res; }
    };
    configHandler(req, res);
    return {
      ok: statusCode >= 200 && statusCode < 300,
      status: statusCode,
      json: async () => payload
    };
  }
  if (u.includes('/data/')) {
    const cleanRel = u.replace(/^\.\//, '');
    const full = path.resolve(cleanRel);
    if (fs.existsSync(full)) {
      const text = fs.readFileSync(full, 'utf8');
      return { ok: true, status: 200, text: async () => text };
    }
    return { ok: false, status: 404, text: async () => '' };
  }
  return { ok: false, status: 404, json: async () => ({}) };
};

// Kich ban (f): Xoa het bien moi truong -> bao dung ten bien thieu + chay Che do Khach
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
const sbMissing = await getSupabase(true);
assert.equal(sbMissing, null);
const statusMissing = getSupabaseConnectionStatus();
assert.deepEqual(statusMissing.missingEnv, ['SUPABASE_URL', 'SUPABASE_ANON_KEY']);
assert.ok(statusMissing.error.includes('SUPABASE_URL'));
assert.ok(statusMissing.error.includes('SUPABASE_ANON_KEY'));

const loginWhenMissing = await authLogin({ username: 'tieu1710', password: 'password123' });
assert.equal(loginWhenMissing.ok, false);
assert.ok(loginWhenMissing.error.includes('SUPABASE_URL'));

// Kich ban (a), (b), (c): Validate dau vao & anh xa username -> email noi bo
assert.equal(validateUsername('ab').ok, false);
assert.equal(validateUsername('tieu1710').ok, true);
assert.equal(usernameToInternalEmail('tieu1710'), 'tieu1710@pandahsk.app');

process.env.SUPABASE_URL = '  https://demo.supabase.co  ';
process.env.SUPABASE_ANON_KEY = '  anon_public_demo  ';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret_should_never_expose';

const shortPassRes = await authRegister({ username: 'tieu1710', password: '123', displayName: 'Le Tieu' });
assert.equal(shortPassRes.ok, false);
assert.ok(shortPassRes.error.includes('8 ký tự'));

// Kiem tra /api/config khong bao gio lo SERVICE_ROLE_KEY va da trim()
const cfgRes = await (await fetch('./api/config')).json();
assert.equal(cfgRes.supabaseUrl, 'https://demo.supabase.co');
assert.equal(cfgRes.supabaseAnonKey, 'anon_public_demo');
assert.equal('supabaseServiceRoleKey' in cfgRes, false);

// Kich ban (g) & (h): Hoc o Che do Khach khi offline -> luu localStorage -> dang nhap & dong bo
globalThis.navigator.onLine = false;
store.state.srs['你好'] = { streak: 3, reviews: 3, lastReview: '2026-11-24' };
store.state.profile.xp = 150;
store.state.profile.coins = 30;
store.save();
assert.equal(store.syncStatus, 'guest');

// Gia lap nguoi dung dang nhap sau khi hoc o Che do Khach
store.user = {
  id: 'uid-test-1710',
  email: 'tieu1710@pandahsk.app',
  user_metadata: { username: 'tieu1710', display_name: 'Lê Tiêu' }
};
store.currentUsername = 'tieu1710';
store.state.srs = {};
store.state.profile.xp = 0;

const pending = store.detectPendingLocalProgress();
assert.ok(Array.isArray(pending) && pending.length >= 1);
assert.equal(pending[0].source, 'guest');
assert.equal(pending[0].wordCount, 1);
assert.equal(pending[0].xp, 150);

// Kiem tra du lieu tu vung HSK 1-9
const words = await dataLoader.init(true);
assert.ok(words.length > 100, `Expected > 100 words, got ${words.length}`);
for (let lv = 1; lv <= 9; lv++) {
  assert.ok(countWordsByLevel(words, lv) > 0, `HSK ${lv} khong duoc rong`);
}
const summary = computeVocabSummary(words, { '爱': { streak: 3 } });
assert.equal(summary.total, words.length);
assert.equal(summary.mastered, 1);

console.log(`ALL STEP 3 CHECKS PASSED! (${words.length} tu vung HSK 1-9 san sang)`);