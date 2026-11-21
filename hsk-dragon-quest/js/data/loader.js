class DataLoader {
  constructor() {
    this.vocabByLevel = new Map();
    this.allWordsMap = new Map();
    this.radicals = [];
    this.stories = [];
  }

  async init() {
    const [radicalsRes, storiesRes] = await Promise.all([
      fetch('./data/radicals.json'),
      fetch('./data/stories.json')
    ]);
    this.radicals = await radicalsRes.json();
    this.stories = await storiesRes.json();
    await this.loadLevel(1);
    Promise.all([2, 3, 4, 5].map((lvl) => this.loadLevel(lvl)));
  }

  async loadLevel(level) {
    if (this.vocabByLevel.has(level)) return this.vocabByLevel.get(level);
    const res = await fetch(`./data/hsk${level}.tsv`);
    const text = await res.text();
    const words = [];
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      const cols = line.split('\t');
      if (cols.length < 5) continue;

      const [
        hanzi = '',
        pinyin = '',
        pos = '',
        meaning = '',
        topic = 'Chung',
        exZh = '',
        exPy = '',
        exVi = '',
        mnemonic = ''
      ] = cols;

      const wordObj = {
        id: `${level}_${i}`,
        level,
        hanzi: hanzi.trim(),
        pinyin: pinyin.trim(),
        pos: pos.trim(),
        meaning: meaning.trim(),
        topic: topic.trim() || 'Chung',
        exZh: exZh.trim(),
        exPy: exPy.trim(),
        exVi: exVi.trim(),
        mnemonic: mnemonic.trim(),
        hasExample: Boolean(exZh.trim() && exVi.trim())
      };

      words.push(wordObj);
      this.allWordsMap.set(wordObj.hanzi, wordObj);
    }

    this.vocabByLevel.set(level, words);
    return words;
  }

  async getAllLoadedWords() {
    await Promise.all([1, 2, 3, 4, 5].map((l) => this.loadLevel(l)));
    return Array.from(this.allWordsMap.values());
  }

  getTopicsForLevel(level) {
    const words = this.vocabByLevel.get(level) || [];
    const chunks = [];
    const size = 8;
    for (let i = 0; i < words.length; i += size) {
      const slice = words.slice(i, i + size);
      const topicName = slice[0]?.topic || `Chặng ${chunks.length + 1}`;
      chunks.push({
        index: chunks.length,
        title: `${topicName} (${i + 1}–${i + slice.length})`,
        words: slice
      });
    }
    return chunks;
  }

  checkStoryVocabulary(story) {
    const allowedChars = new Set();
    for (let l = 1; l <= story.level; l++) {
      const list = this.vocabByLevel.get(l) || [];
      list.forEach((w) => {
        for (const ch of w.hanzi) allowedChars.add(ch);
      });
    }
    let totalHanzi = 0;
    let inLevelHanzi = 0;
    for (const s of story.sentences) {
      for (const ch of s.zh) {
        if (/[\u4e00-\u9fa5]/.test(ch)) {
          totalHanzi++;
          if (allowedChars.has(ch)) inLevelHanzi++;
        }
      }
    }
    const ratio = totalHanzi ? Math.round((inLevelHanzi / totalHanzi) * 100) : 100;
    return { totalHanzi, inLevelHanzi, ratio, allowedChars };
  }
}

export const dataLoader = new DataLoader();