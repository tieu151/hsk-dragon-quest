class DataLoader {
  constructor() {
    this.words = [];
    this.loaded = false;
  }

  async init() {
    if (this.loaded) return this.words;
    const files = [
      './data/hsk1.json',
      './data/hsk2.json',
      './data/hsk3.json',
      './data/hsk4.json',
      './data/hsk5.json',
      './data/hsk6.json',
      './data/hsk7.json'
    ];
    const results = await Promise.all(
      files.map(async (url, i) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          const arr = await res.json();
          return Array.isArray(arr) ? arr.map((w) => ({ ...w, level: w.level || (i + 1) })) : [];
        } catch {
          return [];
        }
      })
    );
    this.words = results.flat();
    this.loaded = true;
    return this.words;
  }

  async getAllLoadedWords() {
    if (!this.loaded) await this.init();
    return this.words;
  }
}

export const dataLoader = new DataLoader();