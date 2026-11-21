# 🐉 Long Môn HSK — Web Game Học Tiếng Trung HSK1–HSK5

Ứng dụng web học từ vựng và luyện phát âm tiếng Trung HSK1–HSK5 theo cơ chế trò chơi hóa, thuật toán lặp lại ngắt quãng **SRS đo thời gian phản xạ**, và **Đấu trường chấm phát âm** chạy hoàn toàn phía trình duyệt (Zero-Backend mặc định, PWA Offline-first).

## Cấu trúc thư mục
```
hsk-dragon-quest/
├── index.html
├── manifest.json
├── sw.js
├── README.md
├── css/
│   └── style.css
├── data/
│   ├── radicals.json
│   ├── stories.json
│   ├── hsk1.tsv
│   ├── hsk2.tsv
│   ├── hsk3.tsv
│   ├── hsk4.tsv
│   └── hsk5.tsv
└── js/
    ├── app.js
    ├── audio/
    │   ├── pitch.js
    │   ├── sfx.js
    │   └── tts.js
    ├── data/
    │   └── loader.js
    ├── game/
    │   ├── engine.js
    │   └── modes.js
    ├── memory/
    │   └── srs.js
    ├── scoring/
    │   ├── pinyin-util.js
    │   └── speech-grader.js
    ├── storage/
    │   └── db.js
    └── ui/
        ├── charts.js
        ├── mascot.js
        └── views.js
```

## Cách chạy cục bộ trên Windows
Do trình duyệt chặn `fetch()` đọc file `.tsv`/`.json` và Service Worker khi mở trực tiếp qua giao thức `file://`, bạn hãy khởi chạy một máy chủ HTTP tĩnh tại thư mục `hsk-dragon-quest`:

### Cách 1: Dùng Python (khuyến nghị, có sẵn trên nhiều máy)
Mở PowerShell hoặc Terminal tại thư mục `hsk-dragon-quest` và chạy:
```powershell
python -m http.server 8080
```
Sau đó mở trình duyệt truy cập: `http://localhost:8080`

### Cách 2: Dùng Node.js (`npx serve`)
```powershell
npx serve . -p 8080
```

## Mở rộng từ vựng & truyện đọc
- **Từ vựng (`data/hsk1.tsv` ... `hsk5.tsv`):** Tệp phân tách bằng dấu **Tab (`\t`)**, mỗi dòng gồm 9 cột:
  `Hán tự` | `Pinyin` | `Từ loại` | `Nghĩa Việt` | `Chủ đề` | `Câu ví dụ` | `Pinyin ví dụ` | `Nghĩa ví dụ` | `Mẹo nhớ / Chiết tự`
- **Truyện ngắn (`data/stories.json`):** Thêm đối tượng truyện mới vào mảng JSON; hệ thống tự động tính tỷ lệ từ vựng nằm trong cấp HSK tương ứng.
