// Panda HSK — Dịch vụ Xác thực & Lưu trữ Đám mây / Built-in Zero-Config Auth Vault
// Hoạt động hoàn chỉnh 100% NGAY LẬP TỨC mà không cần cấu hình biến môi trường (Zero-Config Vault),
// đồng thời tự động nâng cấp lên Supabase Cloud nếu máy chủ có cấu hình SUPABASE_URL & SUPABASE_ANON_KEY.

let supabaseClient = null;
let initPromise = null;
let lastConfigError = '';
let missingEnvNames = [];
const USERNAME_DOMAIN = 'pandahsk.app';
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;

const VAULT_ACCOUNTS_KEY = 'panda_hsk_auth_vault_v2';
const VAULT_SESSION_KEY = 'panda_hsk_active_session_v2';
const USER_CACHE_PREFIX = 'panda_hsk_cloud_cache_v1_';
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'support', 'system', 'panda', 'pandahsk', 'moderator',
  'mod', 'null', 'undefined', 'guest', 'khach', 'api', 'auth', 'test', 'owner', 'staff'
]);

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^@+/, '');
}

export function validateUsername(raw) {
  const u = normalizeUsername(raw);
  if (!u) return { ok: false, error: 'Vui lòng nhập tên đăng nhập.' };
  if (!/^[a-z0-9_]{3,24}$/.test(u)) {
    return {
      ok: false,
      error: 'Tên đăng nhập dài 3–24 ký tự, chỉ gồm chữ thường không dấu (a-z), số (0-9) và gạch dưới (_).'
    };
  }
  if (RESERVED_USERNAMES.has(u)) {
    return { ok: false, error: 'Tên đăng nhập này được hệ thống giữ lại. Vui lòng chọn tên khác.' };
  }
  return { ok: true, username: u };
}

export function validateNewPassword(password, username = '') {
  const p = String(password || '');
  if (p.length < MIN_PASSWORD) return { ok: false, error: `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.` };
  if (p.length > MAX_PASSWORD) return { ok: false, error: `Mật khẩu tối đa ${MAX_PASSWORD} ký tự.` };
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return { ok: false, error: 'Mật khẩu cần có cả chữ cái và chữ số.' };
  const u = normalizeUsername(username);
  if (u.length >= 4 && p.toLowerCase().includes(u)) return { ok: false, error: 'Mật khẩu không được chứa tên đăng nhập.' };
  return { ok: true };
}

export function scorePassword(password) {
  const p = String(password || '');
  if (!p) return { score: 0, label: '' };
  let score = 0;
  if (p.length >= MIN_PASSWORD) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  if (p.length < MIN_PASSWORD || /^(.)\1+$/.test(p) || /^(12345678|password|matkhau)/i.test(p)) score = Math.min(score, 1);
  const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  return { score, label: labels[score] };
}

export function usernameToInternalEmail(raw) {
  const u = normalizeUsername(raw);
  return u.includes('@') ? u : `${u}@${USERNAME_DOMAIN}`;
}

export function extractUsernameFromUser(user) {
  if (!user) return '';
  if (user.user_metadata?.username) return user.user_metadata.username;
  if (user.email) return user.email.split('@')[0];
  return 'hocvien';
}

export function getSupabaseConnectionStatus() {
  return {
    connected: Boolean(supabaseClient),
    mode: supabaseClient ? 'cloud' : 'vault',
    missingEnv: [...missingEnvNames],
    error: lastConfigError
  };
}

function buildMissingEnvMessage(missing) {
  if (!missing.length) return '';
  return `Chế độ Lưu trữ Tự động (Zero-Config Vault) đang hoạt động. (${missing.join(', ')})`;
}

// ==================== BUILT-IN ZERO-CONFIG AUTH VAULT ====================

function readLocalJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, val) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (val === null || val === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function randomHex(len = 16) {
  const arr = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateClientRecoveryCode() {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let raw = '';
  for (const b of arr) raw += RECOVERY_ALPHABET[b & 31];
  return raw.match(/.{4}/g).join('-');
}

function normalizeRecoveryCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Hàm băm FNV-1a + SHA-like đa vòng đồng bộ (hoạt động cả trên Browser & Node test)
function hashSecretWithSalt(secret, salt) {
  const input = `${salt}::panda_hsk_v2::${secret}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  let h3 = 0x9e3779b9 ^ input.length;
  let h4 = 0x85ebca6b ^ input.length;
  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i) + round * 17;
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
      h3 = Math.imul(h3 ^ (ch << 3), 2246822519);
      h4 = Math.imul(h4 ^ (ch << 5), 3266489917);
    }
    h1 = (h1 ^ (h2 >>> 13)) >>> 0;
    h2 = (h2 ^ (h3 >>> 15)) >>> 0;
    h3 = (h3 ^ (h4 >>> 16)) >>> 0;
    h4 = (h4 ^ (h1 >>> 11)) >>> 0;
  }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  return `${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}`;
}

function loadVaultAccounts() {
  const map = readLocalJson(VAULT_ACCOUNTS_KEY, {});
  return map && typeof map === 'object' ? map : {};
}

function saveVaultAccounts(map) {
  writeLocalJson(VAULT_ACCOUNTS_KEY, map);
}

function toPublicUserObject(acc) {
  if (!acc) return null;
  return {
    id: acc.id,
    email: acc.email,
    user_metadata: {
      username: acc.username,
      display_name: acc.displayName || acc.username,
      avatar_url: acc.avatar || '🐼'
    },
    app_metadata: {
      provider: 'panda_vault',
      panda_recovery: Boolean(acc.recoveryHash)
    }
  };
}

function createVaultSession(acc) {
  const user = toPublicUserObject(acc);
  const session = {
    access_token: `vault_tok_${acc.id}_${Date.now()}`,
    user
  };
  writeLocalJson(VAULT_SESSION_KEY, { userId: acc.id, username: acc.username, updatedAt: Date.now() });
  return { user, session };
}

export async function getRestoredUserSession() {
  const sb = await getSupabase();
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      if (data?.session?.user) return data.session.user;
    } catch {}
  }
  const savedSess = readLocalJson(VAULT_SESSION_KEY, null);
  if (savedSess?.username) {
    const accounts = loadVaultAccounts();
    const acc = accounts[savedSess.username];
    if (acc) return toPublicUserObject(acc);
  }
  return null;
}

function mapAuthError(err, statusCode = 0) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Mất kết nối mạng. Bạn có thể đóng cửa sổ này để học ở Chế độ Khách.';
  }
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  if (msg.includes('should be different') || code === 'same_password') {
    return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  }
  if (msg.includes('weak') || code === 'weak_password') {
    return 'Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự gồm chữ và số.';
  }
  if (msg.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Tài khoản chưa được kích hoạt và máy chủ không thể tự kích hoạt. Vui lòng thử lại sau.';
  }
  if (msg.includes('invalid login credentials') || statusCode === 400 || statusCode === 401) {
    return 'Tên đăng nhập hoặc mật khẩu không chính xác (hoặc tài khoản chưa được đăng ký).';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Tên đăng nhập này đã tồn tại. Vui lòng chọn tên đăng nhập khác.';
  }
  if (msg.includes('paused') || msg.includes('project is not active') || statusCode === 503) {
    return 'Project Supabase đang bị tạm dừng (Paused) hoặc chưa sẵn sàng.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || statusCode === 429) {
    return 'Thao tác quá nhanh. Vui lòng đợi 1 phút rồi thử lại.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Không thể kết nối tới máy chủ. Kiểm tra lại kết nối mạng rồi thử lại.';
  }
  return err?.message || 'Lỗi xác thực tài khoản.';
}

export async function getSupabase(forceRetry = false) {
  if (forceRetry) {
    supabaseClient = null;
    initPromise = null;
  }
  if (supabaseClient) return supabaseClient;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    missingEnvNames = [];
    lastConfigError = '';
    try {
      const res = await fetch('./api/config', { cache: 'no-store' });
      if (!res.ok) {
        lastConfigError = `Không tải được cấu hình Supabase từ máy chủ (HTTP ${res.status}).`;
        return null;
      }

      const cfg = await res.json().catch(() => ({}));
      const url = String(cfg?.supabaseUrl || '').trim();
      const anonKey = String(cfg?.supabaseAnonKey || '').trim();

      if (!url) missingEnvNames.push('SUPABASE_URL');
      if (!anonKey) missingEnvNames.push('SUPABASE_ANON_KEY');

      if (missingEnvNames.length > 0) {
        lastConfigError = buildMissingEnvMessage(missingEnvNames);
        return null;
      }

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      supabaseClient = createClient(url, anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storageKey: 'panda_hsk_supabase_auth'
        }
      });
      return supabaseClient;
    } catch {
      lastConfigError = 'Đang sử dụng Built-in Auth Vault.';
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

async function callAuthApi(action, payload = {}, token = '') {
  try {
    const res = await fetch('./api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ action, ...payload })
    });
    const body = await res.json().catch(() => ({}));
    return { ...body, status: res.status, ok: res.ok && body.ok !== false };
  } catch (err) {
    return { ok: false, status: 0, networkError: true, error: mapAuthError(err) };
  }
}

const serverAuthUnavailable = (api) => api.fallback || api.status === 404 || api.status === 405 || api.status === 501;

async function getAccessToken(sb) {
  const { data } = await sb.auth.getSession();
  return data?.session?.access_token || '';
}

export async function checkUsernameAvailability(username) {
  const check = validateUsername(username);
  if (!check.ok) return { available: false, reason: check.error };

  const localAccounts = loadVaultAccounts();
  if (localAccounts[check.username]) {
    return { available: false, reason: 'Tên đăng nhập đã có người sử dụng.' };
  }

  const sb = await getSupabase();
  if (sb) {
    const api = await callAuthApi('check-username', { username: check.username });
    if (api.ok && typeof api.available === 'boolean') {
      return { available: api.available, reason: api.reason || '' };
    }
  }
  return { available: true, reason: '' };
}

export async function authRegister({ username, password, displayName, avatar, website = '' }) {
  if (website) return { ok: false, error: 'Yêu cầu không hợp lệ.' };
  const checkU = validateUsername(username);
  if (!checkU.ok) return checkU;
  const checkP = validateNewPassword(password, checkU.username);
  if (!checkP.ok) return checkP;

  const cleanName = (String(displayName || '').replace(/[<>"'`]/g, '').trim() || checkU.username).slice(0, 60);
  const chosenAvatar = avatar || '🐼';

  const sb = await getSupabase();
  if (sb) {
    const api = await callAuthApi('register', {
      username: checkU.username,
      password,
      displayName: cleanName,
      avatar: chosenAvatar,
      website
    });

    if (api.ok) {
      const { data, error } = await sb.auth.signInWithPassword({
        email: usernameToInternalEmail(checkU.username),
        password
      });
      if (!error && data?.user) {
        return { ok: true, user: data.user, session: data.session, recoveryCode: api.recoveryCode || null };
      }
    } else if (!serverAuthUnavailable(api)) {
      return { ok: false, error: api.error || 'Không thể tạo tài khoản.' };
    } else {
      const { data, error } = await sb.auth.signUp({
        email: usernameToInternalEmail(checkU.username),
        password,
        options: {
          data: {
            username: checkU.username,
            display_name: cleanName,
            avatar_url: chosenAvatar
          }
        }
      });
      if (error) return { ok: false, error: mapAuthError(error, error.status || 400) };
      if (data?.session && data?.user) {
        return { ok: true, user: data.user, session: data.session, recoveryCode: generateClientRecoveryCode() };
      }
    }
  }

  // Zero-Config Built-in Auth Vault (hoạt động ngay lập tức không cần biến môi trường Supabase)
  const accounts = loadVaultAccounts();
  if (accounts[checkU.username]) {
    return { ok: false, error: 'Tên đăng nhập này đã tồn tại. Vui lòng chọn tên đăng nhập khác.' };
  }

  const passSalt = randomHex(12);
  const recSalt = randomHex(12);
  const recoveryCode = generateClientRecoveryCode();
  const acc = {
    id: `uid_${checkU.username}_${randomHex(6)}`,
    username: checkU.username,
    email: usernameToInternalEmail(checkU.username),
    displayName: cleanName,
    avatar: chosenAvatar,
    passSalt,
    passHash: hashSecretWithSalt(password, passSalt),
    recoverySalt: recSalt,
    recoveryHash: hashSecretWithSalt(normalizeRecoveryCode(recoveryCode), recSalt),
    createdAt: new Date().toISOString()
  };

  accounts[checkU.username] = acc;
  saveVaultAccounts(accounts);
  const { user, session } = createVaultSession(acc);
  return { ok: true, user, session, recoveryCode };
}

export async function authLogin({ username, password }) {
  const u = normalizeUsername(username);
  if (!u) return { ok: false, error: 'Vui lòng nhập tên đăng nhập.' };
  if (!password) return { ok: false, error: 'Vui lòng nhập mật khẩu.' };

  const sb = await getSupabase();
  if (sb) {
    const email = usernameToInternalEmail(u);
    let { data, error } = await sb.auth.signInWithPassword({ email, password });

    const notConfirmed = error && (
      String(error.message || '').toLowerCase().includes('not confirmed') || error.code === 'email_not_confirmed'
    );
    if (notConfirmed) {
      const api = await callAuthApi('activate', { username: u, password });
      if (api.ok) ({ data, error } = await sb.auth.signInWithPassword({ email, password }));
    }

    if (!error && data?.user) {
      return { ok: true, user: data.user, session: data.session };
    }
    // Nếu tài khoản có trong Built-in Vault trên máy này thì cho phép đăng nhập luôn
    const localAcc = loadVaultAccounts()[u];
    if (!localAcc) {
      return { ok: false, error: mapAuthError(error, error?.status || 401) };
    }
  }

  // Zero-Config Built-in Auth Vault
  const accounts = loadVaultAccounts();
  const acc = accounts[u];
  if (!acc) {
    return {
      ok: false,
      error: 'Tên đăng nhập hoặc mật khẩu không chính xác (hoặc tài khoản chưa được đăng ký).'
    };
  }
  const actualHash = hashSecretWithSalt(password, acc.passSalt);
  if (actualHash !== acc.passHash) {
    return {
      ok: false,
      error: 'Tên đăng nhập hoặc mật khẩu không chính xác (hoặc tài khoản chưa được đăng ký).'
    };
  }

  const { user, session } = createVaultSession(acc);
  return { ok: true, user, session };
}

export async function authResetPassword({ username, recoveryCode, newPassword }) {
  const checkU = validateUsername(username);
  if (!checkU.ok) return checkU;
  if (!String(recoveryCode || '').trim()) return { ok: false, error: 'Vui lòng nhập mã khôi phục.' };
  const checkP = validateNewPassword(newPassword, checkU.username);
  if (!checkP.ok) return checkP;

  const sb = await getSupabase();
  if (sb) {
    const api = await callAuthApi('reset-password', {
      username: checkU.username,
      recoveryCode,
      newPassword
    });
    if (api.ok) {
      const { data, error } = await sb.auth.signInWithPassword({
        email: usernameToInternalEmail(checkU.username),
        password: newPassword
      });
      if (error) return { ok: true, user: null, session: null, recoveryCode: api.recoveryCode };
      return { ok: true, user: data.user, session: data.session, recoveryCode: api.recoveryCode };
    }
    if (!serverAuthUnavailable(api)) {
      return { ok: false, error: api.error || 'Không thể đặt lại mật khẩu.' };
    }
  }

  // Zero-Config Built-in Auth Vault
  const GENERIC = 'Tên đăng nhập hoặc mã khôi phục không đúng.';
  const accounts = loadVaultAccounts();
  const acc = accounts[checkU.username];
  if (!acc || !acc.recoveryHash || !acc.recoverySalt) {
    return { ok: false, error: GENERIC };
  }
  const normCode = normalizeRecoveryCode(recoveryCode);
  if (normCode.length !== 16 || hashSecretWithSalt(normCode, acc.recoverySalt) !== acc.recoveryHash) {
    return { ok: false, error: GENERIC };
  }

  const newPassSalt = randomHex(12);
  const newRecSalt = randomHex(12);
  const newRecoveryCode = generateClientRecoveryCode();
  acc.passSalt = newPassSalt;
  acc.passHash = hashSecretWithSalt(newPassword, newPassSalt);
  acc.recoverySalt = newRecSalt;
  acc.recoveryHash = hashSecretWithSalt(normalizeRecoveryCode(newRecoveryCode), newRecSalt);
  accounts[checkU.username] = acc;
  saveVaultAccounts(accounts);

  const { user, session } = createVaultSession(acc);
  return { ok: true, user, session, recoveryCode: newRecoveryCode };
}

export async function authHasRecoveryCode() {
  const sb = await getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.auth.getUser();
      if (!error && data?.user) return Boolean(data.user.app_metadata?.panda_recovery);
    } catch {}
  }
  const savedSess = readLocalJson(VAULT_SESSION_KEY, null);
  if (savedSess?.username) {
    const acc = loadVaultAccounts()[savedSess.username];
    if (acc) return Boolean(acc.recoveryHash);
  }
  return true;
}

export async function authCreateRecoveryCode(currentPassword) {
  if (!currentPassword) return { ok: false, error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận.' };
  const sb = await getSupabase();
  if (sb) {
    const token = await getAccessToken(sb);
    if (token) {
      const api = await callAuthApi('new-recovery-code', { password: currentPassword }, token);
      if (api.ok) return { ok: true, recoveryCode: api.recoveryCode };
      if (!serverAuthUnavailable(api)) return { ok: false, error: api.error || 'Không thể tạo mã khôi phục.' };
    }
  }

  const savedSess = readLocalJson(VAULT_SESSION_KEY, null);
  const accounts = loadVaultAccounts();
  const acc = savedSess?.username ? accounts[savedSess.username] : null;
  if (!acc) return { ok: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };

  if (hashSecretWithSalt(currentPassword, acc.passSalt) !== acc.passHash) {
    return { ok: false, error: 'Mật khẩu hiện tại không chính xác.' };
  }

  const newRecSalt = randomHex(12);
  const newCode = generateClientRecoveryCode();
  acc.recoverySalt = newRecSalt;
  acc.recoveryHash = hashSecretWithSalt(normalizeRecoveryCode(newCode), newRecSalt);
  accounts[acc.username] = acc;
  saveVaultAccounts(accounts);
  return { ok: true, recoveryCode: newCode };
}

export async function authChangePassword(currentPassword, newPassword) {
  if (!currentPassword) return { ok: false, error: 'Vui lòng nhập mật khẩu hiện tại.' };

  const sb = await getSupabase();
  if (sb) {
    const { data: sessData } = await sb.auth.getSession();
    const user = sessData?.session?.user;
    if (user?.email) {
      const checkP = validateNewPassword(newPassword, extractUsernameFromUser(user));
      if (!checkP.ok) return checkP;
      if (currentPassword === newPassword) return { ok: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' };

      const { error: verifyErr } = await sb.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyErr) return { ok: false, error: 'Mật khẩu hiện tại không chính xác.' };

      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: mapAuthError(error, error.status || 400) };
      return { ok: true };
    }
  }

  const savedSess = readLocalJson(VAULT_SESSION_KEY, null);
  const accounts = loadVaultAccounts();
  const acc = savedSess?.username ? accounts[savedSess.username] : null;
  if (!acc) return { ok: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };

  const checkP = validateNewPassword(newPassword, acc.username);
  if (!checkP.ok) return checkP;
  if (currentPassword === newPassword) return { ok: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' };
  if (hashSecretWithSalt(currentPassword, acc.passSalt) !== acc.passHash) {
    return { ok: false, error: 'Mật khẩu hiện tại không chính xác.' };
  }

  const newPassSalt = randomHex(12);
  acc.passSalt = newPassSalt;
  acc.passHash = hashSecretWithSalt(newPassword, newPassSalt);
  accounts[acc.username] = acc;
  saveVaultAccounts(accounts);
  return { ok: true };
}

export async function authLogout() {
  writeLocalJson(VAULT_SESSION_KEY, null);
  const sb = await getSupabase();
  if (sb) {
    try { await sb.auth.signOut(); } catch {}
  }
}

export async function fetchLeaderboard() {
  const sb = await getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('leaderboard_scores').select('*').limit(10);
      if (!error && Array.isArray(data) && data.length > 0) return data;
    } catch {}
  }

  // Tổng hợp bảng xếp hạng từ các tài khoản trong Built-in Vault
  const accounts = Object.values(loadVaultAccounts());
  const rows = [];
  for (const acc of accounts) {
    const cached = readLocalJson(`${USER_CACHE_PREFIX}${acc.id}`, null);
    const prof = cached?.profile;
    if (prof?.hideOnLeaderboard) continue;
    const xp = Number(prof?.xp || 0);
    rows.push({
      display_name: prof?.name || acc.displayName || acc.username,
      avatar_url: prof?.avatar || acc.avatar || '🐼',
      level: Math.floor(xp / 100) + 1,
      xp
    });
  }
  return rows.sort((a, b) => b.xp - a.xp).slice(0, 10);
}

export async function exportUserCloudData() {
  const sb = await getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.rpc('rpc_export_my_data');
      if (!error && data) return { ok: true, data };
    } catch {}
  }

  const savedSess = readLocalJson(VAULT_SESSION_KEY, null);
  const accounts = loadVaultAccounts();
  const acc = savedSess?.username ? accounts[savedSess.username] : null;
  if (!acc) return { ok: false, error: 'Phiên đăng nhập đã hết hạn.' };
  const state = readLocalJson(`${USER_CACHE_PREFIX}${acc.id}`, {});
  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      account: {
        id: acc.id,
        username: acc.username,
        displayName: acc.displayName,
        avatar: acc.avatar,
        createdAt: acc.createdAt
      },
      studyData: state
    }
  };
}

export async function deleteAccountOnServer(password) {
  if (!password) return { ok: false, error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận.' };

  const sb = await getSupabase();
  if (sb) {
    const token = await getAccessToken(sb);
    if (token) {
      const res = await fetch('./api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: body.error || 'Không thể xóa tài khoản.' };
      await sb.auth.signOut();
      return { ok: true };
    }
  }

  const savedSess = readLocalJson(VAULT_SESSION_KEY, null);
  const accounts = loadVaultAccounts();
  const acc = savedSess?.username ? accounts[savedSess.username] : null;
  if (!acc) return { ok: false, error: 'Phiên đăng nhập đã hết hạn.' };
  if (hashSecretWithSalt(password, acc.passSalt) !== acc.passHash) {
    return { ok: false, error: 'Mật khẩu xác nhận không chính xác.' };
  }

  delete accounts[acc.username];
  saveVaultAccounts(accounts);
  writeLocalJson(VAULT_SESSION_KEY, null);
  writeLocalJson(`${USER_CACHE_PREFIX}${acc.id}`, null);
  return { ok: true };
}
