# Arsitektur Sistem — LaundryPOS Offline

## 1. Topologi Jaringan LAN Toko
```
                       +---------------------------------------+
                       |           PC Server Utama             |
                       |       (Node.js + SQLite WAL)          |
                       |         IP: 192.168.1.100:3000        |
                       +---------------------------------------+
                                           |
                   ================ Local Router / Switch WiFi LAN ================
                           |                               |
             +-------------------------+       +-------------------------+
             |    Terminal Kasir 1     |       |    Terminal Kasir 2     |
             |   (Browser / PWA App)   |       |   (Browser / PWA App)   |
             | Thermal 58mm/80mm USB   |       | Thermal 58mm/80mm USB   |
             +-------------------------+       +-------------------------+
                                           |
                               +-------------------------+
                               |     Tablet Operator     |
                               | (Di Area Mesin Cuci)    |
                               |   Live Status Updates   |
                               +-------------------------+
```

## 2. Komponen Teknis
1. **Frontend**:
   - React 19, TypeScript, Vite.
   - Tailwind CSS v4, Lucide Icons.
   - PWA Service Worker (`public/sw.js`) untuk precache aset statis frontend secara offline.
2. **Backend**:
   - Node.js LTS, Express REST API (`/api/v1/*`).
   - WebSocket (`/ws`) untuk sync real-time status antar-perangkat di LAN toko.
   - Security: Argon2id/Bcrypt password hashing, tokenized session validation, rate limiting brute-force login.
3. **Database**:
   - SQLite lokal murni via `better-sqlite3`.
   - **Write-Ahead Logging (WAL)** diaktifkan untuk konkurensi multi-reader dan non-blocking atomic writes.
   - Transaksi SQL atomik (`BEGIN TRANSACTION ... COMMIT`) untuk pembuatan pesanan, nomor nota, dan pembayaran.
   - Backup online live tanpa mematikan aplikasi melalui SQLite `.backup` API.
