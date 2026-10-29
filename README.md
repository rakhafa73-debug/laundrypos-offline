# LaundryPOS Offline

> **Sistem POS & Manajemen Operasional Laundry Kiloan Mandiri (Offline-First / Jaringan Lokal LAN Toko)**

LaundryPOS Offline adalah aplikasi Point of Sale (POS) dan manajemen alur kerja pencucian yang dirancang khusus untuk toko laundry kiloan fisik dengan arsitektur **Single Source of Truth** pada jaringan lokal (LAN) toko. Sistem ini beroperasi 100% mandiri tanpa ketergantungan internet untuk seluruh operasional transaksi harian, mendukung banyak terminal kasir & operator secara bersamaan, serta kompatibel dengan printer thermal 58 mm dan 80 mm.

---

## 🌟 Fitur Utama

- **Offline-First & Local SQLite WAL**: Database SQLite tersimpan di komputer server utama dengan mode WAL (*Write-Ahead Logging*) untuk konkurensi multi-kasir tinggi dan transaksi atomik.
- **PWA (Progressive Web App)**: Aset antarmuka ter-cache secara otomatis via Service Worker sehingga dapat diakses cepat dari tablet/PC kasir tanpa internet.
- **Sinkronisasi Real-Time LAN (WebSocket)**: Perubahan status cucian dan pembayaran baru langsung disiarkan ke semua layar kasir dan operator di toko.
- **Kasir Kilat & Input Gram**: Input berat dalam gram (integer presisi) dengan tampilan otomatis dalam kilogram (misal 3.500 g = 3,50 kg), batas minimal order, diskon, dan aroma pewangi.
- **Cetak Nota Thermal 58 mm & 80 mm**: Format struk presisi dengan styling print CSS. Dilengkapi stempel keamanan `*** SALINAN / COPY ***` pada cetak ulang nota.
- **Alur Kerja Cucian Terstruktur**: Tahapan `received` $\rightarrow$ `washing` $\rightarrow$ `drying` $\rightarrow$ `ironing` $\rightarrow$ `packing` $\rightarrow$ `ready` $\rightarrow$ `picked_up`. Dilengkapi validasi pelunasan tagihan sebelum serah terima pakaian.
- **Sesi Kasir & Rekonsiliasi Kas**: Buka/tutup shift laci kasir, perhitungan uang modal awal, pembayaran tunai masuk, pengeluaran, dan selisih fisik laci.
- **Biaya Operasional Toko**: Pencatatan pembelian deterjen, pewangi, plastik packing, token listrik/air, dan bensin kurir.
- **Laporan & Ekspor CSV**: Analisis omzet, realisasi kas, piutang tertunggak, laba bersih, serta ekspor data ke format `.csv`.
- **Backup & Pemulihan SQLite**: Snapshot online live tanpa menghentikan server, verifikasi `PRAGMA integrity_check`, checksum SHA-256, dan pre-restore emergency backup.
- **Audit Log Keamanan**: Rekam jejak digital pengguna, tindakan finansial, alamat IP, dan payload perubahan.

---

## 👥 Hak Akses & Akun Default

Sistem menyediakan 3 tingkatan peran pengguna:

| Peran (Role) | Username Default | Password Default | Izin Akses |
|---|---|---|---|
| **Administrator (Owner)** | `admin` | `admin123` | Akses penuh (Pengaturan toko, laporan laba rugi, backup/restore, katalog tarif, audit log). |
| **Kasir Toko** | `kasir1` *(alias `kasir`)* | `kasir123` | Transaksi POS, pelanggan, pembayaran DP & pelunasan, cetak nota, sesi kasir. |
| **Operator Cuci** | `operator1` *(alias `operator`)* | `operator123` | Antrean cucian & pembaruan alur proses cucian di area mesin cuci. |

---

## 🚀 Panduan Instalasi & Menjalankan

### Persyaratan Sistem
- Node.js versi 20 LTS atau 22 LTS
- Git

### Langkah Instalasi
```bash
# 1. Clone repositori
git clone https://github.com/rakhafa73-debug/laundrypos-offline.git
cd laundrypos-offline

# 2. Pasang dependensi
npm install

# 3. Jalankan mode pengembangan
npm run dev

# 4. Bangun untuk produksi
npm run build
npm start
```

Buka peramban (browser) di komputer lokal:
```
http://localhost:3000
```
Untuk perangkat kasir / tablet operator di jaringan Wi-Fi toko yang sama:
```
http://<IP_KOMPUTER_SERVER>:3000
```

---

## 🧪 Menjalankan Pengujian (Unit Tests)
```bash
npm test
```
Seluruh 11 pengujian aturan bisnis (kalkulasi gram, minimal order, diskon, DP, saldo terutang, alur status, penomoran nota, dan idempotensi) dijalankan menggunakan Vitest.

---

## 📚 Dokumentasi Terperinci
- [Spesifikasi PRD](docs/PRD.md)
- [Arsitektur & Jaringan LAN](docs/ARCHITECTURE.md)
- [Dokumentasi REST API v1](docs/API.md)
- [Panduan Deployment Windows & Linux](docs/DEPLOYMENT.md)
- [Panduan Printer Thermal 58mm & 80mm](docs/PRINTER_GUIDE.md)
- [Prosedur Backup & Restore SQLite](docs/BACKUP_RESTORE.md)
- [Troubleshooting & Solusi Masalah](docs/TROUBLESHOOTING.md)

---

## 📄 Lisensi
Hak Cipta (c) 2026 LaundryPOS Offline. Dilindungi undang-undang.
