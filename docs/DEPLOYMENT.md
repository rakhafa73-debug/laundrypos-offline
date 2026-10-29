# Panduan Instalasi & Deployment Server Lokal (Windows & Linux)

## 1. Persyaratan Sistem Komputer Server
- **OS**: Windows 10/11 Pro atau Linux Ubuntu Server 22.04 / 24.04 LTS.
- **Node.js**: Versi 20 LTS atau 22 LTS.
- **RAM**: Minimal 4 GB (disarankan 8 GB).
- **Jaringan**: Terhubung ke router WiFi toko via kabel LAN untuk stabilitas latensi. Berikan IP statis (contoh: `192.168.1.100`).

---

## 2. Instalasi Cepat pada Linux (Ubuntu / Debian)
```bash
# 1. Update paket dan pasang Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential

# 2. Clone repositori aplikasi
git clone https://github.com/toko/laundrypos-offline.git /opt/laundrypos
cd /opt/laundrypos

# 3. Pasang dependensi dan bangun frontend
npm install
npm run build

# 4. Pasang PM2 untuk auto-start saat komputer server dinyalakan
sudo npm install -g pm2
pm2 start server.ts --name "laundrypos" --interpreter tsx
pm2 save
pm2 startup
```

### Konfigurasi Firewall Linux (UFW)
```bash
# Buka port 3000 hanya untuk subnet jaringan lokal LAN toko
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
sudo ufw status
```

---

## 3. Instalasi pada Windows Server / Windows 10 / 11
1. Unduh dan pasang **Node.js LTS** dari `https://nodejs.org/`.
2. Buka **Command Prompt (CMD)** atau **PowerShell** sebagai Administrator.
3. Jalankan perintah:
   ```cmd
   cd C:\LaundryPOS
   npm install
   npm run build
   ```
4. Pasang **NSSM (Non-Sucking Service Manager)** atau **PM2 Windows Service** agar server menyala otomatis saat komputer dihidupkan:
   ```cmd
   npm install -g pm2 pm2-windows-service
   pm2-service-install
   pm2 start server.ts --name "laundrypos" --interpreter tsx
   pm2 save
   ```
5. Buka **Windows Defender Firewall with Advanced Security**:
   - Tambahkan *Inbound Rule* baru -> *Port* -> *TCP 3000* -> *Allow the connection* (Private Network).

---

## 4. Menghubungkan Terminal Kasir & Operator
Dari komputer kasir atau tablet operator di toko, buka browser (Chrome / Edge / Safari):
```
http://192.168.1.100:3000
```
Klik tombol **"Install Aplikasi POS"** di bilah atas untuk mengaktifkan mode aplikasi mandiri (PWA).
