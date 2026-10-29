import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import type { BackupItem } from '../types';
import { apiFetch, formatDateTime } from '../utils/api';
import { ConfirmModal } from '../components/ConfirmModal';

export const BackupPage: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Restore confirmation target
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/v1/backups');
      if (res.success) {
        setBackups(res.backups || []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar cadangan database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccessMsg(null);

      const res = await apiFetch('/api/v1/backups/create', { method: 'POST' });
      if (res.success) {
        setSuccessMsg(`Cadangan database berhasil dibuat: ${res.backup.filename}`);
        fetchBackups();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuat cadangan database.');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedRestoreFile) return;

    try {
      setRestoring(true);
      setError(null);
      setSuccessMsg(null);

      const res = await apiFetch('/api/v1/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ filename: selectedRestoreFile })
      });

      if (res.success) {
        setSuccessMsg(`Pemulihan database sukses! Snapshot darurat disimpan sebagai: ${res.safetySnapshot}`);
        setSelectedRestoreFile(null);
        fetchBackups();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal merestore database.');
    } finally {
      setRestoring(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header and Manual Backup Trigger */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700" />
            <span>Cadangan & Pemulihan Database SQLite</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Snapshot atomik SQLite tanpa mematikan server. Dilengkapi verifikasi integritas checksum SHA-256 dan auto-snapshot sebelum restore.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
        >
          <HardDrive className="w-4 h-4" />
          <span>{creating ? 'Membuat Snapshot...' : 'Buat Backup Sekarang'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-900">Tutup</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="underline text-emerald-900">Tutup</button>
        </div>
      )}

      {/* External Storage Best Practice Alert */}
      <div className="p-4 bg-sky-50 rounded-3xl border border-sky-200 text-sky-950 text-xs space-y-1.5">
        <div className="font-bold flex items-center gap-1.5 text-sky-900">
          <ShieldCheck className="w-4 h-4 text-sky-700" />
          <span>Panduan Penyimpanan Salinan Eksternal</span>
        </div>
        <p className="text-[11px] leading-relaxed text-sky-800">
          Untuk perlindungan maksimal dari kerusakan hard disk fisik komputer server, unduh file cadangan (*.db) secara berkala dan simpan ke media eksternal (Flashdisk, hard disk eksternal, atau NAS penyimpanan toko lokal). Jangan hanya mengandalkan satu drive lokal.
        </p>
      </div>

      {/* Backups List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Daftar Arsip Cadangan Tersedia</h3>
          <span className="text-xs text-slate-500 font-medium">{backups.length} arsip ditemukan</span>
        </div>

        {loading && backups.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Memeriksa folder cadangan...</div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Belum ada file cadangan yang dibuat. Klik 'Buat Backup Sekarang' di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fafaf8] border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Nama File</th>
                  <th className="py-3 px-4">Waktu Pembuatan</th>
                  <th className="py-3 px-4">Ukuran</th>
                  <th className="py-3 px-4">Dibuat Oleh</th>
                  <th className="py-3 px-4">Checksum SHA-256</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {backups.map((bkp) => (
                  <tr key={bkp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {bkp.filename}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      {formatDateTime(bkp.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {formatFileSize(bkp.size_bytes)}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      {bkp.created_by}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-400 max-w-[120px] truncate" title={bkp.checksum}>
                      {bkp.checksum.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        {/* Download link */}
                        <a
                          href={`/api/v1/backups/download/${encodeURIComponent(bkp.filename)}`}
                          download
                          className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                          title="Simpan file ke Flashdisk atau komputer lokal"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </a>

                        {/* Restore button */}
                        <button
                          onClick={() => setSelectedRestoreFile(bkp.filename)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition border border-rose-200"
                        >
                          Pulihkan (Restore)
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

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={!!selectedRestoreFile}
        title="Konfirmasi Pemulihan Database"
        message={`PERINGATAN: Database aktif saat ini akan digantikan dengan cadangan "${selectedRestoreFile}". Sistem akan membuat salinan darurat pre-restore secara otomatis sebelum proses dilakukan.`}
        confirmText={restoring ? 'Memulihkan...' : 'Ya, Lanjutkan Restore'}
        confirmVariant="danger"
        onConfirm={handleConfirmRestore}
        onCancel={() => setSelectedRestoreFile(null)}
      />

    </div>
  );
};
