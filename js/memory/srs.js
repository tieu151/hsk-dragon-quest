import { store } from '../storage/db.js';
const DAY_MS = 86400000;

export function getTodayStr(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function getWordStatus(rec) {
  if (!rec || !rec.lastSeenAt) return 'Mới';
  if (rec.streak >= 4) return 'Thuộc lâu';
  if (rec.streak >= 3) return 'Thuộc';
  if (rec.streak >= 2) return 'Quen';
  return 'Đang học';
}
export function recordReview(hanzi, isCorrect, reactionMs, nowMs = Date.now()) {
  const srs = store.state.srs;
  const rec = srs[hanzi] || { ease: 2.5, intervalDays: 0, streak: 0, lapses: 0, nextReviewAt: nowMs, lastSeenAt: null, rtHistory: [] };
  rec.lastSeenAt = nowMs;
  if (!isCorrect) {
    rec.streak = 0; rec.lapses += 1; rec.intervalDays = 0; rec.nextReviewAt = nowMs + 600000;
  } else {
    rec.rtHistory = [...(rec.rtHistory || []), reactionMs].slice(-5);
    rec.streak += 1;
    rec.intervalDays = rec.streak === 1 ? 1 : rec.streak === 2 ? 3 : Math.round(rec.intervalDays * rec.ease);
    rec.nextReviewAt = nowMs + rec.intervalDays * DAY_MS;
  }
  srs[hanzi] = rec;
  store.save();
  return { record: rec, status: getWordStatus(rec) };
}
export function getDueWords(allWords, nowMs = Date.now(), limit = 15) {
  return allWords.filter((w) => store.state.srs[w.hanzi]?.nextReviewAt <= nowMs).slice(0, limit);
}
export function getNewWords(allWords, level, limit = 8) {
  return allWords.filter((w) => w.level === level && !store.state.srs[w.hanzi]).slice(0, limit);
}