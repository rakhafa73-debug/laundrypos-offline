import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Check, X, Clock, Scale } from 'lucide-react';
import type { ServiceItem } from '../types';
import { apiFetch, formatRupiah, formatKg } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [name, setName] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState<number>(8000);
  const [minUnits, setMinUnits] = useState<number>(2000); // 2000 grams = 2kg
  const [durationHours, setDurationHours] = useState<number>(48);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/v1/services?all=true');
      if (res.success) {
        setServices(res.services || []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat layanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    setPricePerUnit(8000);
    setMinUnits(2000);
    setDurationHours(48);
    setDescription('');
    setModalOpen(true);
  };

  const handleOpenEdit = (s: ServiceItem) => {
    setEditingService(s);
    setName(s.name);
    setPricePerUnit(s.price_per_unit);
    setMinUnits(s.min_units);
    setDurationHours(s.estimated_duration_hours);
    setDescription(s.description || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || pricePerUnit <= 0) return;

    try {
      setSaving(true);
      if (editingService) {
        await apiFetch(`/api/v1/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            unit: 'kg',
            pricePerUnit,
            minUnits,
            estimatedDurationHours: durationHours,
            description
          })
        });
      } else {
        await apiFetch('/api/v1/services', {
          method: 'POST',
          body: JSON.stringify({
            name,
            unit: 'kg',
            pricePerUnit,
            minUnits,
            estimatedDurationHours: durationHours,
            description
          })
        });
      }

      setModalOpen(false);
      fetchServices();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan layanan.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s: ServiceItem) => {
    try {
      await apiFetch(`/api/v1/services/${s.id}/toggle`, { method: 'PATCH' });
      fetchServices();
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah status layanan.');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Katalog Layanan & Tarif Laundry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tarif per kilogram, minimal order gram, dan estimasi waktu selesai.
          </p>
        </div>

        {user?.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Layanan Baru</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-900">Tutup</button>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <div
            key={s.id}
            className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
              s.is_active === 1 ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-900">{s.name}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  s.is_active === 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {s.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="text-xl font-extrabold text-emerald-900 font-mono mb-3">
                {formatRupiah(s.price_per_unit)} <span className="text-xs font-bold text-slate-500">/ kg</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>Min. Order: <strong>{formatKg(s.min_units)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Estimasi Pengerjaan: <strong>{s.estimated_duration_hours} jam</strong></span>
                </div>
                {s.description && (
                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{s.description}</p>
                )}
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleToggle(s)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  {s.is_active === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Ubah Tarif</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              {editingService ? 'Ubah Layanan Laundry' : 'Tambah Layanan Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Layanan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Cuci Kering Setrika Reguler"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tarif per Kilogram (Rp) *
                </label>
                <input
                  type="number"
                  required
                  step="500"
                  min="1000"
                  value={pricePerUnit || ''}
                  onChange={(e) => setPricePerUnit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Minimal Gram
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    value={minUnits || ''}
                    onChange={(e) => setMinUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-700 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">({(minUnits / 1000).toFixed(1)} kg)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Durasi (Jam)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationHours || ''}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Deskripsi Layanan
                </label>
                <input
                  type="text"
                  placeholder="Keterangan proses pengerjaan"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  {saving ? 'Menyimpan...' : 'Simpan Layanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
