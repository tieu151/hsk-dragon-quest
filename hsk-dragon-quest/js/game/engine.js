import { store } from '../storage/db.js';
import { recordReview, updateStreakAndTasks } from '../memory/srs.js';
import { sfx } from '../audio/sfx.js';
import { triggerConfetti } from '../ui/charts.js';

export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'Khởi Đầu Thuận Lợi', desc: 'Hoàn thành màn chơi đầu tiên', check: (p) => p.xp >= 20 },
  { id: 'xp_200', name: 'Học Giả Tập Sự', desc: 'Đạt 200 XP', check: (p) => p.xp >= 200 },
  { id: 'xp_1000', name: 'Cao Thủ Hán Ngữ', desc: 'Đạt 1.000 XP', check: (p) => p.xp >= 1000 },
  { id: 'xp_5000', name: 'Vượt Vũ Môn', desc: 'Đạt 5.000 XP', check: (p) => p.xp >= 5000 },
  { id: 'streak_3', name: 'Ngọn Lửa Bền Bỉ', desc: 'Duy trì streak 3 ngày', check: (p) => p.streak >= 3 },
  { id: 'streak_7', name: 'Tuần Lễ Vàng', desc: 'Duy trì streak 7 ngày', check: (p) => p.streak >= 7 },
  { id: 'streak_30', name: 'Bất Bại 30 Ngày', desc: 'Duy trì streak 30 ngày', check: (p) => p.streak >= 30 },
  { id: 'words_10', name: '10 Viên Gạch Đầu', desc: 'Học qua 10 từ vựng', check: (_, srs) => Object.keys(srs).length >= 10 },
  { id: 'words_50', name: 'Kho Tàng 50 Từ', desc: 'Học qua 50 từ vựng', check: (_, srs) => Object.keys(srs).length >= 50 },
  { id: 'words_150', name: 'Chinh Phục HSK 1', desc: 'Chạm tới 150 từ vựng', check: (_, srs) => Object.keys(srs).length >= 150 },
  { id: 'words_300', name: 'Chinh Phục HSK 2', desc: 'Chạm tới 300 từ vựng', check: (_, srs) => Object.keys(srs).length >= 300 },
  { id: 'master_5', name: 'Phản Xạ Thần Tốc', desc: 'Đạt trạng thái Thuộc 5 từ', check: (_, srs) => Object.values(srs).filter((r) => r.streak >= 3).length >= 5 },
  { id: 'master_25', name: 'Bậc Thầy Ghi Nhớ', desc: 'Đạt trạng thái Thuộc 25 từ', check: (_, srs) => Object.values(srs).filter((r) => r.streak >= 3).length >= 25 },
  { id: 'boss_1', name: 'Diệt Boss Thế Giới 1', desc: 'Đánh bại Boss HSK 1', check: (p) => p.bossDefeated[1] },
  { id: 'boss_2', name: 'Diệt Boss Thế Giới 2', desc: 'Đánh bại Boss HSK 2', check: (p) => p.bossDefeated[2] },
  { id: 'boss_3', name: 'Diệt Boss Thế Giới 3', desc: 'Đánh bại Boss HSK 3', check: (p) => p.bossDefeated[3] },
  { id: 'boss_4', name: 'Diệt Boss Thế Giới 4', desc: 'Đánh bại Boss HSK 4', check: (p) => p.bossDefeated[4] },
  { id: 'boss_5', name: 'Chân Long Xuất Thế', desc: 'Đánh bại Boss HSK 5', check: (p) => p.bossDefeated[5] },
  { id: 'coins_200', name: 'Thương Nhân Giàu Có', desc: 'Tích lũy 200 Long Châu', check: (p) => p.coins >= 200 },
  { id: 'skin_unlock', name: 'Nhà Sưu Tầm Giao Diện', desc: 'Mở khóa giao diện mới', check: (p) => p.unlockedSkins.length > 1 },
  { id: 'daily_champ', name: 'Chiến Thần Hằng Ngày', desc: 'Hoàn thành Thử thách hằng ngày', check: (p) => Boolean(p.dailyChallengeDate) },
  { id: 'star_3', name: 'Hoàn Hảo Tuyệt Đối', desc: 'Đạt 3 sao ở một màn Hành trình', check: (p) => Object.values(p.stageStars).includes(3) },
  { id: 'star_15', name: 'Chòm Sao Rực Rỡ', desc: 'Tích lũy tổng cộng 15 sao', check: (p) => Object.values(p.stageStars).reduce((a, b) => a + b, 0) >= 15 },
  { id: 'freeze_keeper', name: 'Người Giữ Băng', desc: 'Sở hữu ít nhất 2 Băng bảo vệ', check: (p) => p.freezes >= 2 },
  { id: 'hard_worker', name: 'Kiên Trì Luyện Tập', desc: 'Hoàn thành nhiệm vụ ngày', check: (p) => p.dailyTasks.gameWon }
];

export class SessionTracker {
  constructor(modeName) {
    this.modeName = modeName;
    this.combo = 0;
    this.maxCombo = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.xpEarned = 0;
    this.coinsEarned = 0;
    this.reactionTimes = [];
    this.newlyMastered = [];
    this.wrongWords = [];
  }

  getComboMultiplier() {
    if (this.combo >= 8) return 5;
    if (this.combo >= 5) return 3;
    if (this.combo >= 2) return 2;
    return 1;
  }

  submitAnswer(word, isCorrect, reactionMs) {
    const { status } = recordReview(word.hanzi, isCorrect, reactionMs);
    this.reactionTimes.push(reactionMs);

    if (isCorrect) {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.correctCount += 1;
      const mult = this.getComboMultiplier();
      const speedBonus = reactionMs <= 2500 ? 5 : 0;
      const gainedXp = (10 + speedBonus) * mult;
      this.xpEarned += gainedXp;
      this.coinsEarned += 2 * mult;
      sfx.playCorrect(this.combo);

      if ((status === 'Thuộc' || status === 'Thuộc lâu') && !this.newlyMastered.includes(word.hanzi)) {
        this.newlyMastered.push(word.hanzi);
      }
      store.state.profile.dailyTasks.reviewsDone += 1;
    } else {
      this.combo = 0;
      this.wrongCount += 1;
      if (!this.wrongWords.find((w) => w.hanzi === word.hanzi)) {
        this.wrongWords.push(word);
      }
      sfx.playWrong();
    }
    return { combo: this.combo, multiplier: this.getComboMultiplier(), status };
  }

  finish(extra = {}) {
    updateStreakAndTasks();
    const p = store.state.profile;
    p.xp += this.xpEarned;
    p.coins += this.coinsEarned;
    p.dailyTasks.gameWon = true;

    if (this.xpEarned >= 120 && p.freezes < 5) {
      p.freezes += 1;
    }

    const total = Math.max(1, this.correctCount + this.wrongCount);
    const accuracy = Math.round((this.correctCount / total) * 100);
    const avgRt = this.reactionTimes.length
      ? Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length)
      : 0;
    const stars = accuracy >= 90 && avgRt <= 3500 ? 3 : accuracy >= 70 ? 2 : accuracy >= 40 ? 1 : 0;

    if (extra.stageKey) {
      const prev = p.stageStars[extra.stageKey] || 0;
      if (stars > prev) p.stageStars[extra.stageKey] = stars;
    }
    if (extra.bossWorld && stars >= 2) {
      p.bossDefeated[extra.bossWorld] = true;
    }

    const newBadges = this.checkAchievements();
    store.save();
    store.logSessionEvent({
      mode: this.modeName,
      accuracy,
      xpEarned: this.xpEarned,
      avgRt
    });

    if (stars >= 2) {
      sfx.playWin();
      triggerConfetti();
    }

    return {
      modeName: this.modeName,
      accuracy,
      stars,
      xpEarned: this.xpEarned,
      coinsEarned: this.coinsEarned,
      maxCombo: this.maxCombo,
      avgRt,
      newlyMastered: this.newlyMastered,
      wrongWords: this.wrongWords,
      newBadges
    };
  }

  checkAchievements() {
    const p = store.state.profile;
    const srs = store.state.srs;
    const unlockedNow = [];
    for (const ach of ACHIEVEMENTS) {
      if (!p.badges.includes(ach.id) && ach.check(p, srs)) {
        p.badges.push(ach.id);
        unlockedNow.push(ach);
      }
    }
    return unlockedNow;
  }
}

export function createSeededRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}