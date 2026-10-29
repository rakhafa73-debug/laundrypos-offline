import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Database is stored in a dedicated local directory outside of frontend source
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'laundrypos.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db: Database.Database = new Database(DB_PATH);

// Enable WAL mode for high concurrency across multiple cashier terminals in LAN
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

export function initDatabase() {
  db.exec(`
    -- Schema Migrations Tracking
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );

    -- Users & Roles Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'operator')),
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Customers Table
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

    -- Services Table
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      price_per_unit INTEGER NOT NULL,
      min_units INTEGER NOT NULL DEFAULT 1000, -- 1000 grams = 1kg
      estimated_duration_hours INTEGER NOT NULL DEFAULT 48,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Cash Sessions Table
    CREATE TABLE IF NOT EXISTS cash_sessions (
      id TEXT PRIMARY KEY,
      cashier_id TEXT NOT NULL REFERENCES users(id),
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      opening_cash INTEGER NOT NULL,
      expected_cash INTEGER,
      actual_cash INTEGER,
      difference INTEGER,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('open', 'closed'))
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_cashier ON cash_sessions(cashier_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON cash_sessions(status);

    -- Orders Table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      receipt_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      cashier_id TEXT NOT NULL REFERENCES users(id),
      service_id TEXT NOT NULL REFERENCES services(id),
      session_id TEXT REFERENCES cash_sessions(id),
      weight_grams INTEGER NOT NULL,
      service_name_snapshot TEXT NOT NULL,
      price_per_kg_snapshot INTEGER NOT NULL,
      min_units_snapshot INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      additional_fee INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      remaining_balance INTEGER NOT NULL,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('unpaid', 'down_payment', 'paid', 'refunded')),
      status TEXT NOT NULL CHECK(status IN ('received', 'washing', 'drying', 'ironing', 'packing', 'ready', 'picked_up', 'cancelled')),
      fragrance TEXT DEFAULT 'Standard',
      notes TEXT,
      estimated_completion_at TEXT NOT NULL,
      ready_at TEXT,
      picked_up_at TEXT,
      picked_up_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_receipt ON orders(receipt_number);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

    -- Order Status History Table
    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      user_name_snapshot TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_order ON order_status_history(order_id);

    -- Payments Table
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      cashier_id TEXT NOT NULL REFERENCES users(id),
      session_id TEXT REFERENCES cash_sessions(id),
      amount INTEGER NOT NULL,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('down_payment', 'full_payment', 'settlement', 'refund')),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'transfer', 'qris')),
      idempotency_key TEXT UNIQUE,
      reference_note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_cashier ON payments(cashier_id);
    CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);

    -- Expenses Table
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      session_id TEXT REFERENCES cash_sessions(id),
      category TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at);

    -- Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    -- App Settings Table
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Receipt Sequences Table (atomic increment per day)
    CREATE TABLE IF NOT EXISTS receipt_sequences (
      date_prefix TEXT PRIMARY KEY,
      current_number INTEGER NOT NULL DEFAULT 0
    );

    -- Backup Metadata Table
    CREATE TABLE IF NOT EXISTS backup_metadata (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      checksum TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  // Run initial migrations & default settings
  const migrationCount = db.prepare('SELECT COUNT(*) as count FROM schema_migrations').get() as { count: number };
  if (migrationCount.count === 0) {
    db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
      1,
      '001_initial_schema',
      new Date().toISOString()
    );

    // Seed default settings
    const defaultSettings = [
      { key: 'store_name', value: 'Berkah Laundry Express' },
      { key: 'store_address', value: 'Jl. Merdeka No. 45, Komplek Ruko Sentra Niaga' },
      { key: 'store_phone', value: '0812-3456-7890' },
      { key: 'thermal_printer_width', value: '58' }, // 58 or 80 mm
      { key: 'receipt_prefix', value: 'LP' },
      { key: 'receipt_footer', value: 'Terima kasih atas kepercayaan Anda!\nCucian bersih, wangi, rapi & higienis.' },
      { key: 'receipt_terms', value: '1. Pengambilan wajib membawa nota ini.\n2. Cucian tidak diambil >30 hari di luar tanggung jawab toko.\n3. Klaim luntur/rusak maksimal 24 jam setelah serah terima.' },
      { key: 'require_full_payment_on_pickup', value: 'true' },
      { key: 'currency_symbol', value: 'Rp' }
    ];

    const insertSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)');
    const now = new Date().toISOString();
    for (const s of defaultSettings) {
      insertSetting.run(s.key, s.value, now);
    }

    // Seed default services
    const defaultServices = [
      {
        id: 'srv_kilo_reguler',
        name: 'Cuci Kering Setrika (Reguler)',
        unit: 'kg',
        price_per_unit: 8000,
        min_units: 2000, // min 2kg (2000 grams)
        estimated_duration_hours: 48,
        description: 'Pencucian higienis, pengeringan mesin, dan setrika uap rapi bergaransi.'
      },
      {
        id: 'srv_kilo_express',
        name: 'Cuci Kering Setrika (Express 1 Hari)',
        unit: 'kg',
        price_per_unit: 13000,
        min_units: 2000,
        estimated_duration_hours: 24,
        description: 'Selesai dalam 24 jam. Prioritas mesin cuci dan setrika uap.'
      },
      {
        id: 'srv_kilo_kilat',
        name: 'Cuci Kering Setrika (Kilat 6 Jam)',
        unit: 'kg',
        price_per_unit: 20000,
        min_units: 2000,
        estimated_duration_hours: 6,
        description: 'Layanan super kilat untuk kebutuhan darurat 6 jam siap ambil.'
      },
      {
        id: 'srv_cuci_kering',
        name: 'Cuci Kering Lipat (Non Setrika)',
        unit: 'kg',
        price_per_unit: 6000,
        min_units: 2000,
        estimated_duration_hours: 36,
        description: 'Cocok untuk sprei, kaos santai, dan pakaian rumah.'
      },
      {
        id: 'srv_setrika_saja',
        name: 'Setrika Uap Wangi Saja',
        unit: 'kg',
        price_per_unit: 5000,
        min_units: 2000,
        estimated_duration_hours: 24,
        description: 'Pakaian sudah bersih dari rumah, tinggal kami setrika uap rapi & packing.'
      },
      {
        id: 'srv_bedcover_kilo',
        name: 'Bed Cover / Selimut Tebal (Kiloan)',
        unit: 'kg',
        price_per_unit: 12000,
        min_units: 3000, // min 3kg
        estimated_duration_hours: 48,
        description: 'Bed cover, quilt, selimut tebal dicuci tabung ekstra dan dijemur steril.'
      }
    ];

    const insertService = db.prepare(`
      INSERT OR REPLACE INTO services 
      (id, name, unit, price_per_unit, min_units, estimated_duration_hours, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const s of defaultServices) {
      insertService.run(s.id, s.name, s.unit, s.price_per_unit, s.min_units, s.estimated_duration_hours, s.description, now, now);
    }
  }

  // Ensure default staff accounts (Kasir & Operator) always exist and are active
  ensureDefaultStaffAccounts();
}

export function ensureDefaultStaffAccounts() {
  const defaultAccounts = [
    { id: 'usr_cashier_1', username: 'kasir1', pass: 'kasir123', fullName: 'Siti Rahma (Kasir Toko)', role: 'cashier' },
    { id: 'usr_cashier_alias', username: 'kasir', pass: 'kasir123', fullName: 'Siti Rahma (Kasir Toko)', role: 'cashier' },
    { id: 'usr_operator_1', username: 'operator1', pass: 'operator123', fullName: 'Ahmad Fauzi (Operator Cuci)', role: 'operator' },
    { id: 'usr_operator_alias', username: 'operator', pass: 'operator123', fullName: 'Ahmad Fauzi (Operator Cuci)', role: 'operator' },
  ];

  const now = new Date().toISOString();
  for (const acc of defaultAccounts) {
    const existing = db.prepare('SELECT id, is_active FROM users WHERE username = ?').get(acc.username) as any;
    if (!existing) {
      const hash = bcrypt.hashSync(acc.pass, 10);
      db.prepare(`
        INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `).run(acc.id, acc.username, hash, acc.fullName, acc.role, now, now);
    } else if (existing.is_active !== 1) {
      db.prepare('UPDATE users SET is_active = 1 WHERE username = ?').run(acc.username);
    }
  }
}

export { DB_PATH, DATA_DIR };
