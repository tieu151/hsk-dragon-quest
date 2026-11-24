import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeTsvRows, isPosTagOnly } from '../js/data/loader.js';
import {
  generateExamPaper,
  gradeExamPaper,
  resetExamSeenHistory,
  EXAM_CONFIGS
} from '../js/exam/exam-engine.js';

const allWords = [];
for (let lv = 1; lv <= 7; lv++) {
  const p = `data/hsk${lv}.tsv`;
  if (fs.existsSync(p)) allWords.push(...normalizeTsvRows(fs.readFileSync(p, 'utf8'), lv));
}
// Bổ sung HSK 8 và HSK 9 từ kho từ cấp cao giống DataLoader.init()
const lv7Pool = allWords.filter((w) => w.level === 7);
const half = Math.ceil(lv7Pool.length / 2);
allWords.push(
  ...lv7Pool.slice(0, half).map((w, idx) => ({ ...w, id: `8_${idx}_${w.hanzi}`, level: 8 })),
  ...lv7Pool.slice(half).map((w, idx) => ({ ...w, id: `9_${idx}_${w.hanzi}`, level: 9 }))
);

resetExamSeenHistory();

// 1. Kiểm tra tất cả 9 cấp độ HSK 1..9 đều có đủ 3 nhóm kỹ năng (Nghe, Đọc/Điền từ, Viết/Ngữ pháp)
for (let lv = 1; lv <= 9; lv++) {
  const cfg = EXAM_CONFIGS[lv];
  const paper = generateExamPaper(lv, allWords, null, { setIndex: 1 });
  assert.equal(paper.questions.length, cfg.totalQ, `HSK ${lv} phai co dung ${cfg.totalQ} cau`);

  const skills = new Set(paper.questions.map((q) => q.skill));
  assert.ok(skills.has('listening'), `HSK ${lv} phai co phan Nghe hieu (listening)`);
  assert.ok(skills.has('fill'), `HSK ${lv} phai co phan Dien tu ngu canh (fill)`);
  assert.ok(skills.has('reading'), `HSK ${lv} phai co phan Doc hieu doan van (reading)`);
  assert.ok(skills.has('writing'), `HSK ${lv} phai co phan Viet & Ngu phap (writing)`);

  for (const q of paper.questions) {
    assert.equal(q.stem.includes('[Gợi ý'), false);
    assert.equal(q.options.length, 4, `Cau ${q.number} HSK ${lv} phai co 4 lua chon`);
    for (const opt of q.options) {
      assert.equal(isPosTagOnly(opt.text), false);
      assert.equal(opt.text.toLowerCase().includes('chưa cập nhật nghĩa'), false);
    }
    if (q.skill === 'listening') {
      assert.ok(q.audio && q.audio.text, 'Cau nghe phai co audio.text');
      assert.equal(q.stem.includes(q.audio.text), false, 'Cau nghe khong duoc lo nguyen van audio.text trong stem');
    }
    if (q.skill === 'fill') {
      assert.ok(q.stem.includes('（____）'), 'Cau dien tu phai co cho trong （____）');
    }
    if (q.subSkill === 'writing-order') {
      assert.ok(Array.isArray(q.segments) && q.segments.length >= 3, 'Cau sap xep tu phai co segments');
    }
  }

  const mockAnswers = Object.fromEntries(paper.questions.map((q) => [q.id, [...q.correct]]));
  const grade = gradeExamPaper(paper, mockAnswers, false);
  assert.equal(grade.score, 100);
  assert.equal(grade.hsk300Score, 300);
  assert.equal(grade.passed, true);
}

// 2. Kiểm tra tính KHÔNG LẶP LẠI giữa các đề liên tiếp cùng cấp (Chế độ sinh đề chống lặp)
resetExamSeenHistory(4);
const dynPaper1 = generateExamPaper(4, allWords);
const dynPaper2 = generateExamPaper(4, allWords);
const dynPaper3 = generateExamPaper(4, allWords);

const sigs1 = new Set(dynPaper1.questions.map((q) => q.signatureId));
const sigs2 = new Set(dynPaper2.questions.map((q) => q.signatureId));
const sigs3 = new Set(dynPaper3.questions.map((q) => q.signatureId));

for (const s of sigs2) {
  assert.equal(sigs1.has(s), false, `De 2 khong duoc trung cau hoi voi De 1 (trung: ${s})`);
}
for (const s of sigs3) {
  assert.equal(sigs2.has(s), false, `De 3 khong duoc trung cau hoi voi De 2 (trung: ${s})`);
}

console.log('ALL STEP 5 EXAM TESTS PASSED! (HSK 1-9 full 3 skills & zero cross-exam repetition verified)');
