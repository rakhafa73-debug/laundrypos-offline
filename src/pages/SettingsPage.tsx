import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Printer,
  Database,
  Building,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  HardDrive
} from 'lucide-react';
import type { StoreSettings } from '../types';
import { apiFetch } from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { ConfirmModal } from '../components/ConfirmModal';

export const SettingsPage: React.FC = () => {
  const { settings, refreshSettings, paperWidth, setPaperWidth } = useSettings();

  const [formSettings, setFormSettings] = useState<StoreSettings>(settings);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Demo seed modal
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/settings');
      if (res.success) {
        setDiagnostics(res.diagnostics);
        setFormSettings(res.settings);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat diagnostik sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleChange = (key: keyof StoreSettings, val: string) => {
    setFormSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await apiFetch('/api/v1/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: formSettings })
      });

      if (res.success) {
        setSuccess('Pengaturan toko berhasil diperbarui.');
        await refreshSettings();
        if (formSettings.thermal_printer_width) {
          setPaperWidth(formSettings.thermal_printer_width === '80' ? '80' : '58');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      setError(null);
      const res = await apiFetch('/api/v1/settings/seed-demo', { method: 'POST' });
      if (res.success) {
        setShowSeedModal(false);
        setSuccess('Data demo berhasil dimuat ke database!');
        fetchDiagnostics();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data demo.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-700" />
            <span>Pengaturan Toko & Konfigurasi Printer</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identitas laundry pada nota cetak, format thermal printer, kebijakan toko, dan status database SQLite.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-900">Tutup</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="underline text-emerald-900">Tutup</button>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Store Profile & Printer */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Store Identity */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>Profil & Kontak Toko Laundry</span>
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nama Toko Laundry *
              </label>
              <input
                type="text"
                required
                value={formSettings.store_name || ''}
                onChange={(e) => handleChange('store_name', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Alamat Toko (Dicetak pada Nota) *
              </label>
              <input
                type="text"
                required
                value={formSettings.store_address || ''}
                onChange={(e) => handleChange('store_address', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nomor Telepon / WhatsApp Toko *
              </label>
              <input
                type="text"
                required
                value={formSettings.store_phone || ''}
                onChange={(e) => handleChange('store_phone', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
              />
            </div>
          </div>

          {/* Card 2: Thermal Printer & Receipt Options */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-700" />
              <span>Pengaturan Printer Thermal & Format Nota</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Lebar Kertas Thermal Utama
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('thermal_printer_width', '58');
                      setPaperWidth('58');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      formSettings.thermal_printer_width === '58'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    58 mm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('thermal_printer_width', '80');
                      setPaperWidth('80');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      formSettings.thermal_printer_width === '80'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    80 mm
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Awalan Nomor Nota (Prefix)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={formSettings.receipt_prefix || 'LP'}
                  onChange={(e) => handleChange('receipt_prefix', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Syarat & Ketentuan Pengambilan Pakaian
              </label>
              <textarea
                rows={3}
                value={formSettings.receipt_terms || ''}
                onChange={(e) => handleChange('receipt_terms', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Catatan Footer Nota
              </label>
              <textarea
                rows={2}
                value={formSettings.receipt_footer || ''}
                onChange={(e) => handleChange('receipt_footer', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="reqFull"
                checked={formSettings.require_full_payment_on_pickup !== 'false'}
                onChange={(e) => handleChange('require_full_payment_on_pickup', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 rounded-md text-emerald-800 focus:ring-emerald-700"
              />
              <label htmlFor="reqFull" className="text-xs font-bold text-slate-800 cursor-pointer">
                Wajibkan pelunasan penuh sebelum pakaian diserahkan kepada pelanggan
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan Toko'}</span>
          </button>

        </div>

        {/* Right Column: Database Diagnostics & Explicit Seed */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card: SQLite Database Diagnostics */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-700" />
              <span>Status & Integritas Database SQLite</span>
            </h3>

            {diagnostics && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">File Database:</span>
                  <span className="font-mono text-slate-800 font-medium truncate max-w-[190px]" title={diagnostics.dbPath}>
                    laundrypos.db
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ukuran File:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {(diagnostics.dbSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Versi Skema Migrasi:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    v{diagnostics.schemaVersion}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mode Jurnal:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    WAL (Write-Ahead Logging)
                  </span>
                </div>

                <div className="pt-2">
                  <span className="text-slate-500 font-semibold block mb-1.5">Jumlah Rekord Tersimpan:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Pesanan:</span>
                      <div className="font-bold font-mono text-slate-900">{diagnostics.counts?.orders || 0}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Pelanggan:</span>
                      <div className="font-bold font-mono text-slate-900">{diagnostics.counts?.customers || 0}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Pembayaran:</span>
                      <div className="font-bold font-mono text-slate-900">{diagnostics.counts?.payments || 0}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Audit Logs:</span>
                      <div className="font-bold font-mono text-slate-900">{diagnostics.counts?.auditLogs || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card: Explicit Demo Data Seed */}
          <div className="bg-emerald-50/60 rounded-3xl border border-emerald-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Data Demo Uji Coba</span>
            </h3>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              Memuat data pelanggan contoh, akun staf pengujian, dan tarif default untuk mempermudah evaluasi fitur sebelum digunakan toko secara nyata.
            </p>
            <button
              type="button"
              onClick={() => setShowSeedModal(true)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
            >
              Muat Data Demo Sekarang
            </button>
          </div>

        </div>

      </form>

      {/* Confirmation Modal for Demo Data Seed */}
      <ConfirmModal
        isOpen={showSeedModal}
        title="Muat Data Demo Toko?"
        message="Aksi ini akan menambahkan data pelanggan sampel dan akun uji coba jika belum ada. Apakah Anda ingin melanjutkan?"
        confirmText={seeding ? 'Memuat...' : 'Ya, Muat Data Demo'}
        confirmVariant="primary"
        onConfirm={handleSeedDemo}
        onCancel={() => setShowSeedModal(false)}
      />

    </div>
  );
};
