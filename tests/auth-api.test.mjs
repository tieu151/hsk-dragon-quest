// Kiểm thử api/auth.js với một Supabase Auth giả lập trong bộ nhớ (không cần mạng)
import assert from 'node:assert/strict';
import handler, {
  generateRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
  validateNewPassword,
  _resetRateLimits
} from '../api/auth.js';

const URL_BASE = 'https://demo.supabase.co';
process.env.SUPABASE_URL = URL_BASE;
process.env.SUPABASE_ANON_KEY = 'anon_key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_key';

// ---------- Fake GoTrue + PostgREST ----------
const users = new Map();
const tokens = new Map();
let seq = 0;
const findByEmail = (email) => [...users.values()].find((u) => u.email === email.toLowerCase());
const publicUser = (u) => ({
  id: u.id, email: u.email, user_metadata: u.user_metadata, app_metadata: u.app_metadata,
  email_confirmed_at: u.confirmed ? '2026-01-01T00:00:00Z' : null
});
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const headers = opts.headers || {};
  const body = opts.body ? JSON.parse(opts.body) : {};
  const isService = headers.apikey === 'service_key' && headers.Authorization === 'Bearer service_key';
  assert.equal(u.origin, URL_BASE);

  if (u.pathname === '/auth/v1/token' && method === 'POST') {
    const usr = findByEmail(body.email || '');
    if (!usr || usr.password !== body.password) return reply(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    if (!usr.confirmed) return reply(400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
    const t = `tok_${++seq}`;
    tokens.set(t, usr.id);
    return reply(200, { access_token: t, user: publicUser(usr) });
  }
  if (u.pathname === '/auth/v1/user') {
    const id = tokens.get(String(headers.Authorization).replace('Bearer ', ''));
    return id ? reply(200, publicUser(users.get(id))) : reply(401, { msg: 'invalid JWT' });
  }
  if (u.pathname === '/rest/v1/profiles') {
    if (!isService) return reply(401, {});
    const email = decodeURIComponent(u.searchParams.get('email') || '').replace(/^eq\./, '');
    const usr = findByEmail(email);
    return reply(200, usr ? [{ id: usr.id }] : []);
  }
  if (u.pathname.startsWith('/auth/v1/admin/users')) {
    if (!isService) return reply(401, { msg: 'not admin' });
    const id = decodeURIComponent(u.pathname.split('/')[5] || '');
    if (!id && method === 'POST') {
      if (findByEmail(body.email)) return reply(422, { error_code: 'email_exists', msg: 'A user with this email address has already been registered' });
      const usr = {
        id: `uid_${++seq}`, email: body.email.toLowerCase(), password: body.password,
        confirmed: Boolean(body.email_confirm), user_metadata: body.user_metadata || {}, app_metadata: { provider: 'email', ...(body.app_metadata || {}) }
      };
      users.set(usr.id, usr);
      return reply(200, publicUser(usr));
    }
    if (!id && method === 'GET') return reply(200, { users: [...users.values()].map(publicUser) });
    const usr = users.get(id);
    if (!usr) return reply(404, { msg: 'User not found' });
    if (method === 'GET') return reply(200, publicUser(usr));
    if (method === 'PUT') {
      if (body.password) usr.password = body.password;
      if (body.email_confirm) usr.confirmed = true;
      if (body.app_metadata) usr.app_metadata = { ...usr.app_metadata, ...body.app_metadata };
      return reply(200, publicUser(usr));
    }
  }
  throw new Error(`Unexpected fetch ${method} ${url}`);
};

// ---------- Gọi handler như Vercel ----------
async function call(body, { method = 'POST', ip = '1.1.1.1', token = '' } = {}) {
  let status = 200;
  let payload;
  const req = { method, body, headers: { 'x-forwarded-for': ip, ...(token ? { authorization: `Bearer ${token}` } : {}) } };
  const res = {
    setHeader: () => {},
    status: (c) => { status = c; return res; },
    json: (o) => { payload = o; return res; }
  };
  await handler(req, res);
  return { status, ...payload };
}

// ---------- Tiện ích thuần ----------
const code = generateRecoveryCode();
assert.match(code, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
const rec = hashRecoveryCode(code);
assert.equal(verifyRecoveryCode(code, rec), true);
assert.equal(verifyRecoveryCode(code.toLowerCase().replace(/-/g, ' '), rec), true, 'chấp nhận chữ thường / khoảng trắng');
assert.equal(verifyRecoveryCode(generateRecoveryCode(), rec), false);
assert.equal(verifyRecoveryCode('', rec), false);
assert.equal(verifyRecoveryCode(code, null), false);
assert.equal(validateNewPassword('abc123').ok, false);
assert.equal(validateNewPassword('abcdefgh').ok, false);
assert.equal(validateNewPassword('tieu1710xx', 'tieu1710').ok, false);
assert.equal(validateNewPassword('Panda2026').ok, true);

// ---------- Method / action ----------
assert.equal((await call({}, { method: 'GET' })).status, 405);
assert.equal((await call({ action: 'nope' })).status, 400);

// ---------- Đăng ký ----------
const reg = await call({ action: 'register', username: 'Tieu1710', password: 'Panda2026', displayName: '<b>Lê Tiêu</b>', avatar: '🐉' });
assert.equal(reg.status, 200, JSON.stringify(reg));
assert.equal(reg.ok, true);
assert.equal(reg.username, 'tieu1710');
assert.match(reg.recoveryCode, /^[A-Z2-9]{4}-/);
const created = findByEmail('tieu1710@pandahsk.app');
assert.ok(created, 'đã tạo user');
assert.equal(created.confirmed, true, 'tự xác nhận email — không cần tắt Confirm email');
assert.equal(created.user_metadata.display_name, 'bLê Tiêu/b', 'đã lọc ký tự HTML');
assert.equal(created.user_metadata.avatar_url, '🐉');
assert.ok(created.app_metadata.panda_recovery.hash, 'lưu mã khôi phục dạng băm');
assert.ok(!JSON.stringify(created.app_metadata).includes(reg.recoveryCode), 'không lưu mã thô');

assert.equal((await call({ action: 'register', username: 'tieu1710', password: 'Panda2026' })).status, 409, 'trùng tên');
assert.equal((await call({ action: 'register', username: 'ab', password: 'Panda2026' })).status, 400);
assert.equal((await call({ action: 'register', username: 'admin', password: 'Panda2026' })).status, 400, 'tên giữ lại');
assert.equal((await call({ action: 'register', username: 'newuser', password: 'short1' })).status, 400, 'mật khẩu yếu');
assert.equal((await call({ action: 'register', username: 'botuser', password: 'Panda2026', website: 'http://spam' })).status, 400, 'honeypot');
assert.equal(findByEmail('botuser@pandahsk.app'), undefined);

// ---------- Kiểm tra tên đăng nhập ----------
assert.equal((await call({ action: 'check-username', username: 'tieu1710' })).available, false);
assert.equal((await call({ action: 'check-username', username: '@TIEU1710' })).available, false, 'chuẩn hoá @ và chữ hoa');
assert.equal((await call({ action: 'check-username', username: 'free_name' })).available, true);
assert.equal((await call({ action: 'check-username', username: 'Bad Name!' })).available, false);

// ---------- Quên mật khẩu ----------
_resetRateLimits();
const wrongReset = await call({ action: 'reset-password', username: 'tieu1710', recoveryCode: generateRecoveryCode(), newPassword: 'NewPass2026' });
assert.equal(wrongReset.status, 400);
assert.equal(created.password, 'Panda2026', 'mã sai không đổi được mật khẩu');
const unknownReset = await call({ action: 'reset-password', username: 'ghost_user', recoveryCode: reg.recoveryCode, newPassword: 'NewPass2026' });
assert.equal(unknownReset.error, wrongReset.error, 'không lộ tên đăng nhập có tồn tại hay không');

const okReset = await call({ action: 'reset-password', username: 'tieu1710', recoveryCode: reg.recoveryCode.toLowerCase(), newPassword: 'NewPass2026' });
assert.equal(okReset.status, 200, JSON.stringify(okReset));
assert.equal(created.password, 'NewPass2026');
assert.notEqual(okReset.recoveryCode, reg.recoveryCode, 'sinh mã mới');
const reuse = await call({ action: 'reset-password', username: 'tieu1710', recoveryCode: reg.recoveryCode, newPassword: 'Again2026x' });
assert.equal(reuse.status, 400, 'mã cũ chỉ dùng một lần');

// ---------- Tạo mã khôi phục mới khi đang đăng nhập ----------
_resetRateLimits();
const login = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: 'anon_key' }, body: JSON.stringify({ email: 'tieu1710@pandahsk.app', password: 'NewPass2026' })
})).json();
assert.equal((await call({ action: 'new-recovery-code', password: 'NewPass2026' })).status, 401, 'cần token');
assert.equal((await call({ action: 'new-recovery-code', password: 'wrong' }, { token: login.access_token })).status, 403);
const rot = await call({ action: 'new-recovery-code', password: 'NewPass2026' }, { token: login.access_token });
assert.equal(rot.status, 200);
assert.equal(verifyRecoveryCode(rot.recoveryCode, created.app_metadata.panda_recovery), true);
assert.equal(verifyRecoveryCode(okReset.recoveryCode, created.app_metadata.panda_recovery), false, 'mã trước đó mất hiệu lực');

// ---------- Tự kích hoạt tài khoản cũ "Email not confirmed" ----------
_resetRateLimits();
users.set('uid_legacy', {
  id: 'uid_legacy', email: 'olduser@pandahsk.app', password: 'oldpass1', confirmed: false, user_metadata: {}, app_metadata: {}
});
assert.equal((await call({ action: 'activate', username: 'olduser', password: 'bad' })).status, 400, 'sai mật khẩu không kích hoạt');
assert.equal(users.get('uid_legacy').confirmed, false);
const act = await call({ action: 'activate', username: 'olduser', password: 'oldpass1' });
assert.equal(act.status, 200);
assert.equal(act.activated, true);
assert.equal(users.get('uid_legacy').confirmed, true);

// ---------- Giới hạn tần suất ----------
_resetRateLimits();
let last;
for (let i = 0; i < 6; i++) last = await call({ action: 'register', username: `spam${i}x`, password: 'Panda2026' }, { ip: '9.9.9.9' });
assert.equal(last.status, 429);

// ---------- Thiếu service role key → client tự dùng đường dự phòng ----------
_resetRateLimits();
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const fb = await call({ action: 'register', username: 'fallback1', password: 'Panda2026' });
assert.equal(fb.status, 501);
assert.equal(fb.fallback, true);
assert.equal((await call({ action: 'check-username', username: 'tieu1710' })).available, null);

console.log('ALL AUTH API CHECKS PASSED!');
