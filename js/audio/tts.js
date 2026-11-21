import { store } from '../storage/db.js';
class ChineseTTS {
  speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = store.state.settings.ttsRate || 1.0;
    window.speechSynthesis.speak(u);
  }
}
export const tts = new ChineseTTS();