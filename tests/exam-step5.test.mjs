import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeTsvRows, isPosTagOnly } from '../js/data/loader.js';
import { generateExamPaper, gradeExamPaper } from '../js/exam/exam-engine.js';

const allWords = [];
for (let lv = 1; lv <= 7; lv++) {
  const p = `data/hsk${lv}.tsv`;
  if (fs.existsSync(p)) allWords.push(...normalizeTsvRows(fs.readFileSync(p, 'utf8'), lv));
}

const paper = generateExamPaper(4, allWords);
assert.ok(paper.questions.length >= 20, 'De thi HSK 4 phai co du cau hoi');

for (const q of paper.questions) {
  assert.equal(q.stem.includes('[Gợi ý'), false);
  for (const opt of q.options) {
    assert.equal(isPosTagOnly(opt.text), false);
    assert.equal(opt.text.toLowerCase().includes('chưa cập nhật nghĩa'), false);
  }
  if (q.skill === 'listening') {
    assert.equal(q.stem.includes(q.audio.text), false);
  }
}

const mockAnswers = Object.fromEntries(paper.questions.map((q) => [q.id, [...q.correct]]));
const grade = gradeExamPaper(paper, mockAnswers, false);
assert.equal(grade.score, 100);
console.log('ALL STEP 5 EXAM TESTS PASSED!');
