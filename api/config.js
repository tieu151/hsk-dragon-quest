const DEFAULT_GOOGLE_CLIENT_ID =
  '289619157211-gnaq93mvn5mgdcah6s7ocjathg23dbcm.apps.googleusercontent.com';
const DEFAULT_FACEBOOK_APP_ID = '1145119668511825';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
  const facebookAppId = String(process.env.FACEBOOK_APP_ID || DEFAULT_FACEBOOK_APP_ID).trim();
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
    googleClientId,
    facebookAppId,
    missing
  });
}
