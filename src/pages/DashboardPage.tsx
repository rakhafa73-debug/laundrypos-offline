import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Shirt,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  PlusCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Wallet,
  Activity
} from 'lucide-react';
import { apiFetch, formatRupiah, formatKg, formatDateTime } from '../utils/api';
import { useLAN } from '../context/LANContext';
import { useAuth } from '../context/AuthContext';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onOpenReceipt: (orderId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenReceipt }) => {
  const { user } = useAuth();
  const { status: lanStatus, subscribe } = useLAN();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/v1/reports/dashboard');
      if (res.success) {
        setMetrics(res.metrics);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Subscribe to live websocket events for auto-refresh
    const unsubCreated = subscribe('ORDER_CREATED', () => fetchMetrics());
    const unsubStatus = subscribe('ORDER_STATUS_CHANGED', () => fetchMetrics());
    const unsubPayment = subscribe('PAYMENT_RECORDED', () => fetchMetrics());

    return () => {
      unsubCreated();
      unsubStatus();
      unsubPayment();
    };
  }, [subscribe]);

  if (loading && !metrics) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-700" />
          <span>Memuat indikator operasional toko...</span>
        </div>
      </div>
    );
  }

  const today = metrics?.today || {};

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-[#064e3b] text-white p-5 rounded-3xl shadow-md">
        <div>
          <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
            Ringkasan Operasional Hari Ini
          </div>
          <h2 className="text-xl font-black mt-0.5">
            Selamat Datang, {user?.fullName}
          </h2>
          <p className="text-xs text-emerald-100/80 mt-1">
            Pantau arus kas, status antrean cucian, dan performa layanan secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role !== 'operator' && (
            <button
              onClick={() => onNavigate('pos')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-950 font-bold text-xs rounded-xl hover:bg-emerald-50 transition shadow-sm active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>Transaksi Baru (POS)</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('orders')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800/80 text-white font-semibold text-xs rounded-xl hover:bg-emerald-800 transition border border-emerald-600/30 active:scale-95"
          >
            <Shirt className="w-4 h-4 text-emerald-300" />
            <span>Antrean Cucian</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchMetrics} className="underline text-rose-900 font-bold">Coba Lagi</button>
        </div>
      )}

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Omzet Hari Ini */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold">Omzet Hari Ini</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">
              {formatRupiah(today.totalOrderValue || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {today.orderCount || 0} pesanan · {formatKg(today.totalWeightGrams || 0)}
            </div>
          </div>
        </div>

        {/* Card 2: Pembayaran Diterima */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold">Kas Diterima (Hari Ini)</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-sky-900">
              {formatRupiah(today.paymentsCollected || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              DP & Pelunasan masuk
            </div>
          </div>
        </div>

        {/* Card 3: Pesanan Aktif */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold">Pesanan Aktif</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-amber-900">
              {metrics?.activeOrdersCount || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Dalam proses pencucian
            </div>
          </div>
        </div>

        {/* Card 4: Siap Diambil */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold">Siap Diambil</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-emerald-900">
              {metrics?.readyCount || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Sudah dipacking rapi
            </div>
          </div>
        </div>

        {/* Card 5: Sisa Tagihan (Piutang) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold">Total Piutang Berjalan</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-rose-900">
              {formatRupiah(metrics?.totalReceivables || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Pelanggan belum lunas
            </div>
          </div>
        </div>

      </div>

      {/* Grid: Recent Orders & System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pesanan Terbaru</h3>
              <p className="text-[11px] text-slate-500">Daftar transaksi masuk hari ini</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {(!metrics?.recentOrders || metrics.recentOrders.length === 0) ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada pesanan yang tercatat hari ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold">
                    <th className="pb-2.5">No. Nota</th>
                    <th className="pb-2.5">Pelanggan</th>
                    <th className="pb-2.5">Layanan</th>
                    <th className="pb-2.5">Berat</th>
                    <th className="pb-2.5">Total</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentOrders.map((ord: any) => (
                    <tr
                      key={ord.id}
                      onClick={() => onOpenReceipt(ord.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-2.5 font-mono font-bold text-slate-800">
                        {ord.receipt_number}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-900">
                        {ord.customer_name}
                      </td>
                      <td className="py-2.5 text-slate-600 truncate max-w-[130px]">
                        {ord.service_name_snapshot}
                      </td>
                      <td className="py-2.5 text-slate-700">
                        {formatKg(ord.weight_grams)}
                      </td>
                      <td className="py-2.5 font-bold text-slate-900">
                        {formatRupiah(ord.total_amount)}
                      </td>
                      <td className="py-2.5">
                        <span className="font-semibold text-[11px] capitalize text-emerald-800">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Audit & Activity Feed */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Aktivitas Sistem</h3>
                <p className="text-[11px] text-slate-500">Audit log perubahan penting</p>
              </div>
              <Activity className="w-4 h-4 text-emerald-700" />
            </div>

            {(!metrics?.recentAudit || metrics.recentAudit.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada aktivitas tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recentAudit.map((log: any) => (
                  <div key={log.id} className="text-xs border-b border-slate-100 pb-2">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="font-bold text-slate-700">{log.username}</span>
                      <span>{formatDateTime(log.created_at)}</span>
                    </div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {log.action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Server LAN Toko:</span>
            <span className="font-bold text-emerald-800">SQLite WAL Active</span>
          </div>
        </div>

      </div>

    </div>
  );
};
