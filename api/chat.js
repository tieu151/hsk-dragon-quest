const dailyUsage = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Panda-User');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (req.method === 'GET') {
    return res.status(200).json({ enabled: Boolean(apiKey), authRequired: true });
  }

  const userHeader = String(req.headers['x-panda-user'] || '').trim();
  if (!userHeader || userHeader === 'guest') {
    return res.status(401).json({ error: 'Vui lòng đăng nhập tài khoản Panda HSK để sử dụng tính năng này.' });
  }

  const body = req.body || {};

  // Kiểm tra chống gian lận điểm Đấu Trường ở phía server
  if (body.mode === 'arena_verify') {
    const score = Number(body.score || 0);
    const total = Number(body.total || 0);
    const elapsedSec = Number(body.elapsedSec || 0);
    const valid = score >= 0 && score <= total && total <= 30 && elapsedSec >= score * 0.8;
    if (!valid) {
      return res.status(400).json({ verified: false, error: 'Điểm số hoặc thời gian hoàn thành không hợp lệ.' });
    }
    const bonusXp = score * 20 + (score === total ? 50 : 0);
    return res.status(200).json({ verified: true, bonusXp });
  }

  // Giới hạn 30 lượt gọi AI/ngày/tài khoản
  const today = new Date().toISOString().slice(0, 10);
  const quotaKey = `${userHeader}:${today}`;
  const used = dailyUsage.get(quotaKey) || 0;
  if (used >= 30) {
    return res.status(429).json({ error: 'Bạn đã dùng hết 30 lượt AI hôm nay. Quay lại vào ngày mai nhé!' });
  }
  dailyUsage.set(quotaKey, used + 1);

  if (!apiKey) {
    return res.status(200).json({
      reply: '⚠️ Máy chủ chưa cấu hình biến môi trường GEMINI_API_KEY trên Vercel. Hãy thêm GEMINI_API_KEY trong Settings -> Environment Variables.'
    });
  }

  try {
    let prompt = String(body.message || '').trim();
    if (body.mode === 'pronunciation') {
      prompt = `Bạn là giám khảo chấm phát âm tiếng Trung HSK.
Câu mẫu: "${body.targetText || ''}"
Nhận diện giọng nói nghe được: "${body.spokenText || ''}"
Trả về đúng JSON thuần (không dùng markdown \`\`\`) theo mẫu:
{"totalScore":85,"toneScore":80,"syllables":[{"char":"你","pinyin":"nǐ","score":85,"note":"Rõ thanh 3"}],"adviceVi":"Nhận xét chi tiết và gợi ý sửa thanh điệu bằng tiếng Việt"}`;
    } else {
      prompt = `Bạn là Sư Phụ Panda AI dạy tiếng Trung chuẩn HSK 3.0. Trả lời bằng tiếng Việt ngắn gọn, rõ ràng, có Pinyin và ví dụ.\nCâu hỏi của học viên (@${userHeader}): ${prompt}`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 900 }
      })
    });
    const data = await apiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sư Phụ AI đang bận, vui lòng thử lại.';
    return res.status(200).json({ reply: text, remainingToday: 30 - (used + 1) });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi kết nối AI: ' + err.message });
  }
}