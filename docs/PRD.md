# Product Requirements Document (PRD) — LaundryPOS Offline

## 1. Ringkasan Eksekutif
**LaundryPOS Offline** adalah sistem Point of Sale (POS) dan manajemen operasional laundry kiloan yang dirancang khusus untuk toko fisik mandiri. Sistem beroperasi 100% pada jaringan lokal (LAN) toko tanpa ketergantungan internet untuk transaksi harian.

## 2. Peran Pengguna & Matriks Hak Akses
| Fitur / Modul | Administrator (Owner) | Kasir (Cashier) | Operator Cuci |
|---|:---:|:---:|:---:|
| Buka / Tutup Sesi Kasir | ✅ | ✅ | ❌ |
| Transaksi POS & Nota Baru | ✅ | ✅ | ❌ |
| Pelunasan & Sisa Tagihan | ✅ | ✅ | ❌ |
| Cetak & Cetak Ulang Nota (Salinan) | ✅ | ✅ | ❌ |
| Manajemen Pelanggan | ✅ | ✅ | ❌ |
| Antrean & Status Cucian | ✅ | ✅ | ✅ (Alur pengerjaan) |
| Serah Terima Pakaian (Picked Up) | ✅ | ✅ | ❌ |
| Catat Biaya Operasional | ✅ | ✅ | ❌ |
| Laporan Keuangan & Ekspor CSV | ✅ | ❌ | ❌ |
| Katalog Layanan & Tarif per Kg | ✅ | ❌ | ❌ |
| Manajemen Akun Staf & Reset Password | ✅ | ❌ | ❌ |
| Backup & Restore SQLite | ✅ | ❌ | ❌ |
| Audit Trail & Log Keamanan | ✅ | ❌ | ❌ |
| Otorisasi Pengembalian Dana (Refund) | ✅ | ❌ | ❌ |

## 3. Alur Kerja Status Cucian
1. **received (Diterima)**: Pesanan dicatat di kasir dengan nomor nota unik atomik.
2. **washing (Mencuci)**: Pakaian masuk ke tabung mesin cuci.
3. **drying (Mengeringkan)**: Pakaian masuk mesin pengering (dryer).
4. **ironing (Menyetrika)**: Pakaian disetrika uap dan dirapikan.
5. **packing (Packing)**: Pakaian diplastik dan diberi label wangi.
6. **ready (Siap Diambil)**: Pakaian siap diserahkan kepada pelanggan.
7. **picked_up (Sudah Diambil)**: Pakaian diambil oleh pelanggan (wajib lunas sesuai kebijakan toko).
8. **cancelled (Dibatalkan)**: Pembatalan transaksi sebelum diambil dengan audit log.

## 4. Integritas Data & Aturan Finansial
- Berat disimpan sebagai integer dalam **gram** (misal 3.50 kg = 3.500 g).
- Nilai mata uang disimpan sebagai integer dalam **Rupiah**.
- Nominal diskon tidak boleh melebihi subtotal.
- Riwayat transaksi masa lalu bersifat **immutable** dengan snapshot tarif per kg dan nama layanan saat pesanan dibuat.
- Nomor nota dijamin unik dan atomik (`LP-YYYYMMDD-001`).
- Double-submission dicegah menggunakan **idempotency key**.
