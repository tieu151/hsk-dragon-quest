let supabaseClient = null;
let initPromise = null;
let lastConfigError = '';
let missingEnvNames = [];
const USERNAME_DOMAIN = 'pandahsk.app';
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;

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
  return { ok: true, username: u };
}

// Quy tắc mật khẩu mới (đồng bộ với api/auth.js)
export function validateNewPassword(password, username = '') {
  const p = String(password || '');
  if (p.length < MIN_PASSWORD) return { ok: false, error: `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.` };
  if (p.length > MAX_PASSWORD) return { ok: false, error: `Mật khẩu tối đa ${MAX_PASSWORD} ký tự.` };
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return { ok: false, error: 'Mật khẩu cần có cả chữ cái và chữ số.' };
  const u = normalizeUsername(username);
  if (u.length >= 4 && p.toLowerCase().includes(u)) return { ok: false, error: 'Mật khẩu không được chứa tên đăng nhập.' };
  return { ok: true };
}

// Chấm điểm độ mạnh mật khẩu 0–4 để hiển thị thanh đo
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
    missingEnv: [...missingEnvNames],
    error: lastConfigError
  };
}

function buildMissingEnvMessage(missing) {
  if (!missing.length) return '';
  return `Thiếu biến môi trường trên Vercel: ${missing.join(', ')}. Bạn vẫn có thể đóng cửa sổ này để học ở Chế độ Khách.`;
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
    return 'Project Supabase đang bị tạm dừng (Paused) hoặc chưa sẵn sàng. Hãy kiểm tra trên Supabase Dashboard.';
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
  if (forceRetry && !supabaseClient) {
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
        lastConfigError = `Không tải được cấu hình Supabase từ máy chủ (HTTP ${res.status}). Kiểm tra biến môi trường SUPABASE_URL và SUPABASE_ANON_KEY trên Vercel.`;
        console.warn('[Panda HSK] Lỗi tải /api/config:', res.status);
        return null;
      }

      const cfg = await res.json().catch(() => ({}));
      const url = String(cfg?.supabaseUrl || '').trim();
      const anonKey = String(cfg?.supabaseAnonKey || '').trim();

      if (!url) missingEnvNames.push('SUPABASE_URL');
      if (!anonKey) missingEnvNames.push('SUPABASE_ANON_KEY');

      if (missingEnvNames.length > 0) {
        lastConfigError = buildMissingEnvMessage(missingEnvNames);
        console.warn('[Panda HSK] Thiếu biến môi trường:', missingEnvNames.join(', '));
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
      lastConfigError = 'Không kết nối được tới dịch vụ cấu hình Supabase. Kiểm tra mạng hoặc biến SUPABASE_URL, SUPABASE_ANON_KEY.';
      console.warn('[Panda HSK] Không thể khởi tạo Supabase client.');
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

function configErrorResult() {
  return {
    ok: false,
    error: lastConfigError || 'Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_ANON_KEY trên Vercel.'
  };
}

// Gọi API xác thực phía máy chủ (api/auth.js)
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

const serverAuthUnavailable = (api) => api.fallback || api.status === 404 || api.status === 405;

async function getAccessToken(sb) {
  const { data } = await sb.auth.getSession();
  return data?.session?.access_token || '';
}

export async function checkUsernameAvailability(username) {
  const check = validateUsername(username);
  if (!check.ok) return { available: false, reason: check.error };
  const api = await callAuthApi('check-username', { username: check.username });
  if (!api.ok) return { available: null, reason: '' };
  return { available: api.available, reason: api.reason || '' };
}

export async function authRegister({ username, password, displayName, avatar, website = '' }) {
  const checkU = validateUsername(username);
  if (!checkU.ok) return checkU;
  const checkP = validateNewPassword(password, checkU.username);
  if (!checkP.ok) return checkP;

  const sb = await getSupabase(true);
  if (!sb) return configErrorResult();

  const cleanName = (String(displayName || '').trim() || checkU.username).slice(0, 60);
  const api = await callAuthApi('register', {
    username: checkU.username,
    password,
    displayName: cleanName,
    avatar: avatar || '🐼',
    website
  });

  if (api.ok) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: usernameToInternalEmail(checkU.username),
      password
    });
    if (error) {
      return {
        ok: false,
        error: 'Tài khoản đã được tạo nhưng chưa đăng nhập tự động được. Vui lòng chuyển sang tab Đăng nhập.'
      };
    }
    return { ok: true, user: data.user, session: data.session, recoveryCode: api.recoveryCode || null };
  }

  if (!serverAuthUnavailable(api)) return { ok: false, error: api.error || 'Không thể tạo tài khoản.' };

  // Dự phòng: máy chủ chưa có service role key → đăng ký trực tiếp từ trình duyệt
  const { data, error } = await sb.auth.signUp({
    email: usernameToInternalEmail(checkU.username),
    password,
    options: {
      data: {
        username: checkU.username,
        display_name: cleanName,
        avatar_url: avatar || '🐼'
      }
    }
  });
  if (error) return { ok: false, error: mapAuthError(error, error.status || 400) };
  if (!data.session) {
    return {
      ok: false,
      error: 'Tài khoản đã tạo nhưng cần kích hoạt. Hãy thêm SUPABASE_SERVICE_ROLE_KEY trên Vercel để hệ thống tự kích hoạt.'
    };
  }
  return { ok: true, user: data.user, session: data.session, recoveryCode: null };
}

export async function authLogin({ username, password }) {
  const u = normalizeUsername(username);
  if (!u) return { ok: false, error: 'Vui lòng nhập tên đăng nhập.' };
  if (!password) return { ok: false, error: 'Vui lòng nhập mật khẩu.' };

  const sb = await getSupabase(true);
  if (!sb) return configErrorResult();

  const email = usernameToInternalEmail(u);
  let { data, error } = await sb.auth.signInWithPassword({ email, password });

  // Tài khoản cũ bị kẹt "Email not confirmed" → nhờ máy chủ tự kích hoạt rồi đăng nhập lại
  const notConfirmed = error && (
    String(error.message || '').toLowerCase().includes('not confirmed') || error.code === 'email_not_confirmed'
  );
  if (notConfirmed) {
    const api = await callAuthApi('activate', { username: u, password });
    if (api.ok) ({ data, error } = await sb.auth.signInWithPassword({ email, password }));
  }

  if (error) return { ok: false, error: mapAuthError(error, error.status || 401) };
  return { ok: true, user: data.user, session: data.session };
}

export async function authResetPassword({ username, recoveryCode, newPassword }) {
  const checkU = validateUsername(username);
  if (!checkU.ok) return checkU;
  if (!String(recoveryCode || '').trim()) return { ok: false, error: 'Vui lòng nhập mã khôi phục.' };
  const checkP = validateNewPassword(newPassword, checkU.username);
  if (!checkP.ok) return checkP;

  const sb = await getSupabase(true);
  if (!sb) return configErrorResult();

  const api = await callAuthApi('reset-password', {
    username: checkU.username,
    recoveryCode,
    newPassword
  });
  if (!api.ok) {
    return {
      ok: false,
      error: serverAuthUnavailable(api)
        ? 'Tính năng khôi phục mật khẩu chưa được bật trên máy chủ.'
        : (api.error || 'Không thể đặt lại mật khẩu.')
    };
  }

  const { data, error } = await sb.auth.signInWithPassword({
    email: usernameToInternalEmail(checkU.username),
    password: newPassword
  });
  if (error) return { ok: true, user: null, session: null, recoveryCode: api.recoveryCode };
  return { ok: true, user: data.user, session: data.session, recoveryCode: api.recoveryCode };
}

export async function authHasRecoveryCode() {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getUser();
    if (error || !data?.user) return null;
    return Boolean(data.user.app_metadata?.panda_recovery);
  } catch {
    return null;
  }
}

export async function authCreateRecoveryCode(currentPassword) {
  if (!currentPassword) return { ok: false, error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận.' };
  const sb = await getSupabase();
  if (!sb) return configErrorResult();
  const token = await getAccessToken(sb);
  if (!token) return { ok: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  const api = await callAuthApi('new-recovery-code', { password: currentPassword }, token);
  if (!api.ok) {
    return {
      ok: false,
      error: serverAuthUnavailable(api)
        ? 'Tính năng mã khôi phục chưa được bật trên máy chủ.'
        : (api.error || 'Không thể tạo mã khôi phục.')
    };
  }
  return { ok: true, recoveryCode: api.recoveryCode };
}

export async function authChangePassword(currentPassword, newPassword) {
  const sb = await getSupabase();
  if (!sb) return configErrorResult();
  if (!currentPassword) return { ok: false, error: 'Vui lòng nhập mật khẩu hiện tại.' };

  const { data: sessData } = await sb.auth.getSession();
  const user = sessData?.session?.user;
  if (!user?.email) return { ok: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };

  const checkP = validateNewPassword(newPassword, extractUsernameFromUser(user));
  if (!checkP.ok) return checkP;
  if (currentPassword === newPassword) return { ok: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' };

  // Xác minh mật khẩu hiện tại trước khi cho đổi
  const { error: verifyErr } = await sb.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyErr) return { ok: false, error: 'Mật khẩu hiện tại không chính xác.' };

  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: mapAuthError(error, error.status || 400) };
  return { ok: true };
}

export async function authLogout() {
  const sb = await getSupabase();
  if (sb) await sb.auth.signOut();
}

export async function fetchLeaderboard() {
  const sb = await getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('leaderboard_scores').select('*').limit(10);
    return (!error && Array.isArray(data)) ? data : [];
  } catch {
    return [];
  }
}

export async function exportUserCloudData() {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: lastConfigError || 'Chưa kết nối Supabase.' };
  const { data, error } = await sb.rpc('rpc_export_my_data');
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteAccountOnServer(password) {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: lastConfigError || 'Chưa kết nối Supabase.' };
  const token = await getAccessToken(sb);
  if (!token) return { ok: false, error: 'Phiên đăng nhập đã hết hạn.' };
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
