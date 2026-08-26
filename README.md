# GrabPic ⚡ AI Image Downloader (Manifest V3)

Ekstensi browser (*Manifest V3*) untuk Google Chrome dan Microsoft Edge yang dirancang khusus untuk mendeteksi dan mengunduh gambar hasil percakapan (chat) di **ChatGPT** (`chatgpt.com` / `chat.openai.com`) dan **Google Gemini** (`gemini.google.com`), dengan visual tema **Neo-Brutalism Dark Mode**.

---

## ⚡ Fitur Utama

- **Auto-Detection**: Secara otomatis memindai gambar hasil generate & upload dalam sesi chat aktif. Dilengkapi filter pintar untuk mengabaikan avatar profil, favicon, dan icon UI antarmuka.
- **Neo-Brutalism Dark Mode UI**:
  - Border tebal kontras putih (`#FFFFFF`).
  - Hard offset shadows multi-warna dinamis (Neon Green, Purple, Blue, Yellow, Orange).
  - Floating Action Button (FAB) kotak hijau neon dengan badge jumlah gambar bergaya stiker.
- **Drawer Galeri Interaktif**: Panel slide-in dari sisi kanan dengan thumbnail gambar, resolusi, dan kontrol pemilihan.
- **Dual Mode Download**:
  - **Download Semua**: Kompresi otomatis menjadi `.zip` (menggunakan `JSZip` lokal) jika gambar lebih dari 1.
  - **Download Terpilih**: Unduh gambar yang dicentang secara massal.
  - **Single Download**: Tombol download cepat di setiap kartu gambar.
- **Auto-Refresh (MutationObserver)**: Deteksi otomatis ketika ada pesan/gambar baru atau saat lazy-loading tanpa perlu menutup/membuka ulang panel.
- **Background Service Worker**: Eksekusi download file melalui `chrome.downloads` di `background.js` untuk stabilitas tinggi.
- **Penamaan Otomatis**: Format rapi `grabpix-{platform}-{timestamp}-{index}.png`.

---

## 📁 Struktur File

```
GrabPIc/
├── manifest.json         # Manifest V3 Configuration
├── background.js         # Service Worker downloader
├── content.js            # Image scanner, gallery drawer & event listeners
├── content.css           # Neo-Brutalism Dark Mode theme styling
├── lib/
│   └── jszip.min.js      # JSZip library lokal (tanpa CDN eksternal)
├── icon16.png            # App icon 16x16
├── icon32.png            # App icon 32x32
├── icon48.png            # App icon 48x48
├── icon128.png           # App icon 128x128
└── README.md             # Dokumentasi & Panduan
```

---

## 🚀 Panduan Install Manual (Load Unpacked)

### Di Google Chrome:
1. Buka browser Chrome dan akses `chrome://extensions/` pada address bar.
2. Aktifkan **Developer mode** di pojok kanan atas.
3. Klik tombol **Load unpacked** di pojok kiri atas.
4. Pilih folder `d:\Githab\GrabPIc` (atau lokasi folder project ini).
5. Ekstensi **GrabPic** siap digunakan!

### Di Microsoft Edge:
1. Buka Microsoft Edge dan akses `edge://extensions/`.
2. Aktifkan **Developer mode** di menu sebelah kiri bawah.
3. Klik tombol **Load unpacked** dan pilih folder `GrabPIc`.

---

## 🎯 Cara Penggunaan

1. Buka [ChatGPT](https://chatgpt.com) atau [Google Gemini](https://gemini.google.com).
2. Lakukan chat atau generate gambar seperti biasa.
3. Tombol **FAB GrabPic** (kotak hijau neon dengan badge angka) akan otomatis muncul di pojok kanan bawah jika ada gambar terdeteksi.
4. Klik tombol FAB untuk membuka drawer galeri Neo-Brutalism.
5. Pilih gambar yang ingin diunduh atau klik **DOWNLOAD SEMUA**.

---

## 👤 Dibuat oleh

- **Instagram**: [@ikifer](https://instagram.com/ikifer)
- **GitHub**: [M-Ferdy-Nurdianto](https://github.com/M-Ferdy-Nurdianto)
