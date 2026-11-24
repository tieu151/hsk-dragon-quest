import assert from 'node:assert/strict';
import {
  formatWordCount,
  formatLessonProgress,
  countWordsByLevel,
  computeVocabSummary,
  getDragonStage
} from '../js/data/vocab-stats.js';

// Truong hop 0 tu
assert.equal(formatWordCount(0), '0 từ');
assert.equal(formatWordCount(null), '0 từ');
assert.equal(formatLessonProgress(0, 0), 'Từ 0/0');
assert.equal(countWordsByLevel([], 1), 0);

const emptySummary = computeVocabSummary([], {});
assert.deepEqual(emptySummary, {
  total: 0,
  mastered: 0,
  learning: 0,
  unlearned: 0,
  due: 0
});

// Truong hop du lieu that
const sampleWords = [
  { hanzi: '你好', level: 1 },
  { hanzi: '谢谢', level: 1 },
  { hanzi: '学习', level: 1 },
  { hanzi: '图书馆', level: 2 }
];
const sampleSrs = {
  '你好': { streak: 4, reviews: 5 },
  '谢谢': { streak: 1, reviews: 2 }
};

assert.equal(countWordsByLevel(sampleWords, 1), 3);
assert.equal(countWordsByLevel(sampleWords, 2), 1);
assert.equal(formatWordCount(countWordsByLevel(sampleWords, 1)), '3 từ');
assert.equal(formatLessonProgress(2, 10), 'Từ 3/10');

const sum = computeVocabSummary(sampleWords, sampleSrs);
assert.deepEqual(sum, {
  total: 4,
  mastered: 1,
  learning: 1,
  unlearned: 2,
  due: 1
});

assert.equal(getDragonStage(0).stage, 1);
assert.equal(getDragonStage(600).stage, 3);
assert.equal(getDragonStage(3000).stage, 5);

console.log('ALL VOCAB COUNT & DRAGON STAGE TESTS PASSED!');