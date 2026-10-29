# Panduan Konfigurasi Printer Thermal (58 mm & 80 mm)

LaundryPOS Offline dirancang dengan styling CSS Print presisi yang mendukung printer struk thermal standar:
- **58 mm roll paper**: Area cetak efektif ~48 mm (lebar preview ~384 px).
- **80 mm roll paper**: Area cetak efektif ~72 mm (lebar preview ~576 px).

---

## 1. Pengaturan Driver Printer di Komputer Kasir
1. Hubungkan printer thermal via kabel **USB** atau **Ethernet LAN** ke komputer kasir.
2. Pasang driver resmi printer bawaan pabrik (misal: *Epson TM-T82*, *Xprinter XP-58*, *Panda PRJ-58*, *Kassen BT-P3100*).
3. Buka **Control Panel** -> **Devices and Printers** -> Klik kanan printer -> **Printing Preferences**:
   - Atur **Paper Size** sesuai gulungan: `58 x 210 mm` (Roll Paper) atau `80 x 297 mm`.
   - Centang opsi **Auto Cut** (untuk printer 80mm yang memiliki pemotong otomatis).

---

## 2. Pengaturan Dialog Cetak Browser (Chrome / Edge)
Saat pertama kali mencetak nota dari LaundryPOS:
1. Tekan tombol **"Cetak Nota"** pada aplikasi POS.
2. Pada dialog cetak browser yang muncul:
   - **Destination**: Pilih printer thermal Anda.
   - **Paper size**: Pilih `58mm` atau `80mm` (jangan pilih A4/Letter).
   - **Margins**: Pilih **None** (Tanpa Margin).
   - **Options**: Hilangkan centang pada **"Headers and footers"** (agar tanggal dan URL browser tidak ikut tercetak di atas nota).
3. Setelah pengaturan di atas dipilih sekali, browser akan mengingatnya untuk seluruh transaksi berikutnya.

---

## 3. Fitur Cetak Ulang Nota (Salinan)
Jika nota hilang atau pelanggan meminta struk ulang:
1. Buka menu **Pesanan & Antrean**.
2. Klik tombol ikon **Printer** pada baris pesanan terkait.
3. Aplikasi akan membuka nota dengan stempel resmi:
   ```
   *** SALINAN / COPY ***
   ```
   Hal ini mencegah kecurangan atau klaim ganda pengambilan cucian.
