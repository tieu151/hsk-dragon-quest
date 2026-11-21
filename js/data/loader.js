class DataLoader {
  constructor() { this.vocabByLevel = new Map(); this.allWordsMap = new Map(); }
  async init() {
    await this.loadLevel(1);
    Promise.all([2, 3, 4, 5].map((l) => this.loadLevel(l)));
  }
  async loadLevel(level) {
    if (this.vocabByLevel.has(level)) return this.vocabByLevel.get(level);
    const res = await fetch(`./data/hsk${level}.tsv`);
    const text = await res.text();
    const words = [];
    text.split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      const [hanzi = '', pinyin = '', pos = '', meaning = '', topic = 'Chung', exZh = '', exPy = '', exVi = '', mnemonic = ''] = line.split('\t');
      if (!hanzi) return;
      const w = { id: `${level}_${i}`, level, hanzi: hanzi.trim(), pinyin: pinyin.trim(), pos: pos.trim(), meaning: meaning.trim(), topic: topic.trim(), exZh: exZh.trim(), exPy: exPy.trim(), exVi: exVi.trim(), mnemonic: mnemonic.trim() };
      words.push(w);
      this.allWordsMap.set(w.hanzi, w);
    });
    this.vocabByLevel.set(level, words);
    return words;
  }
  async getAllLoadedWords() {
    await Promise.all([1, 2, 3, 4, 5].map((l) => this.loadLevel(l)));
    return Array.from(this.allWordsMap.values());
  }
}
export const dataLoader = new DataLoader();