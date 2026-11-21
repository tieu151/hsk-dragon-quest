import { store } from '../storage/db.js';

class ChineseTTS {
  constructor() {
    this.zhVoice = null;
    this.ready = false;
    if ('speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    this.zhVoice =
      voices.find((v) => v.lang.toLowerCase().includes('zh-cn')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('zh')) ||
      null;
    this.ready = true;
  }

  hasChineseVoice() {
    if (!('speechSynthesis' in window)) return false;
    if (!this.zhVoice) this.loadVoices();
    return Boolean(this.zhVoice);
  }

  speak(text, rate = null, onBoundary = null, onEnd = null) {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return false;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    if (this.zhVoice) utter.voice = this.zhVoice;
    utter.rate = rate || store.state.settings.ttsRate || 1.0;

    if (onBoundary) {
      utter.onboundary = (e) => onBoundary(e.charIndex);
    }
    utter.onend = () => {
      if (onEnd) onEnd();
    };
    utter.onerror = () => {
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utter);
    return true;
  }

  async speakSyllableBySyllable(hanzi, onStep) {
    const chars = [...hanzi].filter((c) => /[\u4e00-\u9fa5]/.test(c));
    for (let i = 0; i < chars.length; i++) {
      if (onStep) onStep(i);
      await new Promise((res) => {
        this.speak(chars[i], 0.65, null, () => setTimeout(res, 220));
      });
    }
    if (onStep) onStep(-1);
  }

  getInstallGuideHTML() {
    return `
      <div class="card" style="border-color: var(--warning); background: var(--gold-light);">
        <strong>⚠️ Thiết bị chưa có gói giọng đọc tiếng Trung (zh-CN)</strong>
        <p style="margin:6px 0;font-size:0.88rem">Để nghe phát âm chuẩn offline, hãy bật giọng tiếng Trung trên máy:</p>
        <ul style="margin:0;padding-left:18px;font-size:0.85rem">
          <li><strong>Android:</strong> Cài đặt → Quản lý chung → Chuyển văn bản thành giọng nói → Cài đặt dữ liệu giọng nói → Tiếng Trung (Trung Quốc).</li>
          <li><strong>iPhone/iPad:</strong> Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Trung → Tải Tingting.</li>
          <li><strong>Windows 10/11:</strong> Settings → Time & Language → Speech → Add voices → Chinese (Simplified).</li>
        </ul>
      </div>
    `;
  }
}

export const tts = new ChineseTTS();