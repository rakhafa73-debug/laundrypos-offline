import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Phone, MapPin, Receipt, ArrowRight, Edit, AlertCircle } from 'lucide-react';
import type { Customer } from '../types';
import { apiFetch, formatRupiah, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Selected customer history
  const [selectedCustDetail, setSelectedCustDetail] = useState<any | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/v1/customers?limit=100&search=${encodeURIComponent(search)}`);
      if (res.success) {
        setCustomers(res.customers || []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar pelanggan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormAddress(c.address || '');
    setFormNotes(c.notes || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) return;

    try {
      setSaving(true);
      if (editingCustomer) {
        await apiFetch(`/api/v1/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formName,
            phone: formPhone,
            address: formAddress,
            notes: formNotes
          })
        });
      } else {
        await apiFetch('/api/v1/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: formName,
            phone: formPhone,
            address: formAddress,
            notes: formNotes
          })
        });
      }

      setModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data pelanggan.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewOrders = async (c: Customer) => {
    try {
      const res = await apiFetch(`/api/v1/customers/${c.id}`);
      if (res.success) {
        setSelectedCustDetail(res.customer);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat pesanan pelanggan.');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      
      {/* Header and Search */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama, no. HP, atau alamat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700 focus:outline-hidden"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pelanggan Baru</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-900">Tutup</button>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat data pelanggan...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Tidak ada pelanggan ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fafaf8] border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">Kontak & Alamat</th>
                  <th className="py-3 px-4">Jumlah Pesanan</th>
                  <th className="py-3 px-4">Saldo Piutang</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.notes && <div className="text-[10px] text-slate-500 italic">{c.notes}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                      {c.address && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.address}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">{c.total_orders || 0} order</span>
                    </td>
                    <td className="py-3 px-4">
                      {c.total_debt && c.total_debt > 0 ? (
                        <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {formatRupiah(c.total_debt)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Lunas</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewOrders(c)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-semibold transition"
                        >
                          Riwayat
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Ubah Data"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Order History Drawer/Modal */}
      {selectedCustDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedCustDetail.name}
                </h3>
                <div className="text-xs text-slate-500">{selectedCustDetail.phone}</div>
              </div>
              <button
                onClick={() => setSelectedCustDetail(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 p-1"
              >
                Tutup
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs">
              <span className="text-slate-600 font-semibold">Total Piutang Belum Lunas:</span>
              <span className="font-mono font-black text-rose-700 text-sm">
                {formatRupiah(selectedCustDetail.total_debt)}
              </span>
            </div>

            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Daftar Transaksi Laundry
            </h4>

            {(!selectedCustDetail.orders || selectedCustDetail.orders.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400">Belum ada riwayat pesanan.</div>
            ) : (
              <div className="space-y-2">
                {selectedCustDetail.orders.map((ord: any) => (
                  <div key={ord.id} className="p-3 bg-[#fafaf8] rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{ord.receipt_number}</div>
                      <div className="text-[10px] text-slate-500">{formatDateTime(ord.created_at)} · {ord.service_name_snapshot}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatRupiah(ord.total_amount)}</div>
                      <div className="text-[10px] font-semibold text-emerald-800 capitalize">{ord.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              {editingCustomer ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor HP / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alamat
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Khusus (Preferensi)
                </label>
                <input
                  type="text"
                  placeholder="Misal: suka wangi lavender, pisahkan baju putih"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
