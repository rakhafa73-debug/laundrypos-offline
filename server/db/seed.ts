import { db } from './database.ts';
import bcrypt from 'bcryptjs';

/**
 * Seed demo data for testing and demonstrations.
 * This can be run explicitly via script or via Admin Settings UI trigger.
 */
export async function seedDemoData() {
  const now = new Date();
  const dateStr = now.toISOString();

  // 1. Create demo users if they don't exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const cashierPass = bcrypt.hashSync('kasir123', salt);
    const operatorPass = bcrypt.hashSync('operator123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);

    insertUser.run('usr_admin_1', 'admin', adminPass, 'Budi Santoso (Owner)', 'admin', dateStr, dateStr);
    insertUser.run('usr_cashier_1', 'kasir1', cashierPass, 'Siti Rahma (Kasir Pagi)', 'cashier', dateStr, dateStr);
    insertUser.run('usr_operator_1', 'operator1', operatorPass, 'Ahmad Fauzi (Operator Cuci)', 'operator', dateStr, dateStr);
  }

  // 2. Create demo customers if empty
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
  if (customerCount.count === 0) {
    const customers = [
      { id: 'cst_1', name: 'Ibu Ratna Dewi', phone: '081298765432', address: 'Jl. Melati Blok C No. 12', notes: 'Pewangi lavender disukai' },
      { id: 'cst_2', name: 'Pak Hendra Pratama', phone: '085612348899', address: 'Apartemen Green View Lt. 8', notes: 'Gantungan baju khusus untuk kemeja' },
      { id: 'cst_3', name: 'Mbak Cindy Claudia', phone: '087855443322', address: 'Perumahan Griya Indah D3', notes: 'Pisahkan pakaian putih' },
      { id: 'cst_4', name: 'Mas Dimas Anggara', phone: '082199887766', address: 'Kost Mahasiswa Dahlia No. 4', notes: 'Hubungi WA jika selesai' }
    ];

    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, name, phone, address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of customers) {
      insertCustomer.run(c.id, c.name, c.phone, c.address, c.notes, dateStr, dateStr);
    }
  }

  return { success: true, message: 'Demo seed data created successfully.' };
}
