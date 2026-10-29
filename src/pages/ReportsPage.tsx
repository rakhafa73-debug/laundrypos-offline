import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Printer,
  TrendingUp,
  DollarSign,
  CreditCard,
  Tag,
  Users
} from 'lucide-react';
import { apiFetch, formatRupiah, formatKg } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'custom'>('7days');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/v1/reports/detailed?startDate=${startDate}&endDate=${endDate}`);
      if (res.success) {
        setReport(res.report);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyusun laporan keuangan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const handleRangeChange = (range: 'today' | '7days' | '30days') => {
    setDateRange(range);
    const end = new Date().toISOString().slice(0, 10);
    setEndDate(end);

    const d = new Date();
    if (range === 'today') {
      setStartDate(end);
    } else if (range === '7days') {
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
    } else if (range === '30days') {
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!report) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'LAPORAN KEUANGAN & OPERASIONAL LAUNDRY\n';
    csvContent += `Toko: ${settings.store_name}\n`;
    csvContent += `Periode: ${startDate} s/d ${endDate}\n\n`;

    csvContent += 'RINGKASAN UTAMA\n';
    csvContent += `Total Pesanan,${report.summary?.total_orders || 0}\n`;
    csvContent += `Total Berat (kg),${((report.summary?.total_grams || 0) / 1000).toFixed(2)}\n`;
    csvContent += `Omzet Pesanan,${report.summary?.gross_revenue || 0}\n`;
    csvContent += `Total Diskon,${report.summary?.total_discounts || 0}\n`;
    csvContent += `Pembayaran Masuk,${report.summary?.total_paid || 0}\n`;
    csvContent += `Piutang Belum Lunas,${report.summary?.total_unpaid || 0}\n`;
    csvContent += `Biaya Operasional,${report.summary?.totalExpenses || 0}\n`;
    csvContent += `Estimasi Laba Bersih,${report.summary?.netProfit || 0}\n\n`;

    csvContent += 'LAYANAN TERLARIS\n';
    csvContent += 'Nama Layanan,Jumlah Pesanan,Total Berat (kg),Total Omzet (Rp)\n';
    report.topServices?.forEach((srv: any) => {
      csvContent += `"${srv.service_name}",${srv.order_count},${(srv.total_grams / 1000).toFixed(2)},${srv.total_revenue}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan-laundry-${startDate}-sd-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = report?.summary || {};

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Filter and Export Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Laporan Keuangan & Operasional</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis omzet, realisasi pembayaran, beban operasional, dan laba bersih toko.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick preset buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => handleRangeChange('today')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleRangeChange('7days')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => handleRangeChange('30days')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '30days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Hari
            </button>
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateRange('custom');
              }}
              className="bg-transparent font-medium text-slate-800 text-xs focus:outline-hidden"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateRange('custom');
              }}
              className="bg-transparent font-medium text-slate-800 text-xs focus:outline-hidden"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Total Omzet Pesanan</span>
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatRupiah(summary.gross_revenue || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.total_orders || 0} transaksi ({formatKg(summary.total_grams || 0)})
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Pembayaran Masuk</span>
            <div className="p-2 bg-sky-50 text-sky-800 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-900 font-mono">
            {formatRupiah(summary.total_paid || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sisa piutang: {formatRupiah(summary.total_unpaid || 0)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Biaya Operasional</span>
            <div className="p-2 bg-rose-50 text-rose-800 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-800 font-mono">
            {formatRupiah(summary.totalExpenses || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Deterjen, listrik, transport
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Estimasi Laba Bersih</span>
            <div className="p-2 bg-emerald-50 text-emerald-900 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${summary.netProfit >= 0 ? 'text-emerald-950' : 'text-rose-700'}`}>
            {formatRupiah(summary.netProfit || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Omzet dikurangi biaya operasional
          </div>
        </div>

      </div>

      {/* Grid: Top Services & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Services (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Layanan Paling Laris</h3>
              <p className="text-[11px] text-slate-500">Peringkat kontribusi omzet dan total kilogram</p>
            </div>
            <Tag className="w-4 h-4 text-emerald-700" />
          </div>

          {(!report?.topServices || report.topServices.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-400">Tidak ada data layanan pada periode ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold">
                    <th className="pb-2.5">Nama Layanan</th>
                    <th className="pb-2.5">Pesanan</th>
                    <th className="pb-2.5">Total Berat</th>
                    <th className="pb-2.5 text-right">Kontribusi Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.topServices.map((srv: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 font-bold text-slate-900">
                        {srv.service_name}
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {srv.order_count} transaksi
                      </td>
                      <td className="py-2.5 font-semibold text-slate-700">
                        {formatKg(srv.total_grams)}
                      </td>
                      <td className="py-2.5 font-black text-emerald-900 text-right font-mono">
                        {formatRupiah(srv.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Metode Pembayaran Masuk</h3>
          <p className="text-[11px] text-slate-500 mb-4">Sebaran uang tunai vs non-tunai</p>

          {(!report?.paymentsByMethod || report.paymentsByMethod.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-400">Belum ada pembayaran pada periode ini.</div>
          ) : (
            <div className="space-y-3">
              {report.paymentsByMethod.map((pm: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 uppercase">{pm.payment_method}</span>
                    <div className="text-[10px] text-slate-500">{pm.count} transaksi</div>
                  </div>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {formatRupiah(pm.total)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Cashier performance section */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Performa Staf Kasir</span>
            </h4>
            <div className="space-y-2">
              {report?.cashierStats?.map((cs: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[#fafaf8] rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-800">{cs.cashier_name}</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{formatRupiah(cs.total_generated)}</span>
                    <span className="text-[10px] text-slate-500 block">({cs.total_orders_handled} order)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
