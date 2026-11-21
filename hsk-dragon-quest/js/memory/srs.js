import { store } from '../storage/db.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const FAST_THRESHOLD_MS = 2500;

export function getTodayStr(nowMs = Date.now()) {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekStr(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function median(arr) {
  if (!arr || arr.length === 0) return Infinity;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function getWordStatus(record) {
  if (!record || !record.lastSeenAt) return 'Mới';
  const medRt = median(record.rtHistory);
  const uniqueDays = (record.reviewDays || []).length;

  if (
    record.longTermVerified &&
    record.streak >= 4 &&
    medRt <= FAST_THRESHOLD_MS
  ) {
    return 'Thuộc lâu';
  }

  if (
    record.streak >= 3 &&
    uniqueDays >= 3 &&
    medRt <= FAST_THRESHOLD_MS
  ) {
    return 'Thuộc';
  }

  if (record.streak >= 2) return 'Quen';
  return 'Đang học';
}

export function recordReview(hanzi, isCorrect, reactionMs, nowMs = Date.now()) {
  const srs = store.state.srs;
  const today = getTodayStr(nowMs);

  const rec = srs[hanzi] || {
    ease: 2.5,
    intervalDays: 0,
    streak: 0,
    lapses: 0,
    nextReviewAt: nowMs,
    lastSeenAt: null,
    reviewDays: [],
    rtHistory: [],
    longTermVerified: false
  };

  const prevLastSeen = rec.lastSeenAt;
  rec.lastSeenAt = nowMs;

  if (!isCorrect) {
    rec.streak = 0;
    rec.lapses += 1;
    rec.intervalDays = 0;
    rec.ease = Math.max(1.3, rec.ease - 0.2);
    rec.nextReviewAt = nowMs + 10 * 60 * 1000;
    rec.longTermVerified = false;
  } else {
    const clampedRt = Math.max(250, Math.min(15000, reactionMs));
    rec.rtHistory = [...rec.rtHistory, clampedRt].slice(-5);

    if (!rec.reviewDays.includes(today)) {
      rec.reviewDays.push(today);
    }

    const isFast = clampedRt <= FAST_THRESHOLD_MS;
    rec.streak += 1;

    if (prevLastSeen && (nowMs - prevLastSeen) >= 30 * DAY_MS && isFast) {
      rec.longTermVerified = true;
    }

    if (!isFast) {
      rec.intervalDays = Math.max(0.5, rec.intervalDays * 0.6);
      rec.ease = Math.max(1.3, rec.ease - 0.08);
    } else {
      if (rec.streak === 1) rec.intervalDays = 1;
      else if (rec.streak === 2) rec.intervalDays = 3;
      else rec.intervalDays = Math.round(rec.intervalDays * rec.ease);
      rec.ease = Math.min(3.0, rec.ease + 0.1);
    }

    rec.nextReviewAt = nowMs + rec.intervalDays * DAY_MS;
  }

  srs[hanzi] = rec;
  updateWeeklyReactionStat(reactionMs, nowMs);
  store.save();
  return { record: rec, status: getWordStatus(rec) };
}

function updateWeeklyReactionStat(reactionMs, nowMs) {
  const week = getWeekStr(nowMs);
  const logs = store.state.weeklyRtLog;
  let entry = logs.find((x) => x.week === week);
  if (!entry) {
    entry = { week, samples: [], medianMs: reactionMs };
    logs.push(entry);
    if (logs.length > 8) logs.shift();
  }
  entry.samples = [...(entry.samples || []), Math.min(10000, reactionMs)].slice(-100);
  entry.medianMs = Math.round(median(entry.samples));
}

export function getDueWords(allWords, nowMs = Date.now(), limit = 15) {
  const srs = store.state.srs;
  const due = [];
  for (const w of allWords) {
    const rec = srs[w.hanzi];
    if (rec && rec.nextReviewAt <= nowMs) {
      due.push({ word: w, rec });
    }
  }
  due.sort((a, b) => {
    const scoreA = a.rec.lapses * 10 - a.rec.streak * 3 + (nowMs - a.rec.nextReviewAt) / DAY_MS;
    const scoreB = b.rec.lapses * 10 - b.rec.streak * 3 + (nowMs - b.rec.nextReviewAt) / DAY_MS;
    return scoreB - scoreA;
  });
  return due.slice(0, limit).map((x) => x.word);
}

export function getNewWords(allWords, level, limit = 5) {
  const srs = store.state.srs;
  return allWords
    .filter((w) => w.level === level && !srs[w.hanzi])
    .slice(0, limit);
}

export function getWeakestWords(allWords, limit = 10) {
  const srs = store.state.srs;
  const seen = allWords.filter((w) => srs[w.hanzi]);
  if (seen.length === 0) return allWords.slice(0, limit);
  seen.sort((a, b) => {
    const ra = srs[a.hanzi];
    const rb = srs[b.hanzi];
    return (rb.lapses - rb.streak) - (ra.lapses - ra.streak);
  });
  return seen.slice(0, limit);
}

export function updateStreakAndTasks(nowMs = Date.now()) {
  const today = getTodayStr(nowMs);
  const yesterday = getTodayStr(nowMs - DAY_MS);
  const p = store.state.profile;

  if (p.dailyTasks.date !== today) {
    p.dailyTasks = { date: today, reviewsDone: 0, newLearned: 0, gameWon: false };
  }

  if (p.lastStudyDate === today) return;

  if (p.lastStudyDate === yesterday) {
    p.streak += 1;
  } else if (p.lastStudyDate && p.freezes > 0) {
    p.freezes -= 1;
    p.streak += 1;
  } else {
    p.streak = 1;
  }
  p.lastStudyDate = today;
  store.save();
}