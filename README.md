# SoundMode - Audio to MIDI Web Transcriber

SoundMode adalah aplikasi web modern untuk mentranskripsi rekaman audio musik (format MP3, WAV, FLAC, OGG, M4A) menjadi notasi balok dan file MIDI polifonik secara instan. Seluruh proses inferensi AI dan decoding audio berjalan 100% di sisi klien (*client-side*) pada peramban web tanpa memerlukan server backend.

---

## Fitur Utama

- **Transkripsi Audio ke MIDI Polifonik**: Menggunakan model pembelajaran mesin *BasicPitch* (didukung oleh TensorFlow.js) untuk mendeteksi notasi nada, durasi, kecepatan (velocity), dan *pitch bends*.
- **Fokus Instrumen Musik (Vocal Cancellation)**: Dilengkapi fitur pemisahan stereo *phase-cancellation* (`left - right`) untuk mengeliminasi vokal tengah (*center vocal*), sehingga hanya instrumen pengiring (piano, synth, gitar, harmoni) yang ditranskripsi ke MIDI.
- **Waveform Player Interaktif**: Pemutar audio terintegrasi dengan visualisasi bentuk gelombang kanvas 2D yang dapat diklik untuk navigasi waktu pemutaran (*seekable*).
- **Pengaturan Sensitivitas AI & Preset**: Slider interaktif untuk mengatur *Onset Threshold*, *Frame Threshold*, dan *Minimum Note Length*, dilengkapi tombol preset (Standar, Melodi Solo, Akord/Polifonik).
- **Piano Roll Canvas & Synth Preview**: Visualisasi tuts piano dan balok nada MIDI hasil transkripsi secara interaktif. Pengguna dapat mendengarkan pratinjau suara MIDI menggunakan synthesizer bawaan Web Audio API sebelum mengunduh berkas.
- **Ekspor Berkas**: Unduh langsung hasil transkripsi dalam format standar `.mid` (MIDI) serta data mentah struktur not dalam format `.json`.
- **Bebas Pembekuan UI (*Non-Blocking UI*)**: Menggunakan mekanisme *frame yielding* (`tf.nextFrame()`) dan pembersihan tensor seketika (`dispose()`) agar antarmuka peramban tetap responsif selama proses inferensi berlangsung.

---

## Teknologi yang Digunakan

- **Frontend Core**: React 19, Vite
- **Machine Learning**: `@spotify/basic-pitch`, `@tensorflow/tfjs`
- **Manipulasi MIDI**: `@tonejs/midi`
- **Audio & Grafik**: Web Audio API (`AudioContext`, `OfflineAudioContext`), HTML5 Canvas API
- **Styling**: Vanilla CSS (Tema Gelap, Glassmorphism, Desain Responsif)

---

## Panduan Instalasi & Menjalankan

### 1. Prasyarat
Pastikan komputer Anda telah terinstal:
- [Node.js](https://nodejs.org/) (versi 18 ke atas disarankan)
- npm (bawaan dari Node.js)

### 2. Pemasangan Dependensi
Buka terminal pada direktori proyek dan jalankan:
```bash
npm install
```

### 3. Menjalankan Server Pengembangan
Jalankan server dev lokal:
```bash
npm run dev
```
Secara default aplikasi dapat diakses melalui peramban pada alamat:
`http://localhost:5173/`

Jika ingin menjalankan pada port tertentu (misalnya port 6767):
```bash
npm run dev -- --port 6767
```

### 4. Membangun Bundle Produksi
Untuk menguji atau membuat file bundle produksi:
```bash
npm run build
```

---

## Panduan Menggunakan Berkas MIDI di DAW

1. Buka aplikasi web SoundMode dan unggah file musik (`.mp3` atau `.wav`).
2. Tentukan fokus transkripsi:
   - Pilih **Instrumen Musik (Hilangkan Vokal)** untuk memfokuskan transkripsi pada instrumen pengiring.
   - Pilih **Semua Suara (Musik + Vokal)** jika ingin mentranskripsikan melodi vokal beserta instrumennya.
3. Klik tombol **Mulai Transkripsi ke MIDI** dan tunggu hingga selesai.
4. Klik **Ekspor File MIDI (.mid)** untuk mengunduh file MIDI.
5. Pada Digital Audio Workstation (DAW) pilihan Anda (seperti FL Studio, Ableton Live, Logic Pro, Cubase):
   - Tarik (*drag-and-drop*) file `.mid` yang telah diunduh ke bagian **Channel Rack** atau **Piano Roll** yang terhubung ke plugin instrumen VST (misalnya *FL Keys*, *FLEX*, *Serum*, *Kontakt*, dll.).
   - Not-not hasil transkripsi akan muncul sebagai balok nada MIDI yang siap diaransemen ulang atau disesuaikan instrumen suaranya.
