import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, ShieldCheck, Activity, Terminal } from 'lucide-react';
import type { AuditLog } from '../types';
import { apiFetch, formatDateTime } from '../utils/api';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/v1/audit-logs?limit=100';
      if (actionFilter !== 'all') url += `&action=${actionFilter}`;

      const res = await apiFetch(url);
      if (res.success) {
        setLogs(res.logs || []);
        setTotal(res.total || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat audit log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-700" />
            <span>Audit Trail & Log Keamanan Sistem</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Jejak digital yang tidak dapat diubah (immutable log) dari seluruh tindakan pengguna, transaksi keuangan, dan perubahan sistem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Filter Tindakan:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
          >
            <option value="all">Semua Tindakan ({total})</option>
            <option value="LOGIN_SUCCESS">Login Berhasil</option>
            <option value="LOGIN_FAILED">Login Gagal</option>
            <option value="ORDER_CREATED">Pesanan Dibuat</option>
            <option value="STATUS_CHANGE">Perubahan Status Cucian</option>
            <option value="PAYMENT_RECORDED">Pembayaran Masuk</option>
            <option value="REFUND_PROCESSED">Pengembalian Dana (Refund)</option>
            <option value="CASH_SESSION_OPENED">Buka Sesi Kasir</option>
            <option value="CASH_SESSION_CLOSED">Tutup Sesi Kasir</option>
            <option value="EXPENSE_RECORDED">Pencatatan Biaya</option>
            <option value="BACKUP_CREATED">Backup Database</option>
            <option value="RESTORE_DATABASE">Restore Database</option>
            <option value="SETTINGS_UPDATED">Ubah Pengaturan Toko</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat log audit...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Tidak ada log tercatat untuk filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fafaf8] border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Waktu & IP</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Tindakan</th>
                  <th className="py-3 px-4">Entitas</th>
                  <th className="py-3 px-4">Detail Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-500">
                      <div className="text-[11px] font-semibold text-slate-700">{formatDateTime(log.created_at)}</div>
                      <div className="text-[10px] text-slate-400">IP: {log.ip_address || '127.0.0.1'}</div>
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">
                      {log.username}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-sans font-bold text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px]">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(-6)})` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-600 max-w-xs truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
