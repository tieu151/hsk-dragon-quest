let supabaseClient = null;
let initPromise = null;
const USERNAME_DOMAIN = 'pandahsk.app';

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function validateUsername(raw) {
  const u = normalizeUsername(raw);
  if (!u) return { ok: false, error: 'Vui lòng nhập tên đăng nhập.' };
  if (!/^[a-z0-9_]{3,24}$/.test(u)) {
    return { ok: false, error: 'Tên đăng nhập dài 3–24 ký tự, chỉ gồm chữ không dấu (a-z), số (0-9) và gạch dưới (_).' };
  }
  return { ok: true, username: u };
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

function mapAuthError(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
  if (msg.includes('user already registered') || msg.includes('already been registered')) return 'Tên đăng nhập này đã tồn tại. Vui lòng chọn tên khác.';
  if (msg.includes('email not confirmed')) return 'Hãy tắt mục "Confirm email" trong Supabase → Authentication → Providers → Email.';
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Thao tác quá nhanh. Vui lòng đợi 1 phút rồi thử lại.';
  return err?.message || 'Lỗi xác thực tài khoản.';
}

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const res = await fetch('./api/config', { cache: 'no-store' });
      if (!res.ok) return null;
      const cfg = await res.json();
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      supabaseClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, storageKey: 'panda_hsk_supabase_auth' }
      });
      return supabaseClient;
    } catch {
      return null;
    }
  })();
  return initPromise;
}

export async function authRegister({ username, password, displayName, avatar }) {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: 'Chưa kết nối được Supabase. Hãy kiểm tra 3 biến môi trường trên Vercel.' };
  const checkU = validateUsername(username);
  if (!checkU.ok) return checkU;
  if (!password || password.length < 6) return { ok: false, error: 'Mật khẩu cần tối thiểu 6 ký tự.' };

  const cleanName = String(displayName || '').trim() || checkU.username;
  const { data, error } = await sb.auth.signUp({
    email: usernameToInternalEmail(checkU.username),
    password,
    options: { data: { username: checkU.username, display_name: cleanName.slice(0, 60), avatar_url: avatar || '🐼' } }
  });
  if (error) return { ok: false, error: mapAuthError(error) };
  if (!data.session) return { ok: false, error: 'Tài khoản đã tạo nhưng Supabase đang bật "Confirm email". Hãy tắt mục đó rồi đăng nhập lại.' };
  return { ok: true, user: data.user, session: data.session };
}

export async function authLogin({ username, password }) {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: 'Chưa kết nối được Supabase. Hãy kiểm tra 3 biến môi trường trên Vercel.' };
  const u = normalizeUsername(username);
  if (!u || !password) return { ok: false, error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' };
  const { data, error } = await sb.auth.signInWithPassword({ email: usernameToInternalEmail(u), password });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true, user: data.user, session: data.session };
}

export async function authChangePassword(newPassword) {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: 'Không kết nối được Supabase.' };
  if (!newPassword || newPassword.length < 6) return { ok: false, error: 'Mật khẩu mới cần tối thiểu 6 ký tự.' };
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true };
}

export async function authLogout() {
  const sb = await getSupabase();
  if (sb) await sb.auth.signOut();
}

export async function fetchLeaderboard() {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('leaderboard_scores').select('*').limit(10);
  return (!error && Array.isArray(data)) ? data : [];
}

export async function exportUserCloudData() {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: 'Chưa kết nối Supabase.' };
  const { data, error } = await sb.rpc('rpc_export_my_data');
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteAccountOnServer(password) {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: 'Chưa kết nối Supabase.' };
  const { data: sessData } = await sb.auth.getSession();
  const token = sessData?.session?.access_token;
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