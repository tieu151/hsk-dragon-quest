export function formatWordCount(count) {
  const n = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 0;
  return `${n.toLocaleString('vi-VN')} từ`;
}

export function formatLessonProgress(currentIndex, total) {
  const safeTotal = Number.isFinite(Number(total)) ? Math.max(0, Math.floor(Number(total))) : 0;
  if (safeTotal === 0) return 'Từ 0/0';
  const safeCur = Math.min(safeTotal, Math.max(1, Math.floor(Number(currentIndex || 0)) + 1));
  return `Từ ${safeCur}/${safeTotal}`;
}

export function countWordsByLevel(words, level) {
  if (!Array.isArray(words)) return 0;
  const targetLv = Number(level);
  return words.filter((w) => Number(w?.level) === targetLv).length;
}

export function computeVocabSummary(words, srsMap = {}) {
  const list = Array.isArray(words) ? words : [];
  const srs = srsMap && typeof srsMap === 'object' ? srsMap : {};
  let mastered = 0;
  let learning = 0;
  let due = 0;
  let unlearned = 0;

  for (const w of list) {
    if (!w || !w.hanzi) continue;
    const rec = srs[w.hanzi];
    if (!rec) {
      unlearned++;
    } else if ((Number(rec.streak) || 0) >= 3) {
      mastered++;
    } else {
      learning++;
      due++;
    }
  }

  return {
    total: list.length,
    mastered,
    learning,
    unlearned,
    due
  };
}

export function getDragonStage(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  if (safeXp >= 2500) return { stage: 5, name: 'Thiên Long HSK Chí Tôn', icon: '🐲', nextXp: null };
  if (safeXp >= 1200) return { stage: 4, name: 'Hỏa Long Hiệp Sĩ', icon: '🐉', nextXp: 2500 };
  if (safeXp >= 500) return { stage: 3, name: 'Xích Viêm Kiếm Long', icon: '🦖', nextXp: 1200 };
  if (safeXp >= 150) return { stage: 2, name: 'Tập Sự Long Con', icon: '🦎', nextXp: 500 };
  return { stage: 1, name: 'Trứng Rồng HSK', icon: '🥚', nextXp: 150 };
}