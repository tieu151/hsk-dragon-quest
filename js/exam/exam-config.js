// Cấu hình đề thi chuẩn hóa theo từng cấp HSK 1–9 (HSK 2.0 & HSK 3.0)
// Mỗi đề bao gồm đầy đủ 3 kỹ năng: Nghe hiểu (听力) · Đọc hiểu (阅读) · Viết & Ngữ pháp (书写)
export const SECONDS_PER_QUESTION = 45;

export const EXAM_SETS = [
  { id: 1, code: 'SET-01', label: 'Đề chuẩn số 01', desc: 'Bộ đề tiêu chuẩn số 1 (Nghe · Đọc · Viết)' },
  { id: 2, code: 'SET-02', label: 'Đề chuẩn số 02', desc: 'Bộ đề tiêu chuẩn số 2 (100% câu hỏi mới, không trùng Đề 01)' },
  { id: 3, code: 'SET-03', label: 'Đề chuẩn số 03', desc: 'Bộ đề tiêu chuẩn số 3 (100% câu hỏi mới, không trùng Đề 01–02)' },
  { id: 4, code: 'SET-04', label: 'Đề chuẩn số 04', desc: 'Bộ đề tiêu chuẩn số 4 (100% câu hỏi mới, không trùng Đề 01–03)' },
  { id: 0, code: 'DYNAMIC', label: '🎲 Đề sinh mới (Chống lặp)', desc: 'Tự động loại trừ toàn bộ câu hỏi, đoạn văn & từ vựng bạn đã làm trước đó' }
];

export const SKILL_MODES = [
  { id: 'all', label: '🏆 Thi tổng hợp (Đầy đủ 3 kỹ năng)', desc: 'Nghe hiểu + Đọc hiểu + Viết & Ngữ pháp chuẩn cấu trúc HSK' },
  { id: 'listening', label: '🎧 Chỉ luyện Nghe hiểu (听力)', desc: 'Hội thoại thực tế, thông báo ngắn và nghe nhận diện ngữ cảnh' },
  { id: 'reading', label: '📖 Chỉ luyện Đọc hiểu (阅读)', desc: 'Điền từ vào chỗ trống, đọc hiểu đoạn văn & từ vựng ngữ cảnh' },
  { id: 'writing', label: '✍️ Chỉ luyện Viết & Ngữ pháp (书写)', desc: 'Sắp xếp từ thành câu, bắt lỗi ngữ pháp và biên dịch ứng dụng' }
];

export const EXAM_CONFIGS = {
  1: {
    level: 1,
    label: 'HSK 1',
    standard: 'Sơ cấp 1',
    desc: 'Đầy đủ 3 kỹ năng: Nghe hội thoại & câu ngắn · Đọc điền từ & đoạn văn · Sắp xếp câu cơ bản.',
    totalQ: 24,
    minutes: 20,
    durationSec: 20 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 4,
      listeningContext: 4,
      readingCloze: 4,
      readingPassageQ: 4,
      readingVocab: 2,
      writingOrder: 4,
      writingGrammar: 2
    },
    skillsMeta: ['🎧 Nghe hiểu (8 câu)', '📖 Đọc hiểu (10 câu)', '✍️ Viết & Ghép câu (6 câu)']
  },
  2: {
    level: 2,
    label: 'HSK 2',
    standard: 'Sơ cấp 2',
    desc: 'Đầy đủ 3 kỹ năng: Nghe hội thoại sinh hoạt · Đọc điền từ & đoạn văn · Sắp xếp câu & ngữ pháp.',
    totalQ: 28,
    minutes: 25,
    durationSec: 25 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 5,
      listeningContext: 5,
      readingCloze: 5,
      readingPassageQ: 4,
      readingVocab: 3,
      writingOrder: 4,
      writingGrammar: 2
    },
    skillsMeta: ['🎧 Nghe hiểu (10 câu)', '📖 Đọc hiểu (12 câu)', '✍️ Viết & Ghép câu (6 câu)']
  },
  3: {
    level: 3,
    label: 'HSK 3',
    standard: 'Trung cấp 1',
    desc: 'Chuẩn 3 phần HSK 3: Nghe hội thoại 2–3 lượt · Đọc điền từ & 2 đoạn văn · Sắp xếp câu (连词成句).',
    totalQ: 32,
    minutes: 30,
    durationSec: 30 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 6,
      listeningContext: 6,
      readingCloze: 6,
      readingPassageQ: 4,
      readingVocab: 2,
      writingOrder: 5,
      writingGrammar: 3
    },
    skillsMeta: ['🎧 Nghe hiểu (12 câu)', '📖 Đọc hiểu (12 câu)', '✍️ Viết & Sắp câu (8 câu)']
  },
  4: {
    level: 4,
    label: 'HSK 4',
    standard: 'Trung cấp 2',
    desc: 'Chuẩn 3 phần HSK 4: Nghe hội thoại & thông báo · Điền từ (选词填空) & 2 bài đọc · Sắp xếp câu & đặt câu.',
    totalQ: 36,
    minutes: 35,
    durationSec: 35 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 6,
      listeningContext: 6,
      readingCloze: 9,
      readingPassageQ: 4,
      readingVocab: 3,
      writingOrder: 5,
      writingGrammar: 3
    },
    skillsMeta: ['🎧 Nghe hiểu (12 câu)', '📖 Đọc hiểu (16 câu)', '✍️ Viết & Sắp câu (8 câu)']
  },
  5: {
    level: 5,
    label: 'HSK 5',
    standard: 'Cao cấp 1',
    desc: 'Chuẩn 3 phần HSK 5: Nghe phỏng vấn/hội thoại · Điền từ ngữ cảnh & đọc hiểu suy luận · Sắp câu & ngữ pháp.',
    totalQ: 40,
    minutes: 40,
    durationSec: 40 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 7,
      listeningContext: 7,
      readingCloze: 11,
      readingPassageQ: 4,
      readingVocab: 3,
      writingOrder: 4,
      writingGrammar: 4
    },
    skillsMeta: ['🎧 Nghe hiểu (14 câu)', '📖 Đọc hiểu (18 câu)', '✍️ Viết & Ngữ pháp (8 câu)']
  },
  6: {
    level: 6,
    label: 'HSK 6',
    standard: 'Cao cấp 2',
    desc: 'Chuẩn 3 phần HSK 6: Nghe bản tin/phỏng vấn · Điền từ nâng cao & đọc văn bản · Bắt lỗi câu bệnh (病句) & tu từ.',
    totalQ: 40,
    minutes: 45,
    durationSec: 45 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 7,
      listeningContext: 7,
      readingCloze: 11,
      readingPassageQ: 4,
      readingVocab: 3,
      writingOrder: 4,
      writingGrammar: 4
    },
    skillsMeta: ['🎧 Nghe hiểu (14 câu)', '📖 Đọc hiểu (18 câu)', '✍️ Viết & Câu bệnh (8 câu)']
  },
  7: {
    level: 7,
    label: 'HSK 7',
    standard: 'HSK 3.0 Cao cấp',
    desc: 'Chuẩn HSK 3.0: Nghe tọa đàm học thuật · Đọc luận chuyên sâu & thành ngữ · Biên dịch & diễn đạt học thuật.',
    totalQ: 40,
    minutes: 45,
    durationSec: 45 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 6,
      listeningContext: 6,
      readingCloze: 11,
      readingPassageQ: 4,
      readingVocab: 3,
      writingOrder: 5,
      writingGrammar: 5
    },
    skillsMeta: ['🎧 Nghe học thuật (12 câu)', '📖 Đọc chuyên sâu (18 câu)', '✍️ Viết & Biên dịch (10 câu)']
  },
  8: {
    level: 8,
    label: 'HSK 8',
    standard: 'HSK 3.0 Cao cấp',
    desc: 'Chuẩn HSK 3.0: Nghe phân tích chuyên ngành · Đọc hiểu học thuật phức hợp · Biên dịch & lập luận cao cấp.',
    totalQ: 40,
    minutes: 45,
    durationSec: 45 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 6,
      listeningContext: 6,
      readingCloze: 11,
      readingPassageQ: 4,
      readingVocab: 3,
      writingOrder: 5,
      writingGrammar: 5
    },
    skillsMeta: ['🎧 Nghe học thuật (12 câu)', '📖 Đọc chuyên sâu (18 câu)', '✍️ Viết & Biên dịch (10 câu)']
  },
  9: {
    level: 9,
    label: 'HSK 9',
    standard: 'HSK 3.0 Đỉnh cao',
    desc: 'Chuẩn HSK 3.0 đỉnh cao: Nghe bình luận chuyên gia · Đọc nghị luận triết học/khoa học · Dịch thuật & tu từ tinh hoa.',
    totalQ: 40,
    minutes: 45,
    durationSec: 45 * 60,
    maxAudioPlays: 2,
    passPercent: 60,
    officialMaxScore: 300,
    officialPassScore: 180,
    allowPartialCredit: false,
    passagesPerExam: 1,
    quotas: {
      listeningDialogue: 6,
      listeningContext: 6,
      readingCloze: 11,
      readingPassageQ: 4,
      readingVocab: 3,
      writingOrder: 5,
      writingGrammar: 5
    },
    skillsMeta: ['🎧 Nghe học thuật (12 câu)', '📖 Đọc chuyên sâu (18 câu)', '✍️ Viết & Biên dịch (10 câu)']
  }
};
