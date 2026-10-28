# WhatsApp API Service

Layanan RESTful API WhatsApp berbasis Node.js dan [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) dengan autentikasi sesi lokal (`LocalAuth`) dan dashboard monitoring realtime berbasis WebSocket (`Socket.IO`).

Dikembangkan oleh **Tim IT RSU Islam Cawas** (berbasis proyek awal oleh *Ngekoding*).

> [!IMPORTANT]
> **Pemberitahuan Kepatuhan WhatsApp:**
> WhatsApp tidak menyediakan API resmi gratis untuk otomasi tanpa melalui WhatsApp Business Cloud/On-Premises API. Penggunaan library ini berisiko terkena pemblokiran nomor (*banned*) jika digunakan untuk pengiriman pesan spam atau melanggar ketentuan layanan WhatsApp. Gunakan secara bijak dan selalu perbarui dependensi secara berkala.

> [!NOTE]
> **Prasyarat Sistem:** Memerlukan **Node.js versi 18.0.0 atau lebih tinggi**.

---

## Fitur Utama

- **Unified API Endpoint (`/send`):** Satu endpoint pintar untuk segala kebutuhan (pesan teks, kirim media file/URL/lokal, kirim grup, hapus pesan, dan bersihkan chat).
- **Format Nomor Otomatis:** Otomatis mengubah awalan nomor lokal (`08xxx`) ke kode negara (`628xxx`).
- **Verifikasi Nomor Terdaftar:** Memeriksa status nomor sebelum mengirim guna mencegah error pengiriman.
- **Deteksi ACK Realtime:** Memantau status terkirim dan mengenali jika nomor belum terdaftar di bot.
- **Sesi Login Persisten:** Menggunakan `LocalAuth` sehingga sesi login tersimpan di folder `.wwebjs_auth/` tanpa perlu scan ulang setiap kali restart.
- **Web Dashboard Monitoring:** Antarmuka visual untuk memantau status bot, versi WhatsApp Web, QR Code login, riwayat log, dan respons API secara realtime.

---

## Panduan Instalasi & Menjalankan Server

### 1. Konfigurasi Awal
Salin file environment dan tentukan port yang diinginkan (default: `8000`):
```bash
cp .env-example .env
```

Pasang semua dependensi proyek:
```bash
npm install
```

### 2. Menjalankan Aplikasi

Pilih salah satu metode berikut sesuai kebutuhan:

#### A. Node.js Langsung
- **Mode Standar:**
  ```bash
  npm start
  ```
- **Mode Pengembangan (Auto-reload dengan nodemon):**
  ```bash
  npm run start:dev
  ```
- **Mode Auto-Crash Recovery:**
  ```bash
  npm run start:auto
  ```
  *(Log error otomatis dicatat ke dalam file `error.log`)*

#### B. Menggunakan PM2 (Rekomendasi untuk Lingkungan Produksi)
```bash
pm2 start ecosystem.config.js
pm2 monit
```

#### C. Menggunakan Docker
```bash
docker compose up -d
```

### 3. Autentikasi WhatsApp
1. Buka browser dan akses: `http://localhost:8000`
2. Pindai (scan) QR Code yang muncul di dashboard menggunakan aplikasi WhatsApp di ponsel Anda.
3. Setelah status berubah menjadi **"Whatsapp siap digunakan!"**, bot siap menerima permintaan API.

### 4. Pengujian Cepat via Postman
Berkas koleksi Postman yang siap pakai telah disediakan di root proyek:
- [`Whatsapp-API.postman_collection.json`](https://raw.githubusercontent.com/dedysurya13/Whatsapp-API/refs/heads/main/Whatsapp-API.postman_collection.json)

Anda cukup membuka aplikasi Postman, klik tombol **Import**, dan pilih berkas tersebut. Seluruh request untuk Unified Endpoint (`/send`) maupun Legacy Endpoint beserta variabel environment (`baseUrl`, `targetNumber`, `targetGroupName`) sudah siap digunakan.

---

## Dokumentasi API

### Unified Endpoint (Rekomendasi Utama)
Gunakan satu endpoint ini untuk semua interaksi pesan. Sistem akan secara otomatis mendeteksi tipe aksi berdasarkan payload yang Anda kirimkan.

- **URL:** `http://localhost:8000/send`
- **Method:** `POST`
- **Content-Type:** `application/json` atau `multipart/form-data`

#### 1. Kirim Pesan Teks (Individu)
```json
{
  "to": "081234567890",
  "message": "Halo, ini pesan konfirmasi pendaftaran."
}
```

#### 2. Kirim Pesan ke Grup
Dapat menggunakan nama grup atau ID grup (`...0@g.us`):
```json
{
  "group": "IT Support Team",
  "message": "Pemberitahuan: Pemeliharaan server telah selesai."
}
```
*Atau menggunakan Chat ID grup:*
```json
{
  "to": "120363012345678901@g.us",
  "message": "Pemberitahuan: Pemeliharaan server telah selesai."
}
```

#### 3. Kirim Media via Tautan / URL
```json
{
  "to": "081234567890",
  "file": "https://example.com/berkas/hasil-lab.pdf",
  "filename": "Hasil-Laboratorium.pdf",
  "caption": "Terlampir dokumen hasil pemeriksaan Anda."
}
```

#### 4. Kirim Media via Upload File
Kirim dengan format `multipart/form-data`:
- `to`: `081234567890`
- `file`: *(file binary yang diunggah)*
- `caption`: `Lampiran gambar` *(opsional)*
- `filename`: `Laporan.jpg` *(opsional)*

#### 5. Kirim Media dari Penyimpanan Lokal Server
```json
{
  "to": "081234567890",
  "file_path": "./local-file.png",
  "caption": "Pesan dengan lampiran file lokal server"
}
```

#### 6. Hapus Pesan yang Telah Dikirim (Delete Message)
```json
{
  "action": "delete",
  "to": "081234567890",
  "limit": 1,
  "everyone": true
}
```

#### 7. Bersihkan Riwayat Chat (Clear Chat)
```json
{
  "action": "clear",
  "to": "081234567890"
}
```

---

### Endpoint Spesifik (Legacy / Kompatibilitas)

Endpoint berikut tetap dipertahankan untuk menjamin kompatibilitas dengan sistem lama yang telah terintegrasi:

| Method | Endpoint | Parameter Utama | Keterangan |
| :--- | :--- | :--- | :--- |
| `POST` | `/send-message` | `number`, `message` | Mengirim pesan teks individu |
| `POST` | `/send-media-upload` | `number`, `file` (multipart), `caption`, `title` | Mengunggah dan mengirim file |
| `POST` | `/send-media-link` | `number`, `file` (URL), `caption`, `title` | Mengirim file dari link eksternal |
| `POST` | `/send-media-local` | `number`, `caption` | Mengirim file statis lokal `./local-file.png` |
| `POST` | `/send-group-message`| `id` atau `name`, `message` | Mengirim pesan ke grup |
| `POST` | `/clear-message` | `number` | Menghapus riwayat chat |
| `POST` | `/delete-message` | `number`, `limit`, `everyone` | Menghapus pesan terkirim |

---

## Perintah Chat WhatsApp (Bot Commands)

Anda dapat mengirimkan perintah berikut secara langsung ke nomor WhatsApp bot untuk pengujian:

- `!ping` : Bot akan membalas `pong`.
- `good morning` : Bot akan membalas `selamat pagi`.
- `!groups` : Bot akan membalas dengan daftar semua grup yang diikuti beserta ID dan namanya.

---

## Batasan & Catatan Teknis

1. **Format Nomor Tujuan:**
   - Awalan `08xx`, `+628xx`, maupun `628xx` didukung secara otomatis oleh helper pemformat.
2. **Penghapusan Pesan:**
   - Hanya pesan yang dikirim oleh bot (`fromMe: true`) yang dapat dihapus untuk semua orang (*delete for everyone*).
   - Pesan hanya dapat dihapus selama belum melewati batas waktu toleransi yang ditentukan oleh WhatsApp.
3. **Penyimpanan Sesi:**
   - Direktori `.wwebjs_auth/` dan `.wwebjs_cache/` menyimpan cache dan sesi browser. Jangan menghapus folder ini kecuali jika Anda ingin melakukan reset sesi login.

---

## Lisensi
Didistribusikan di bawah lisensi [MIT](LICENSE).
