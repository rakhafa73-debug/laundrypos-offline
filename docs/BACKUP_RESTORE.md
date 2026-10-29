# Panduan Cadangan (Backup) & Pemulihan (Restore) SQLite

## 1. Mekanisme Backup Atomik
LaundryPOS Offline menggunakan SQLite Online Backup API (`db.backup()`):
- **Non-blocking**: Database tetap dapat melayani pembacaan dan pencatatan transaksi oleh kasir saat backup berlangsung.
- **Konsisten**: Snapshot dijamin konsisten dan tidak mengalami "torn-page" atau korupsi data.
- **Metadata**: Setiap backup dicatat dalam tabel `backup_metadata` bersama ukuran byte dan hash **SHA-256**.

## 2. Prosedur Pemulihan (Restore) Aman
1. Buka menu **Backup & Restore** dengan akun Administrator.
2. Pilih file cadangan dari daftar dan klik **Pulihkan (Restore)**.
3. Sistem secara otomatis menjalankan 3 tahap perlindungan:
   - **Verifikasi Integritas**: Membaca file backup dan menjalankan `PRAGMA integrity_check`. Jika rusak, proses dibatalkan seketika.
   - **Emergency Snapshot**: Membuat salinan darurat dari database produksi aktif (`pre-restore-safety-*.db`).
   - **Atomic Replace & Post-check**: Mengganti file database dan memverifikasi integritas ulang.

## 3. Disiplin Penyimpanan Cadangan Toko
- Unduh file backup harian ke **Flashdisk khusus** atau **Drive Penyimpanan Eksternal**.
- Simpan setidaknya 7 snapshot harian terakhir dan 4 snapshot bulanan.
