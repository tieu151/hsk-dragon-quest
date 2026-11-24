// Cấu hình đề thi theo từng cấp HSK 1–9 (thời gian mặc định = số câu × 45 giây)
export const SECONDS_PER_QUESTION = 45;

export const EXAM_CONFIGS = {
  1: {
    level: 1,
    label: 'HSK 1',
    desc: 'Nghe hiểu từ vựng cơ bản, chọn nghĩa tiếng Việt và đọc hiểu đoạn hội thoại ngắn.',
    totalQ: 20,
    minutes: Math.ceil((20 * SECONDS_PER_QUESTION) / 60),
    durationSec: 20 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  },
  2: {
    level: 2,
    label: 'HSK 2',
    desc: 'Nghe nhận diện từ vựng sinh hoạt, điền từ vào câu và đọc hiểu đoạn ngắn.',
    totalQ: 25,
    minutes: Math.ceil((25 * SECONDS_PER_QUESTION) / 60),
    durationSec: 25 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  },
  3: {
    level: 3,
    label: 'HSK 3',
    desc: 'Nghe hiểu từ vựng giao tiếp, điền từ ngữ cảnh và đọc hiểu đoạn văn.',
    totalQ: 30,
    minutes: Math.ceil((30 * SECONDS_PER_QUESTION) / 60),
    durationSec: 30 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  },
  4: {
    level: 4,
    label: 'HSK 4',
    desc: 'Nghe từ vựng trung cấp, hoàn thành câu ví dụ và đọc hiểu phân tích ý.',
    totalQ: 35,
    minutes: Math.ceil((35 * SECONDS_PER_QUESTION) / 60),
    durationSec: 35 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  },
  5: {
    level: 5,
    label: 'HSK 5',
    desc: 'Nghe từ vựng báo chí/đời sống, điền từ chuẩn xác và đọc hiểu suy luận.',
    totalQ: 40,
    minutes: Math.ceil((40 * SECONDS_PER_QUESTION) / 60),
    durationSec: 40 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  },
  6: {
    level: 6,
    label: 'HSK 6',
    desc: 'Nghe từ vựng học thuật, điền từ nâng cao và đọc hiểu văn bản tổng hợp.',
    totalQ: 40,
    minutes: Math.ceil((40 * SECONDS_PER_QUESTION) / 60),
    durationSec: 40 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  },
  7: {
    level: 7,
    label: 'HSK 7',
    desc: 'Chuẩn HSK 3.0 cao cấp: nghe phân biệt sắc thái nghĩa và đọc hiểu chuyên sâu.',
    totalQ: 40,
    minutes: Math.ceil((40 * SECONDS_PER_QUESTION) / 60),
    durationSec: 40 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  },
  8: {
    level: 8,
    label: 'HSK 8',
    desc: 'Chuẩn HSK 3.0 cao cấp: từ vựng chuyên ngành, ngữ cảnh phức hợp và đọc luận.',
    totalQ: 40,
    minutes: Math.ceil((40 * SECONDS_PER_QUESTION) / 60),
    durationSec: 40 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  },
  9: {
    level: 9,
    label: 'HSK 9',
    desc: 'Chuẩn HSK 3.0 đỉnh cao: đọc hiểu văn bản nghị luận, văn hóa và từ vựng tinh hoa.',
    totalQ: 40,
    minutes: Math.ceil((40 * SECONDS_PER_QUESTION) / 60),
    durationSec: 40 * SECONDS_PER_QUESTION,
    maxAudioPlays: 2,
    passPercent: 60,
    allowPartialCredit: false
  }
};