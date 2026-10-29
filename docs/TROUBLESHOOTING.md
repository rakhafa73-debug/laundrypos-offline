# Panduan Pemecahan Masalah (Troubleshooting) & Keterbatasan Sistem

## 1. Masalah Umum & Solusi

### A. Terminal Kasir Menampilkan "Server Terputus"
- **Penyebab**: Kabel LAN terlepas, IP router toko berubah, atau komputer server utama dalam kondisi mati/tidur (sleep mode).
- **Solusi**:
  1. Pastikan PC server utama menyala dan tidak masuk mode Sleep/Hibernate (atur *Power Options* ke *Never Sleep*).
  2. Periksa apakah IP server masih sama (gunakan IP statis di router toko).
  3. Klik tombol **"Server Terputus (Klik Reconnect)"** di bilah atas aplikasi.

### B. Notifikasi "Database is locked" atau "busy_timeout"
- **Penyebab**: Transaksi sangat padat bersamaan atau ada backup eksternal pihak ketiga yang mengunci file database.
- **Solusi**:
  1. LaundryPOS sudah menggunakan mode SQLite WAL (`journal_mode = WAL`) dengan `busy_timeout = 5000ms` yang mengizinkan banyak pembaca sekaligus.
  2. Jangan pernah menyimpan file database SQLite pada folder yang disinkronkan oleh Google Drive, Dropbox, atau OneDrive desktop karena layanan cloud tersebut mengunci file saat sinkronisasi.

### C. Printer Thermal Mencetak Huruf Terlalu Kecil atau Terpotong
- **Penyebab**: Pengaturan lebar kertas tidak cocok antara software dan driver printer.
- **Solusi**:
  1. Masuk ke **Pengaturan Toko** -> ubah ke `58 mm` atau `80 mm` sesuai ukuran gulungan kertas Anda.
  2. Pada dialog cetak browser, ubah Margin ke **None**.

---

## 2. Keterbatasan yang Diketahui (Known Limitations)
1. **Tidak Ada Sinkronisasi Cloud**: Sistem ini dirancang 100% offline-first untuk toko mandiri; transaksi hanya tersimpan di PC server toko.
2. **Koneksi Antar Perangkat Membutuhkan Router Lokal**: Terminal kasir dan tablet operator memerlukan koneksi WiFi/LAN lokal ke server yang sama.
3. **Pencetakan Bergantung pada Dialog Browser**: Browser web standar tidak mengizinkan akses port USB langsung tanpa izin dialog sistem operasi.
