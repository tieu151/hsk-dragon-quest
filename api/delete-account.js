export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({ error: 'Máy chủ chưa cấu hình đủ biến môi trường Supabase.' });
  }
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const { password } = req.body || {};
    if (!token) return res.status(401).json({ error: 'Thiếu phiên đăng nhập hợp lệ.' });
    if (!password) return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận.' });

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' });
    const userData = await userRes.json();

    if (userData.email) {
      const checkPassRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email, password })
      });
      if (!checkPassRes.ok) return res.status(403).json({ error: 'Mật khẩu xác nhận không chính xác.' });
    }

    const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userData.id}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
    });
    if (!delRes.ok) return res.status(500).json({ error: 'Không thể xóa tài khoản lúc này.' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Lỗi hệ thống khi xóa tài khoản.' });
  }
}