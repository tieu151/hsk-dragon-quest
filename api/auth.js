// Panda HSK — API xác thực phía máy chủ (Vercel Serverless Function)
// Gộp mọi thao tác vào 1 function để không vượt giới hạn số function của gói Hobby.
//
// Các action (POST JSON { action, ... }):
//   - check-username     : kiểm tra tên đăng nhập còn trống hay không
//   - register           : tạo tài khoản đã xác nhận sẵn (KHÔNG cần tắt "Confirm email")
//                          + sinh MÃ KHÔI PHỤC dùng một lần
//   - reset-password     : quên mật khẩu → đặt lại bằng tên đăng nhập + mã khôi phục
//   - new-recovery-code  : (cần đăng nhập + mật khẩu hiện tại) tạo mã khôi phục mới
//   - activate           : tự kích hoạt tài khoản cũ bị kẹt "Email not confirmed" (khi mật khẩu đúng)
//
// Không cần SMTP, không cần chạy SQL migration, không cần chỉnh Supabase Dashboard.
// Mã khôi phục chỉ lưu dạng băm scrypt trong auth.users.app_metadata (người dùng không tự sửa được).

import crypto from 'node:crypto';

export const USERNAME_DOMAIN = 'pandahsk.app';
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'support', 'system', 'panda', 'pandahsk', 'moderator',
  'mod', 'null', 'undefined', 'guest', 'khach', 'api', 'auth', 'test', 'owner', 'staff'
]);
const ALLOWED_AVATARS = ['🐼', '🐉', '🐯', '🦊', '🦁', '🐰', '🦅', '🦄'];
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 ký tự, bỏ 0/O/1/I dễ nhầm

// ---------- Tiện ích thuần (được export để kiểm thử) ----------

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^@+/, '');
}

export function validateUsername(raw) {
  const u = normalizeUsername(raw);
  if (!u) return { ok: false, error: 'Vui lòng nhập tên đăng nhập.' };
  if (!USERNAME_RE.test(u)) {
    return { ok: false, error: 'Tên đăng nhập dài 3–24 ký tự, chỉ gồm chữ thường không dấu (a-z), số (0-9) và gạch dưới (_).' };
  }
  if (RESERVED_USERNAMES.has(u)) return { ok: false, error: 'Tên đăng nhập này được hệ thống giữ lại. Vui lòng chọn tên khác.' };
  return { ok: true, username: u };
}

export function validateNewPassword(password, username = '') {
  const p = String(password || '');
  if (p.length < MIN_PASSWORD) return { ok: false, error: `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.` };
  if (p.length > MAX_PASSWORD) return { ok: false, error: `Mật khẩu tối đa ${MAX_PASSWORD} ký tự.` };
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return { ok: false, error: 'Mật khẩu cần có cả chữ cái và chữ số.' };
  const u = normalizeUsername(username);
  if (u.length >= 4 && p.toLowerCase().includes(u)) {
    return { ok: false, error: 'Mật khẩu không được chứa tên đăng nhập.' };
  }
  return { ok: true };
}

export function usernameToEmail(username) {
  return `${normalizeUsername(username)}@${USERNAME_DOMAIN}`;
}

export function generateRecoveryCode() {
  const bytes = crypto.randomBytes(16);
  let raw = '';
  for (const b of bytes) raw += RECOVERY_ALPHABET[b & 31];
  return raw.match(/.{4}/g).join('-');
}

export function normalizeRecoveryCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashRecoveryCode(code, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(normalizeRecoveryCode(code), salt, 32).toString('hex');
  return { v: 1, salt, hash, created_at: new Date().toISOString() };
}

export function verifyRecoveryCode(code, record) {
  if (!record?.salt || !record?.hash) return false;
  const norm = normalizeRecoveryCode(code);
  if (norm.length !== 16) return false;
  const expected = Buffer.from(record.hash, 'hex');
  const actual = crypto.scryptSync(norm, record.salt, 32);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function cleanDisplayName(name, fallback) {
  const v = String(name || '').replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return v || fallback;
}

// ---------- Giới hạn tần suất (best-effort trong bộ nhớ của instance) ----------

const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }
  return b.count <= max;
}
export function _resetRateLimits() { buckets.clear(); }

// ---------- Gọi Supabase REST ----------

function getEnv() {
  return {
    url: String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''),
    anon: String(process.env.SUPABASE_ANON_KEY || '').trim(),
    service: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  };
}

async function sb(env, path, { method = 'GET', key, token, body } = {}) {
  const res = await fetch(`${env.url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function getUserById(env, id) {
  const r = await sb(env, `/auth/v1/admin/users/${encodeURIComponent(id)}`, { key: env.service });
  return r.ok ? (r.data?.user || r.data) : null;
}

// Tìm user theo email: ưu tiên bảng profiles (nhanh), dự phòng quét danh sách admin.
async function findUserByEmail(env, email, { deep = true } = {}) {
  const target = email.toLowerCase();
  const p = await sb(env, `/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(target)}&limit=1`, { key: env.service });
  if (p.ok && Array.isArray(p.data) && p.data[0]?.id) return getUserById(env, p.data[0].id);
  if (p.ok && !deep) return null;

  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const r = await sb(env, `/auth/v1/admin/users?page=${page}&per_page=${perPage}`, { key: env.service });
    if (!r.ok) return null;
    const users = Array.isArray(r.data?.users) ? r.data.users : (Array.isArray(r.data) ? r.data : []);
    const hit = users.find((u) => String(u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (users.length < perPage) return null;
  }
  return null;
}

async function verifyPassword(env, email, password) {
  const r = await sb(env, '/auth/v1/token?grant_type=password', {
    method: 'POST',
    key: env.anon,
    body: { email, password }
  });
  return r.ok;
}

// ---------- Xử lý request ----------

function clientIp(req) {
  const fwd = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || 'unknown';
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

const fail = (res, status, error, extra = {}) => res.status(status).json({ ok: false, error, ...extra });
const TOO_MANY = 'Bạn thao tác quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.';

async function actionCheckUsername(env, body, res) {
  const check = validateUsername(body.username);
  if (!check.ok) return res.status(200).json({ ok: true, available: false, reason: check.error });
  if (!env.service) return res.status(200).json({ ok: true, available: null });
  const user = await findUserByEmail(env, usernameToEmail(check.username), { deep: false });
  return res.status(200).json({ ok: true, available: !user, reason: user ? 'Tên đăng nhập đã có người sử dụng.' : '' });
}

async function actionRegister(env, body, res, ip) {
  if (body.website) return fail(res, 400, 'Yêu cầu không hợp lệ.'); // honeypot chống bot
  if (!rateLimit(`reg:${ip}`, 5, 10 * 60 * 1000)) return fail(res, 429, TOO_MANY);

  const check = validateUsername(body.username);
  if (!check.ok) return fail(res, 400, check.error);
  const pass = validateNewPassword(body.password, check.username);
  if (!pass.ok) return fail(res, 400, pass.error);

  // Thiếu service role key → để client tự đăng ký theo cách cũ
  if (!env.service) return fail(res, 501, 'Máy chủ chưa có SUPABASE_SERVICE_ROLE_KEY.', { fallback: true });

  const recoveryCode = generateRecoveryCode();
  const avatar = ALLOWED_AVATARS.includes(body.avatar) ? body.avatar : '🐼';
  const r = await sb(env, '/auth/v1/admin/users', {
    method: 'POST',
    key: env.service,
    body: {
      email: usernameToEmail(check.username),
      password: String(body.password),
      email_confirm: true,
      user_metadata: {
        username: check.username,
        display_name: cleanDisplayName(body.displayName, check.username),
        avatar_url: avatar
      },
      app_metadata: { panda_recovery: hashRecoveryCode(recoveryCode) }
    }
  });

  if (!r.ok) {
    const msg = String(r.data?.msg || r.data?.message || r.data?.error_description || '').toLowerCase();
    if (r.status === 422 || msg.includes('already') || r.data?.error_code === 'email_exists') {
      return fail(res, 409, 'Tên đăng nhập này đã tồn tại. Vui lòng chọn tên đăng nhập khác.');
    }
    if (r.status === 401 || r.status === 403) {
      return fail(res, 501, 'SUPABASE_SERVICE_ROLE_KEY trên máy chủ không hợp lệ.', { fallback: true });
    }
    return fail(res, 502, 'Không thể tạo tài khoản lúc này. Vui lòng thử lại sau.');
  }
  return res.status(200).json({ ok: true, username: check.username, recoveryCode });
}

async function actionResetPassword(env, body, res, ip) {
  const check = validateUsername(body.username);
  const username = check.ok ? check.username : normalizeUsername(body.username);
  if (!rateLimit(`rst-ip:${ip}`, 10, 15 * 60 * 1000) || !rateLimit(`rst-u:${username}`, 5, 15 * 60 * 1000)) {
    return fail(res, 429, TOO_MANY);
  }
  if (!env.service) return fail(res, 501, 'Tính năng khôi phục mật khẩu chưa được bật trên máy chủ.');

  const pass = validateNewPassword(body.newPassword, username);
  if (!pass.ok) return fail(res, 400, pass.error);

  const GENERIC = 'Tên đăng nhập hoặc mã khôi phục không đúng.';
  if (!check.ok) return fail(res, 400, GENERIC);
  const user = await findUserByEmail(env, usernameToEmail(username));
  if (!user || !verifyRecoveryCode(body.recoveryCode, user.app_metadata?.panda_recovery)) {
    return fail(res, 400, GENERIC);
  }

  const newCode = generateRecoveryCode(); // mã cũ hết hiệu lực ngay (dùng một lần)
  const r = await sb(env, `/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: 'PUT',
    key: env.service,
    body: { password: String(body.newPassword), app_metadata: { panda_recovery: hashRecoveryCode(newCode) } }
  });
  if (!r.ok) return fail(res, 502, 'Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau.');
  return res.status(200).json({ ok: true, username, recoveryCode: newCode });
}

// Tài khoản cũ tạo khi Supabase còn bật "Confirm email" sẽ bị kẹt ở lỗi "Email not confirmed".
// Supabase chỉ trả lỗi này SAU KHI mật khẩu đã đúng → máy chủ tự kích hoạt tài khoản giúp người dùng.
async function actionActivate(env, body, res, ip) {
  if (!rateLimit(`act:${ip}`, 10, 15 * 60 * 1000)) return fail(res, 429, TOO_MANY);
  if (!env.service) return fail(res, 501, 'Máy chủ chưa có SUPABASE_SERVICE_ROLE_KEY.');
  const check = validateUsername(body.username);
  if (!check.ok || !body.password) return fail(res, 400, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
  const email = usernameToEmail(check.username);

  const t = await sb(env, '/auth/v1/token?grant_type=password', {
    method: 'POST', key: env.anon, body: { email, password: String(body.password) }
  });
  if (t.ok) return res.status(200).json({ ok: true, activated: false });
  const msg = String(t.data?.msg || t.data?.message || t.data?.error_description || t.data?.error_code || '').toLowerCase();
  if (!msg.includes('not confirmed') && !msg.includes('not_confirmed')) {
    return fail(res, 400, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
  }
  const user = await findUserByEmail(env, email);
  if (!user) return fail(res, 400, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
  const r = await sb(env, `/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: 'PUT', key: env.service, body: { email_confirm: true }
  });
  if (!r.ok) return fail(res, 502, 'Không thể kích hoạt tài khoản lúc này.');
  return res.status(200).json({ ok: true, activated: true });
}

async function actionNewRecoveryCode(env, body, res, ip, token) {
  if (!token) return fail(res, 401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  if (!rateLimit(`rec:${ip}`, 10, 15 * 60 * 1000)) return fail(res, 429, TOO_MANY);
  if (!env.service) return fail(res, 501, 'Tính năng mã khôi phục chưa được bật trên máy chủ.');

  const me = await sb(env, '/auth/v1/user', { key: env.anon, token });
  if (!me.ok || !me.data?.id) return fail(res, 401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  if (!body.password || !(await verifyPassword(env, me.data.email, body.password))) {
    return fail(res, 403, 'Mật khẩu hiện tại không chính xác.');
  }

  const code = generateRecoveryCode();
  const r = await sb(env, `/auth/v1/admin/users/${encodeURIComponent(me.data.id)}`, {
    method: 'PUT',
    key: env.service,
    body: { app_metadata: { panda_recovery: hashRecoveryCode(code) } }
  });
  if (!r.ok) return fail(res, 502, 'Không thể tạo mã khôi phục lúc này.');
  return res.status(200).json({ ok: true, recoveryCode: code });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const env = getEnv();
  if (!env.url || !env.anon) {
    return fail(res, 501, 'Máy chủ chưa cấu hình SUPABASE_URL / SUPABASE_ANON_KEY.', { fallback: true });
  }

  const body = parseBody(req);
  const ip = clientIp(req);
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();

  try {
    switch (body.action) {
      case 'check-username': return await actionCheckUsername(env, body, res);
      case 'register': return await actionRegister(env, body, res, ip);
      case 'reset-password': return await actionResetPassword(env, body, res, ip);
      case 'activate': return await actionActivate(env, body, res, ip);
      case 'new-recovery-code': return await actionNewRecoveryCode(env, body, res, ip, token);
      default: return fail(res, 400, 'Action không hợp lệ.');
    }
  } catch {
    return fail(res, 500, 'Lỗi hệ thống xác thực. Vui lòng thử lại sau.');
  }
}
