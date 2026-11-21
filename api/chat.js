const rateMap = new Map();

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (req.method === 'OPTIONS' || req.method === 'GET') {
    res.setHeader('X-AI-Enabled', apiKey ? 'true' : 'false');
    return res.status(200).json({ enabled: Boolean(apiKey) });
  }
  if (!apiKey) return res.status(503).json({ error: 'Sư phụ AI chưa được cấu hình GEMINI_API_KEY.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ip = req.headers['x-forwarded-for'] || 'local';
  const now = Date.now();
  const recent = (rateMap.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) return res.status(429).json({ error: 'Bạn hỏi hơi nhanh, nghỉ 1 phút nhé!' });
  recent.push(now);
  rateMap.set(ip, recent);

  const { message = '' } = req.body || {};
  const cleanMsg = String(message).trim().slice(0, 600);
  if (!cleanMsg) return res.status(400).json({ error: 'Nội dung trống.' });

  const systemPrompt = `Bạn là Sư Phụ AI thông thái chuyên sâu về toàn bộ ngôn ngữ và văn hóa Trung Quốc (từ sơ cấp HSK 1 đến cao cấp HSK 7-9, tiếng Trung giao tiếp đời sống, tiếng Trung công xưởng/thương mại, ngữ pháp, từ đồng nghĩa, thành ngữ cổ, chiết tự chữ Hán, luyện dịch Việt-Trung và sửa lỗi diễn đạt).
Nguyên tắc trả lời:
1. Giải đáp trực tiếp, sâu sắc và toàn diện mọi câu hỏi liên quan đến tiếng Trung mà người dùng đặt ra — KHÔNG tự giới hạn câu trả lời ở trình độ HSK 1.
2. Khi đưa ra chữ Hán, luôn kèm theo Pinyin chuẩn thanh điệu và nghĩa tiếng Việt rõ ràng để người học dễ tiếp thu.
3. Nếu người dùng viết câu tiếng Trung để nhờ kiểm tra, hãy chỉ ra lỗi sai (nếu có), giải thích nguyên nhân và gợi ý cách diễn đạt tự nhiên như người bản xứ.
4. Trình bày gọn gàng, dễ đọc trên giao diện di động và web.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: cleanMsg }] }],
        generationConfig: { maxOutputTokens: 800 }
      })
    });
    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sư phụ đang suy nghĩ, con thử hỏi lại nhé...';
    return res.status(200).json({ reply });
  } catch {
    return res.status(500).json({ error: 'Lỗi kết nối Gemini API.' });
  }
}