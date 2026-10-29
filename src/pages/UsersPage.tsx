import React, { useState, useEffect } from 'react';
import { UserCog, UserPlus, KeyRound, Shield, Check, X, AlertCircle } from 'lucide-react';
import type { User, UserRole } from '../types';
import { apiFetch, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/v1/users');
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName) return;

    try {
      setSubmitting(true);
      const res = await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          fullName,
          role
        })
      });

      if (res.success) {
        setShowAddModal(false);
        setUsername('');
        setPassword('');
        setFullName('');
        setRole('cashier');
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan staf.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u: any) => {
    if (u.id === currentUser?.id) {
      setError('Anda tidak dapat menonaktifkan akun sendiri.');
      return;
    }

    try {
      await apiFetch(`/api/v1/users/${u.id}/toggle-active`, { method: 'PATCH' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah status staf.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword) return;

    try {
      setSubmitting(true);
      const res = await apiFetch(`/api/v1/users/${resetTargetUser.id}/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword })
      });

      if (res.success) {
        setResetTargetUser(null);
        setNewPassword('');
        alert('Password staf berhasil direset.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mereset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabels: Record<string, { label: string; desc: string; badge: string }> = {
    admin: { label: 'Administrator', desc: 'Akses penuh seluruh konfigurasi, laporan & backup', badge: 'bg-emerald-100 text-emerald-800' },
    cashier: { label: 'Kasir Toko', desc: 'Pelanggan, transaksi POS, pembayaran & cetak nota', badge: 'bg-sky-100 text-sky-800' },
    operator: { label: 'Operator Cuci', desc: 'Antrean cucian & pembaruan status pengerjaan', badge: 'bg-amber-100 text-amber-800' },
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manajemen Pengguna & Hak Akses</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola akun staf kasir, operator mesin cuci, dan administrator toko.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Staf</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-900">Tutup</button>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const roleInfo = roleLabels[u.role] || { label: u.role, desc: '', badge: 'bg-slate-100 text-slate-700' };
          const isMe = u.id === currentUser?.id;

          return (
            <div
              key={u.id}
              className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                u.is_active === 1 ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${roleInfo.badge}`}>
                    {roleInfo.label}
                  </span>
                  <span className={`text-[10px] font-bold ${u.is_active === 1 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {u.is_active === 1 ? '● Aktif' : '○ Dinonaktifkan'}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{u.full_name}</span>
                  {isMe && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">(Anda)</span>}
                </div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">@{u.username}</div>

                <p className="text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-3">
                  {roleInfo.desc}
                </p>
                <div className="text-[10px] text-slate-400 mt-1">
                  Login terakhir: {formatDateTime(u.last_login_at)}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={() => setResetTargetUser(u)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset Sandi</span>
                </button>

                {!isMe && (
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={`text-xs font-bold ${
                      u.is_active === 1 ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    {u.is_active === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Tambah Akun Staf Baru</span>
            </h3>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap Staf *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Siti Rahma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="kasir2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Password Awal *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Peran / Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                >
                  <option value="cashier">Kasir (Transaksi & Pembayaran)</option>
                  <option value="operator">Operator Cuci (Update Alur Cucian)</option>
                  <option value="admin">Administrator (Pemilik Toko)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Buat Akun Staf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <span>Reset Password Staf</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Atur ulang password untuk akun <strong>{resetTargetUser.full_name}</strong> (@{resetTargetUser.username}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Password Baru *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Mereset...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
