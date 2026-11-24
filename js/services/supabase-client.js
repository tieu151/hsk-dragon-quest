let supabaseClient = null;
let initPromise = null;
let lastConfigError = '';
let missingEnvNames = [];
const USERNAME_DOMAIN = 'pandahsk.app';

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
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
  if (msg.includes('invalid login credentials') || statusCode === 400 || statusCode === 401) {
    return 'Tên đăng nhập hoặc mật khẩu không chính xác (hoặc tài khoản chưa được đăng ký).';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Tên đăng nhập này đã tồn tại. Vui lòng chọn tên đăng nhập khác.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Tài khoản chưa xác nhận email. Hãy tắt "Confirm email" trong Supabase → Authentication → Sign In / Providers.';
  }
  if (msg.includes('paused') || msg.includes('project is not active') || statusCode === 503) {
    return 'Project Supabase đang bị tạm dừng (Paused) hoặc chưa sẵn sàng. Hãy kiểm tra trên Supabase Dashboard.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || statusCode === 429) {
    return 'Thao tác quá nhanh. Vui lòng đợi 1 phút rồi thử lại.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Không thể kết nối tới máy chủ Supabase. Kiểm tra lại kết nối mạng hoặc trạng thái project.';
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

export async function authRegister({ username, password, displayName, avatar }) {
  const checkU = validateUsername(username);
  if (!checkU.ok) return checkU;
  if (!password || password.length < 6) {
    return { ok: false, error: 'Mật khẩu cần tối thiểu 6 ký tự.' };
  }

  const sb = await getSupabase(true);
  if (!sb) {
    return {
      ok: false,
      error: lastConfigError || 'Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_ANON_KEY trên Vercel.'
    };
  }

  const cleanName = String(displayName || '').trim() || checkU.username;
  const { data, error } = await sb.auth.signUp({
    email: usernameToInternalEmail(checkU.username),
    password,
    options: {
      data: {
        username: checkU.username,
        display_name: cleanName.slice(0, 60),
        avatar_url: avatar || '🐼'
      }
    }
  });
  if (error) return { ok: false, error: mapAuthError(error, error.status || 400) };
  if (!data.session) {
    return {
      ok: false,
      error: 'Tài khoản đã tạo nhưng Supabase đang bật "Confirm email". Hãy tắt mục này trong Supabase Auth rồi đăng nhập lại.'
    };
  }
  return { ok: true, user: data.user, session: data.session };
}

export async function authLogin({ username, password }) {
  const u = normalizeUsername(username);
  if (!u) return { ok: false, error: 'Vui lòng nhập tên đăng nhập.' };
  if (!password) return { ok: false, error: 'Vui lòng nhập mật khẩu.' };

  const sb = await getSupabase(true);
  if (!sb) {
    return {
      ok: false,
      error: lastConfigError || 'Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_ANON_KEY trên Vercel.'
    };
  }

  const { data, error } = await sb.auth.signInWithPassword({
    email: usernameToInternalEmail(u),
    password
  });
  if (error) return { ok: false, error: mapAuthError(error, error.status || 401) };
  return { ok: true, user: data.user, session: data.session };
}

export async function authChangePassword(newPassword) {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: lastConfigError || 'Không kết nối được Supabase.' };
  if (!newPassword || newPassword.length < 6) return { ok: false, error: 'Mật khẩu mới cần tối thiểu 6 ký tự.' };
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