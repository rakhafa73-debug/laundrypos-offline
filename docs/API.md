# Dokumentasi REST API — LaundryPOS Offline (v1)

Base URL: `http://localhost:3000/api/v1` (atau `http://<IP_LAN_SERVER>:3000/api/v1`)

Semua endpoint dilindungi autentikasi Bearer Token (kecuali `/auth/login`, `/auth/setup-status`, dan `/auth/setup-admin`).

---

## 1. Autentikasi (`/auth`)
- `GET /setup-status`: Mengecek apakah sistem baru dan membutuhkan pendaftaran admin pertama.
- `POST /setup-admin`: Mendaftarkan pemilik / administrator pertama toko.
- `POST /login`: Masuk sistem dengan `username` dan `password`. Mengembalikan token sesi dan profil pengguna.
- `POST /logout`: Mengakhiri sesi aktif dan menghapus token.
- `GET /me`: Mengambil data profil pengguna yang sedang login.

## 2. Pesanan Laundry (`/orders`)
- `GET /`: Daftar transaksi dengan filter `status`, `paymentStatus`, dan pencarian `search`.
- `GET /:id`: Detail pesanan lengkap dengan riwayat alur status dan riwayat pembayaran.
- `POST /`: Membuat transaksi baru secara atomik di SQLite.
  - Payload: `{ customerId, serviceId, weightGrams, discountAmount, additionalFee, fragrance, notes, downPaymentAmount, downPaymentMethod, idempotencyKey }`
- `PATCH /:id/status`: Memperbarui status cucian (`received` -> `washing` -> `drying` -> `ironing` -> `packing` -> `ready` -> `picked_up`).
- `POST /:id/cancel`: Membatalkan transaksi dengan pencatatan audit log.

## 3. Pembayaran & Kasir (`/payments`)
- `POST /`: Mencatat pembayaran DP atau pelunasan sisa tagihan.
- `POST /refund`: Otorisasi pengembalian dana (khusus role Admin).
- `GET /history`: Riwayat pembayaran terbaru.

## 4. Pelanggan (`/customers`)
- `GET /`: Daftar pelanggan dengan pencarian nama/telepon dan saldo piutang tertunggak.
- `GET /:id`: Profil pelanggan dan daftar seluruh pesanan historisnya.
- `POST /`: Menambahkan data pelanggan baru.
- `PUT /:id`: Memperbarui data pelanggan.

## 5. Layanan & Tarif (`/services`)
- `GET /`: Daftar layanan cucian aktif.
- `POST /`: Menambah layanan baru (role Admin).
- `PUT /:id`: Memperbarui tarif per kg atau estimasi durasi (role Admin).
- `PATCH /:id/toggle`: Mengaktifkan / menonaktifkan layanan (role Admin).

## 6. Sesi Kasir & Pengeluaran (`/cash-sessions` & `/expenses`)
- `GET /cash-sessions/active`: Status laci kasir yang sedang aktif untuk kasir yang login.
- `POST /cash-sessions/open`: Buka sesi kasir dengan modal awal.
- `POST /cash-sessions/close`: Tutup shift dengan rekonsiliasi kas aktual dan hitung selisih.
- `GET /expenses`: Daftar pengeluaran operasional.
- `POST /expenses`: Mencatat biaya operasional.

## 7. Laporan & Keuangan (`/reports`)
- `GET /dashboard`: Ringkasan metrik cepat untuk dashboard operasional.
- `GET /detailed`: Laporan keuangan terperinci berdasarkan rentang tanggal.

## 8. Cadangan & Pemulihan (`/backups`)
- `GET /`: Daftar file snapshot database.
- `POST /create`: Membuat online backup SQLite.
- `POST /restore`: Memulihkan database dengan verifikasi integritas dan auto-snapshot keselamatan.
- `GET /download/:filename`: Mengunduh file backup `.db`.

## 9. Pengaturan & Diagnostik (`/settings`)
- `GET /`: Membaca pengaturan profil toko, printer, dan status diagnostik SQLite.
- `PUT /`: Menyimpan perubahan pengaturan toko (role Admin).
- `POST /seed-demo`: Memuat data pengujian secara eksplisit (role Admin).
